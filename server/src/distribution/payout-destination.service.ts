import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { INVESTOR_ROLES } from '../pools/pool-access';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreatePayoutDestinationDto } from './payout-destination.dto';

/** Roles that receive money: investors (profit), PDPs (funding) and asset owners (lease or sale proceeds). */
export const PAYOUT_ACCOUNT_ROLES: ReadonlySet<string> = new Set([...INVESTOR_ROLES, 'Project Sponsor', 'Project Manager', 'Asset Owner', 'Asset Manager']);

const PUBLIC_FIELDS = { id: true, ownerUserId: true, provider: true, destinationType: true, destinationHash: true, maskedReference: true, accountHolder: true, currency: true, isDefault: true, status: true, verifiedBy: true, verifiedAt: true, cooldownUntil: true, createdAt: true } as const;

/** Only the last four characters are ever shown again; the full reference stays encrypted. */
export function maskReference(reference: string): string {
  const compact = reference.replace(/[\s-]/g, '');
  return `•••• ${compact.slice(-4)}`;
}

@Injectable()
export class PayoutDestinationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(actor: AuthenticatedUser, input: CreatePayoutDestinationDto) {
    const reference = input.reference.trim();
    if (reference.replace(/[\s-]/g, '').length < 6) throw new BadRequestException('Enter the full account number (at least 6 digits).');
    const key = process.env.PAYOUT_DESTINATION_ENCRYPTION_KEY;
    if (!key) throw new ServiceUnavailableException('Payout destination encryption is not configured.');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(reference, 'utf8'), cipher.final()]);
    const encryptedReference = `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
    const destinationHash = createHash('sha256').update(reference).digest('hex');
    const destination = await this.prisma.$transaction(async (tx) => {
      const active = await tx.payoutDestination.count({ where: { ownerUserId: actor.userId, status: { not: 'REMOVED' } } });
      // The first account is the default; a later one becomes it only when asked.
      const isDefault = active === 0 || input.isDefault === true;
      if (isDefault) await tx.payoutDestination.updateMany({ where: { ownerUserId: actor.userId, isDefault: true }, data: { isDefault: false } });
      return tx.payoutDestination.create({ data: { ownerUserId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, provider: input.provider.trim(), destinationType: input.destinationType, encryptedReference, destinationHash, maskedReference: maskReference(reference), accountHolder: input.accountHolder?.trim() || null, currency: input.currency ?? null, isDefault, status: 'PENDING_VERIFICATION', cooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    });
    await this.audit.recordActor(actor, { action: 'payout.destination.create', resourceType: 'PayoutDestination', resourceId: destination.id, organisationId: destination.organisationId, countryNodeId: destination.countryNodeId, metadata: { provider: destination.provider, destinationType: destination.destinationType, destinationHash: destination.destinationHash } });
    return this.publicDestination(destination);
  }

  list(actor: AuthenticatedUser) {
    return this.prisma.payoutDestination.findMany({ where: { ...tenantScopeFilter(actor), ...(actor.role === 'Super Admin' || actor.role === 'Settlement Officer' ? {} : { ownerUserId: actor.userId }) }, orderBy: { createdAt: 'desc' }, select: PUBLIC_FIELDS });
  }

  /** The signed-in user's own accounts, default first. Removed ones are kept for past payouts but not shown. */
  listMine(actor: AuthenticatedUser) {
    this.assertMayHoldAccounts(actor);
    return this.prisma.payoutDestination.findMany({ where: { ownerUserId: actor.userId, status: { not: 'REMOVED' } }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], select: PUBLIC_FIELDS });
  }

  async createMine(actor: AuthenticatedUser, input: CreatePayoutDestinationDto) {
    this.assertMayHoldAccounts(actor);
    return this.create(actor, input);
  }

  async setDefault(actor: AuthenticatedUser, id: string) {
    this.assertMayHoldAccounts(actor);
    await this.findOwn(actor, id);
    await this.prisma.$transaction([
      this.prisma.payoutDestination.updateMany({ where: { ownerUserId: actor.userId, isDefault: true }, data: { isDefault: false } }),
      this.prisma.payoutDestination.update({ where: { id }, data: { isDefault: true } }),
    ]);
    await this.audit.recordActor(actor, { action: 'payout.destination.default', resourceType: 'PayoutDestination', resourceId: id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId });
    return this.listMine(actor);
  }

  /** Marks the account removed rather than deleting it, so payouts already made to it keep their record. */
  async remove(actor: AuthenticatedUser, id: string) {
    this.assertMayHoldAccounts(actor);
    const destination = await this.findOwn(actor, id);
    await this.prisma.payoutDestination.update({ where: { id }, data: { status: 'REMOVED', isDefault: false } });
    if (destination.isDefault) {
      const next = await this.prisma.payoutDestination.findFirst({ where: { ownerUserId: actor.userId, status: { not: 'REMOVED' } }, orderBy: { createdAt: 'desc' } });
      if (next) await this.prisma.payoutDestination.update({ where: { id: next.id }, data: { isDefault: true } });
    }
    await this.audit.recordActor(actor, { action: 'payout.destination.remove', resourceType: 'PayoutDestination', resourceId: id, organisationId: destination.organisationId, countryNodeId: destination.countryNodeId, metadata: { destinationHash: destination.destinationHash } });
    return this.listMine(actor);
  }

  async verify(actor: AuthenticatedUser, id: string) {
    if (!['Super Admin', 'Settlement Officer'].includes(actor.role)) throw new ForbiddenException('Only settlement operators can verify payout destinations.');
    const destination = await this.prisma.payoutDestination.findUnique({ where: { id } });
    if (!destination) throw new NotFoundException('Payout destination not found.');
    assertTenantScope(actor, destination, 'Payout destination');
    if (destination.status === 'REMOVED') throw new BadRequestException('The owner removed this payout account.');
    // Segregation of duties: an operator must not verify the bank account they will be paid into.
    if (destination.ownerUserId === actor.userId) throw new ForbiddenException('This is your own payout account, so another settlement operator must verify it.');
    const updated = await this.prisma.payoutDestination.update({ where: { id }, data: { status: 'VERIFIED', verifiedBy: actor.userId, verifiedAt: new Date(), cooldownUntil: new Date() } });
    await this.audit.recordActor(actor, { action: 'payout.destination.verify', resourceType: 'PayoutDestination', resourceId: id, organisationId: destination.organisationId, countryNodeId: destination.countryNodeId, metadata: { ownerUserId: destination.ownerUserId, destinationHash: destination.destinationHash } });
    return this.publicDestination(updated);
  }

  private assertMayHoldAccounts(actor: AuthenticatedUser) {
    if (!PAYOUT_ACCOUNT_ROLES.has(actor.role)) throw new ForbiddenException('Payout accounts are for investors, PDPs and asset owners.');
  }

  private async findOwn(actor: AuthenticatedUser, id: string) {
    const destination = await this.prisma.payoutDestination.findUnique({ where: { id } });
    if (!destination || destination.ownerUserId !== actor.userId || destination.status === 'REMOVED') throw new NotFoundException('Payout account not found.');
    return destination;
  }

  private publicDestination(destination: { id: string; ownerUserId: string; provider: string; destinationType: string; destinationHash: string; maskedReference: string | null; accountHolder: string | null; currency: string | null; isDefault: boolean; status: string; verifiedBy: string | null; verifiedAt: Date | null; cooldownUntil: Date | null; createdAt: Date }) {
    const { id, ownerUserId, provider, destinationType, destinationHash, maskedReference, accountHolder, currency, isDefault, status, verifiedBy, verifiedAt, cooldownUntil, createdAt } = destination;
    return { id, ownerUserId, provider, destinationType, destinationHash, maskedReference, accountHolder, currency, isDefault, status, verifiedBy, verifiedAt, cooldownUntil, createdAt };
  }
}
