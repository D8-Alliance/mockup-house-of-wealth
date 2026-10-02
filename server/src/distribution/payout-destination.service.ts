import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { CreatePayoutDestinationDto } from './payout-destination.dto';

@Injectable()
export class PayoutDestinationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(actor: AuthenticatedUser, input: CreatePayoutDestinationDto) {
    const reference = input.reference.trim();
    if (!reference) throw new BadRequestException('Payout destination reference is required.');
    const key = process.env.PAYOUT_DESTINATION_ENCRYPTION_KEY;
    if (!key) throw new ServiceUnavailableException('Payout destination encryption is not configured.');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
    const encrypted = Buffer.concat([cipher.update(reference, 'utf8'), cipher.final()]);
    const encryptedReference = `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
    const destination = await this.prisma.payoutDestination.create({ data: { ownerUserId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, provider: input.provider, destinationType: input.destinationType, encryptedReference, destinationHash: createHash('sha256').update(reference).digest('hex'), status: 'PENDING_VERIFICATION', cooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
    await this.audit.recordActor(actor, { action: 'payout.destination.create', resourceType: 'PayoutDestination', resourceId: destination.id, organisationId: destination.organisationId, countryNodeId: destination.countryNodeId, metadata: { provider: destination.provider, destinationType: destination.destinationType, destinationHash: destination.destinationHash } });
    return this.publicDestination(destination);
  }

  list(actor: AuthenticatedUser) {
    return this.prisma.payoutDestination.findMany({ where: { ...tenantScopeFilter(actor), ...(actor.role === 'Super Admin' || actor.role === 'Settlement Officer' ? {} : { ownerUserId: actor.userId }) }, orderBy: { createdAt: 'desc' }, select: { id: true, ownerUserId: true, provider: true, destinationType: true, destinationHash: true, status: true, verifiedBy: true, verifiedAt: true, cooldownUntil: true, createdAt: true } });
  }

  async verify(actor: AuthenticatedUser, id: string) {
    if (!['Super Admin', 'Settlement Officer'].includes(actor.role)) throw new ForbiddenException('Only settlement operators can verify payout destinations.');
    const destination = await this.prisma.payoutDestination.findUnique({ where: { id } });
    if (!destination) throw new NotFoundException('Payout destination not found.');
    assertTenantScope(actor, destination, 'Payout destination');
    const updated = await this.prisma.payoutDestination.update({ where: { id }, data: { status: 'VERIFIED', verifiedBy: actor.userId, verifiedAt: new Date(), cooldownUntil: new Date() } });
    await this.audit.recordActor(actor, { action: 'payout.destination.verify', resourceType: 'PayoutDestination', resourceId: id, organisationId: destination.organisationId, countryNodeId: destination.countryNodeId, metadata: { ownerUserId: destination.ownerUserId, destinationHash: destination.destinationHash } });
    return this.publicDestination(updated);
  }

  private publicDestination(destination: { id: string; ownerUserId: string; provider: string; destinationType: string; destinationHash: string; status: string; verifiedBy: string | null; verifiedAt: Date | null; cooldownUntil: Date | null; createdAt: Date }) {
    return { id: destination.id, ownerUserId: destination.ownerUserId, provider: destination.provider, destinationType: destination.destinationType, destinationHash: destination.destinationHash, status: destination.status, verifiedBy: destination.verifiedBy, verifiedAt: destination.verifiedAt, cooldownUntil: destination.cooldownUntil, createdAt: destination.createdAt };
  }
}
