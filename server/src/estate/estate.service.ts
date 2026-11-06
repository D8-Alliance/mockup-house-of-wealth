import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { EstateBeneficiary, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { NotificationDeliveryService } from '../notifications/notification-delivery.service';
import { inLanguage, notificationLanguage } from '../notifications/notification-language';
import { NotificationService } from '../notifications/notification.service';
import { HibahAnswerDto, SaveBeneficiaryDto, SaveExecutorDto } from './estate.dto';
import { estateRuleError, EstateItem, hasOwnerSetShare, heirConsentReason, maskIdentity } from './estate-rules';

/** What the owner sees: everything but the encrypted identity number. */
export type BeneficiaryView = Omit<EstateBeneficiary, 'identityNumberEncrypted' | 'allocationPercent' | 'hibahQabulTokenHash' | 'hibahQabulEvidence'> & { allocationPercent: number | null };

/** How long a qabul link stays valid, and how many wrong answers lock it. */
const QABUL_LINK_DAYS = 30;
const QABUL_MAX_ATTEMPTS = 5;
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const toItem = (row: Pick<EstateBeneficiary, 'relation' | 'distributionType' | 'allocationPercent'>): EstateItem => ({ relation: row.relation, distributionType: row.distributionType, allocationPercent: row.allocationPercent === null ? null : Number(row.allocationPercent) });

/**
 * An individual's beneficiaries and estate instructions. Only the owner reads or changes them; every
 * change is audited without the identity number, which is stored encrypted (PDPA) and shown masked.
 */
@Injectable()
export class EstateService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService, @Optional() private readonly delivery?: NotificationDeliveryService) {}

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

  // ---- Executors (wasi) and administrators ----

  async listExecutors(actor: AuthenticatedUser) {
    const rows = await this.prisma.estateExecutor.findMany({ where: { ownerUserId: actor.userId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] });
    return rows.map(({ identityNumberEncrypted: _hidden, ...row }) => row);
  }

  async saveExecutor(actor: AuthenticatedUser, input: SaveExecutorDto, id?: string) {
    const existing = id ? await this.prisma.estateExecutor.findFirst({ where: { id, ownerUserId: actor.userId } }) : null;
    if (id && !existing) throw new NotFoundException('Executor not found.');
    const identityNumber = input.identityNumber?.trim() || null;
    const data = {
      name: input.name.trim(), kind: input.kind, relation: input.relation?.trim() || null,
      email: input.email?.trim() || null, phone: input.phone?.trim() || null, isPrimary: input.isPrimary === true,
      ...(identityNumber ? { identityNumberEncrypted: encrypt(identityNumber), identityNumberMasked: maskIdentity(identityNumber) } : {}),
    };
    const saved = await this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) await tx.estateExecutor.updateMany({ where: { ownerUserId: actor.userId, isPrimary: true, ...(id ? { id: { not: id } } : {}) }, data: { isPrimary: false } });
      const row = id ? await tx.estateExecutor.update({ where: { id }, data }) : await tx.estateExecutor.create({ data: { ...data, ownerUserId: actor.userId } });
      await this.audit.recordActor(actor, { action: id ? 'estate.executor.update' : 'estate.executor.create', resourceType: 'EstateExecutor', resourceId: row.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { kind: row.kind, isPrimary: row.isPrimary } }, tx);
      return row;
    });
    const { identityNumberEncrypted: _hidden, ...row } = saved;
    return row;
  }

  async removeExecutor(actor: AuthenticatedUser, id: string) {
    const existing = await this.prisma.estateExecutor.findFirst({ where: { id, ownerUserId: actor.userId } });
    if (!existing) throw new NotFoundException('Executor not found.');
    await this.prisma.estateExecutor.delete({ where: { id } });
    await this.audit.recordActor(actor, { action: 'estate.executor.delete', resourceType: 'EstateExecutor', resourceId: id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { kind: existing.kind } });
    return { id };
  }

  // ---- Hibah qabul ----

  /**
   * The donor sends the hibah recipient a one-time link to accept or decline the hibah (qabul). Only its
   * SHA-256 is kept; a new link replaces the old one. It is emailed when email is set up on this server; the
   * donor can also share it (WhatsApp, SMS) from the app, which is shown the link once.
   */
  async requestQabul(actor: AuthenticatedUser, id: string): Promise<{ token: string; expiresAt: string; emailed: boolean }> {
    const row = await this.own(actor, id);
    if (row.distributionType !== 'Hibah Amanah' || !row.hibahIjabAt) throw new BadRequestException('Only a hibah offered to this beneficiary can be accepted.');
    if (row.hibahQabulStatus !== 'AWAITING') throw new ConflictException(`The recipient has already ${row.hibahQabulStatus === 'ACCEPTED' ? 'accepted' : 'declined'} this hibah.`);
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + QABUL_LINK_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.estateBeneficiary.update({ where: { id }, data: { hibahQabulTokenHash: tokenHash(token), hibahQabulSentAt: new Date(), hibahQabulExpiresAt: expiresAt, hibahQabulAttempts: 0 } });
    const origin = (process.env.CORS_ORIGINS ?? '').split(',').map((item) => item.trim().replace(/\/$/, '')).find(Boolean);
    let emailed = false;
    if (origin && row.email && this.delivery) {
      // The recipient usually has no account yet, so the country decides the language.
      const language = notificationLanguage(null, row.countryNodeId);
      const results = await this.delivery.deliverEach({ channels: 'EMAIL', recipientEmail: row.email, title: inLanguage(`${actor.name} offers you a hibah`, language), message: inLanguage(`${actor.name} has made you a hibah (gift) of part of their investments on Wealth Pooling, to pass to you as set out in their estate instructions. To accept or decline it (qabul), open ${origin}/m/hibah/${token} before ${expiresAt.toISOString().slice(0, 10)}. You will need the last four characters of your ID number. If you did not expect this, ignore it.`, language) }).catch(() => []);
      emailed = results.some((result) => result.outcome === 'SENT');
    }
    await this.audit.recordActor(actor, { action: 'estate.hibah.qabul_requested', resourceType: 'EstateBeneficiary', resourceId: id, organisationId: row.organisationId, countryNodeId: row.countryNodeId, metadata: { expiresAt: expiresAt.toISOString(), emailed } });
    return { token, expiresAt: expiresAt.toISOString(), emailed };
  }

  /** What the recipient sees on the link: who offers the hibah and what it is, nothing about their own identity. */
  async hibahOffer(token: string) {
    const row = await this.byToken(token);
    const donor = await this.prisma.user.findUnique({ where: { id: row.ownerUserId }, select: { name: true } });
    return {
      donorName: donor?.name ?? 'The donor', recipientName: row.name, relation: row.relation,
      allocationPercent: row.allocationPercent === null ? null : Number(row.allocationPercent),
      ijabAt: row.hibahIjabAt?.toISOString() ?? null, status: row.hibahQabulStatus, expiresAt: row.hibahQabulExpiresAt?.toISOString() ?? null,
    };
  }

  /**
   * The recipient's answer. The last four characters of their ID and their name (or, for a minor, the
   * guardian's name) must match what the donor recorded; five wrong tries lock the link. The answer is final,
   * kept with when and from where it was given, and the donor is told.
   */
  async answerHibah(token: string, input: HibahAnswerDto, evidence: { ip?: string; userAgent?: string }) {
    const row = await this.byToken(token);
    if (row.hibahQabulStatus !== 'AWAITING') throw new ConflictException('This hibah has already been answered.');
    if (row.hibahQabulAttempts >= QABUL_MAX_ATTEMPTS) throw new ForbiddenException('Too many tries. Ask the donor to send a new link.');
    const last4 = (row.identityNumberMasked ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase();
    const nameOk = input.asGuardian ? input.fullName.trim().length >= 3 : sameName(input.fullName, row.name);
    if (!last4 || last4 !== input.identityLast4.toLowerCase() || !nameOk) {
      await this.prisma.estateBeneficiary.update({ where: { id: row.id }, data: { hibahQabulAttempts: { increment: 1 } } });
      const left = QABUL_MAX_ATTEMPTS - row.hibahQabulAttempts - 1;
      throw new BadRequestException(left > 0 ? `The details do not match what the donor recorded. ${left} tr${left === 1 ? 'y' : 'ies'} left.` : 'Too many tries. Ask the donor to send a new link.');
    }
    const status = input.decision === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    const now = new Date();
    const record = { at: now.toISOString(), ip: evidence.ip ?? null, userAgent: evidence.userAgent?.slice(0, 300) ?? null, note: input.note?.trim() || null };
    const claimed = await this.prisma.estateBeneficiary.updateMany({ where: { id: row.id, hibahQabulStatus: 'AWAITING', hibahQabulTokenHash: row.hibahQabulTokenHash }, data: { hibahQabulStatus: status, hibahQabulAt: now, hibahQabulBy: input.fullName.trim(), hibahQabulAsGuardian: input.asGuardian === true, hibahQabulEvidence: record as Prisma.InputJsonValue, hibahQabulTokenHash: null } });
    if (!claimed.count) throw new ConflictException('This hibah has already been answered.');
    await this.audit.record({ userId: 'HIBAH-RECIPIENT', action: `estate.hibah.${status === 'ACCEPTED' ? 'qabul_accepted' : 'qabul_declined'}`, resourceType: 'EstateBeneficiary', resourceId: row.id, organisationId: row.organisationId, countryNodeId: row.countryNodeId, metadata: { answeredBy: input.fullName.trim(), asGuardian: input.asGuardian === true, ...record } });
    await this.notifications?.notifyUsers([row.ownerUserId], {
      type: 'ESTATE', title: status === 'ACCEPTED' ? 'Hibah accepted' : 'Hibah declined',
      message: `${row.name} ${status === 'ACCEPTED' ? 'accepted' : 'declined'} your hibah (qabul)${input.asGuardian ? `, answered by their guardian ${input.fullName.trim()}` : ''}.`,
      resourceType: 'EstateBeneficiary', resourceId: row.id, dedupeKey: `hibah-qabul:${row.id}:${status}`,
    }).catch(() => undefined);
    return { status, answeredAt: now.toISOString() };
  }

  private async byToken(token: string) {
    const row = token.length >= 20 ? await this.prisma.estateBeneficiary.findUnique({ where: { hibahQabulTokenHash: tokenHash(token) } }) : null;
    if (!row || !row.hibahQabulExpiresAt || row.hibahQabulExpiresAt < new Date()) throw new NotFoundException('This link is not valid or has expired. Ask the donor to send a new one.');
    return row;
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
    const item = { relation: input.relation, distributionType: input.distributionType, allocationPercent };
    const ruleError = estateRuleError(item, others, input.heirConsentAcknowledged === true);
    if (ruleError) throw new BadRequestException(ruleError);
    // Kept only if the heirs agree after the death; the estate officer records their answers.
    const heirConsentRequired = Boolean(heirConsentReason(item, others));
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
      heirConsentRequired,
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
  const { identityNumberEncrypted: _hidden, hibahQabulTokenHash: _token, hibahQabulEvidence: _evidence, allocationPercent, ...rest } = row;
  return { ...rest, allocationPercent: allocationPercent === null ? null : Number(allocationPercent) };
}

/** AES-256-GCM with its own key, as iv.tag.ciphertext; the same scheme as payout account numbers. */
export function encrypt(value: string): string {
  const key = process.env.ESTATE_DATA_ENCRYPTION_KEY;
  if (!key) throw new ServiceUnavailableException('Estate data encryption is not configured (ESTATE_DATA_ENCRYPTION_KEY).');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(key).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
