import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { EstateBeneficiary, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { SaveBeneficiaryDto } from './estate.dto';
import { estateRuleError, EstateItem, hasOwnerSetShare, maskIdentity } from './estate-rules';

/** What the owner sees: everything but the encrypted identity number. */
export type BeneficiaryView = Omit<EstateBeneficiary, 'identityNumberEncrypted' | 'allocationPercent'> & { allocationPercent: number | null };

const toItem = (row: Pick<EstateBeneficiary, 'relation' | 'distributionType' | 'allocationPercent'>): EstateItem => ({ relation: row.relation, distributionType: row.distributionType, allocationPercent: row.allocationPercent === null ? null : Number(row.allocationPercent) });

/**
 * An individual's beneficiaries and estate instructions. Only the owner reads or changes them; every
 * change is audited without the identity number, which is stored encrypted (PDPA) and shown masked.
 */
@Injectable()
export class EstateService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async list(actor: AuthenticatedUser): Promise<BeneficiaryView[]> {
    const rows = await this.prisma.estateBeneficiary.findMany({ where: { ownerUserId: actor.userId }, orderBy: { createdAt: 'asc' } });
    return rows.map(view);
  }

  async create(actor: AuthenticatedUser, input: SaveBeneficiaryDto): Promise<BeneficiaryView> {
    const others = await this.prisma.estateBeneficiary.findMany({ where: { ownerUserId: actor.userId } });
    const data = this.prepare(input, others.map(toItem), null);
    const created = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) await tx.estateBeneficiary.updateMany({ where: { ownerUserId: actor.userId, isPrimary: true }, data: { isPrimary: false } });
      const row = await tx.estateBeneficiary.create({ data: { ...data, ownerUserId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId } });
      await this.record(actor, 'estate.beneficiary.create', row, tx);
      return row;
    });
    return view(created);
  }

  async update(actor: AuthenticatedUser, id: string, input: SaveBeneficiaryDto): Promise<BeneficiaryView> {
    const existing = await this.own(actor, id);
    const others = await this.prisma.estateBeneficiary.findMany({ where: { ownerUserId: actor.userId, id: { not: id } } });
    const data = this.prepare(input, others.map(toItem), existing);
    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) await tx.estateBeneficiary.updateMany({ where: { ownerUserId: actor.userId, isPrimary: true, id: { not: id } }, data: { isPrimary: false } });
      const row = await tx.estateBeneficiary.update({ where: { id }, data });
      await this.record(actor, 'estate.beneficiary.update', row, tx);
      return row;
    });
    return view(updated);
  }

  async setPrimary(actor: AuthenticatedUser, id: string): Promise<BeneficiaryView[]> {
    const existing = await this.own(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.estateBeneficiary.updateMany({ where: { ownerUserId: actor.userId, isPrimary: true }, data: { isPrimary: false } });
      await tx.estateBeneficiary.update({ where: { id }, data: { isPrimary: true } });
      await this.record(actor, 'estate.beneficiary.primary', existing, tx);
    });
    return this.list(actor);
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<{ id: string }> {
    const existing = await this.own(actor, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.estateBeneficiary.delete({ where: { id } });
      await this.record(actor, 'estate.beneficiary.delete', existing, tx);
    });
    return { id };
  }

  // ---- helpers ----

  /** Only the owner's own beneficiaries exist for them; anyone else's is "not found". */
  private async own(actor: AuthenticatedUser, id: string) {
    const row = await this.prisma.estateBeneficiary.findFirst({ where: { id, ownerUserId: actor.userId } });
    if (!row) throw new NotFoundException('Beneficiary not found.');
    return row;
  }

  /** Checks the estate rules and the hibah akad, and turns the input into stored fields. */
  private prepare(input: SaveBeneficiaryDto, others: EstateItem[], existing: EstateBeneficiary | null) {
    const allocationPercent = hasOwnerSetShare(input.distributionType) ? input.allocationPercent ?? null : null;
    const ruleError = estateRuleError({ relation: input.relation, distributionType: input.distributionType, allocationPercent }, others);
    if (ruleError) throw new BadRequestException(ruleError);
    const identityNumber = input.identityNumber?.trim() || null;
    const keepsIdentity = !identityNumber && Boolean(existing?.identityNumberEncrypted);
    const isHibah = input.distributionType === 'Hibah Amanah';
    // A hibah is an akad: the recipient must be identified and reachable to accept (qabul), and the donor makes the offer (ijab) knowingly.
    if (isHibah) {
      if (!input.email?.trim()) throw new BadRequestException('Hibah Amanah needs the recipient’s email address, so they can accept the hibah (qabul).');
      if (!identityNumber && !keepsIdentity) throw new BadRequestException('Hibah Amanah needs the recipient’s national ID or passport number.');
      if (!existing?.hibahIjabAt && input.ijabConfirmed !== true) throw new BadRequestException('Please confirm the hibah offer (ijab) to continue.');
    }
    return {
      name: input.name.trim(),
      relation: input.relation,
      distributionType: input.distributionType,
      allocationPercent: allocationPercent === null ? null : new Prisma.Decimal(allocationPercent),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      ...(identityNumber ? { identityNumberEncrypted: encrypt(identityNumber), identityNumberMasked: maskIdentity(identityNumber) } : {}),
      payoutMethod: input.payoutMethod.trim(),
      isPrimary: input.isPrimary === true,
      // The offer keeps its first date; a beneficiary no longer under hibah has no akad.
      hibahIjabAt: isHibah ? existing?.hibahIjabAt ?? new Date() : null,
      hibahQabulStatus: isHibah ? existing?.hibahQabulStatus ?? 'AWAITING' : null,
      hibahQabulAt: isHibah ? existing?.hibahQabulAt ?? null : null,
    };
  }

  private record(actor: AuthenticatedUser, action: string, row: EstateBeneficiary, tx: Prisma.TransactionClient) {
    return this.audit.recordActor(actor, { action, resourceType: 'EstateBeneficiary', resourceId: row.id, organisationId: row.organisationId, countryNodeId: row.countryNodeId, metadata: { relation: row.relation, distributionType: row.distributionType, allocationPercent: row.allocationPercent === null ? null : Number(row.allocationPercent), isPrimary: row.isPrimary } }, tx);
  }
}

function view(row: EstateBeneficiary): BeneficiaryView {
  const { identityNumberEncrypted: _hidden, allocationPercent, ...rest } = row;
  return { ...rest, allocationPercent: allocationPercent === null ? null : Number(allocationPercent) };
}

/** AES-256-GCM with its own key, as iv.tag.ciphertext; the same scheme as payout account numbers. */
function encrypt(value: string): string {
  const key = process.env.ESTATE_DATA_ENCRYPTION_KEY;
  if (!key) throw new ServiceUnavailableException('Estate data encryption is not configured (ESTATE_DATA_ENCRYPTION_KEY).');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
