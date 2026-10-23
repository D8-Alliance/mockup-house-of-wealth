import { BadRequestException, ConflictException, Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/identity.service';
import { NotificationDeliveryService } from '../../notifications/notification-delivery.service';
import { NotificationService } from '../../notifications/notification.service';
import { PrismaService } from '../../prisma.service';
import { formatLocalDateTime } from '../../tenancy/country-time';
import { entryHash } from '../../asset-partnerships/engagement-record';
import { certificateFingerprint, createSelfSignedSeal, SealCredentials, sealFromEnvironment, sealPdf, sha256Hex, verifySealedPdf } from './pdf-seal';
import { renderSignedAgreementPdf } from './signed-agreement-pdf';
import { AgreementFront } from '../agreement-document';
import { datedLine } from '../agreement-pdf-layout';
import { readStoredToken, requestTimestamp } from './timestamp';

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const codeHash = (challengeId: string, code: string) => createHash('sha256').update(`${challengeId}:${code}`).digest('hex');
/** "anuar@gmail.com" → "a***@gmail.com". */
export const maskEmail = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, '$1***$2');

interface Section { number: string; title: string; paragraphs: string[] }

/**
 * The platform's own electronic signature (phase 1): a one-time code to the signer before each signature,
 * then, once both sides signed, the final PDF with a Certificate of Completion, sealed by the platform
 * (PAdES) and time-stamped by an independent authority (RFC 3161), and checked again regularly.
 */
@Injectable()
export class AgreementSigningService {
  private readonly logger = new Logger(AgreementSigningService.name);
  private seal?: SealCredentials;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly delivery?: NotificationDeliveryService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  /** EMAIL when an email provider is set up; TEST (the code shown on screen) only outside production. */
  codeChannel(): 'EMAIL' | 'TEST' {
    const wanted = (process.env.SIGNING_OTP_CHANNEL ?? '').toLowerCase();
    const emailReady = process.env.NOTIFICATION_EMAIL_PROVIDER === 'resend' && Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.NOTIFICATION_EMAIL_FROM);
    if (wanted !== 'test' && emailReady) return 'EMAIL';
    if (process.env.NODE_ENV === 'production' && wanted !== 'test') throw new ServiceUnavailableException('Signing codes cannot be sent: no email provider is set up.');
    return 'TEST';
  }

  /** Sends a one-time code for signing this version; at most one a minute and five an hour. */
  async issueCode(actor: AuthenticatedUser, contract: { id: string; contractNumber: string; version: number }) {
    const recent = await this.prisma.signatureChallenge.findMany({ where: { contractId: contract.id, userId: actor.userId, createdAt: { gte: new Date(Date.now() - 3600_000) } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    if (recent[0] && Date.now() - recent[0].createdAt.getTime() < 60_000) throw new ConflictException('A code was sent less than a minute ago. Check your inbox, or wait a minute.');
    if (recent.length >= 5) throw new ConflictException('Too many codes this hour. Try again later.');
    const channel = this.codeChannel();
    const id = randomUUID();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
    const destination = channel === 'EMAIL' ? maskEmail(actor.email) : 'shown on screen (test mode)';
    await this.prisma.signatureChallenge.create({ data: { id, contractId: contract.id, userId: actor.userId, version: contract.version, codeHash: codeHash(id, code), channel, destination, expiresAt } });
    if (channel === 'EMAIL') {
      if (!this.delivery) throw new ServiceUnavailableException('Email delivery is not available.');
      await this.delivery.deliver({ channels: 'EMAIL', recipientEmail: actor.email, title: `Your code to sign ${contract.contractNumber}`, message: `Your code to sign ${contract.contractNumber} (version ${contract.version}) is ${code}. It expires in ${CODE_MINUTES} minutes. If you did not ask for it, do not share it and tell the platform.` });
    }
    await this.audit.recordActor(actor, { action: 'agreement.sign_code_sent', resourceType: 'Contract', resourceId: contract.id, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { channel, destination, version: contract.version, challengeId: id } });
    return { challengeId: id, channel, destination, expiresAt: expiresAt.toISOString(), ...(channel === 'TEST' ? { testCode: code } : {}) };
  }

  /** Checks a code for this signer and version, once; five wrong tries end the code. */
  async verifyCode(actor: AuthenticatedUser, contractId: string, version: number, challengeId: string | undefined, code: string | undefined) {
    if (!challengeId || !code) throw new BadRequestException('Ask for a code and enter it to sign.');
    const challenge = await this.prisma.signatureChallenge.findFirst({ where: { id: challengeId, contractId, userId: actor.userId } });
    if (!challenge) throw new BadRequestException('That code is not for you or this agreement. Ask for a new one.');
    if (challenge.usedAt) throw new BadRequestException('That code was already used. Ask for a new one.');
    if (challenge.expiresAt < new Date()) throw new BadRequestException('The code has expired. Ask for a new one.');
    if (challenge.version !== version) throw new BadRequestException('The agreement changed since the code was sent. Ask for a new one.');
    if (challenge.attempts >= MAX_ATTEMPTS) throw new BadRequestException('Too many wrong codes. Ask for a new one.');
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const given = Buffer.from(codeHash(challenge.id, code.trim()), 'hex');
    if (!timingSafeEqual(expected, given)) {
      const left = MAX_ATTEMPTS - challenge.attempts - 1;
      await this.prisma.signatureChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new BadRequestException(`Wrong code. ${left} tries left.`);
    }
    const used = await this.prisma.signatureChallenge.updateMany({ where: { id: challenge.id, usedAt: null }, data: { usedAt: new Date() } });
    if (!used.count) throw new ConflictException('That code was already used. Ask for a new one.');
    return { channel: challenge.channel, destination: challenge.destination };
  }

  /** The platform's sealing certificate: configured, or (outside production, or when allowed) self-signed and kept. */
  sealCredentials(): SealCredentials {
    if (this.seal) return this.seal;
    const configured = process.env.SIGNING_P12_PATH && !existsSync(process.env.SIGNING_P12_PATH) ? null : sealFromEnvironment();
    if (configured) return (this.seal = configured);
    if (process.env.NODE_ENV === 'production' && process.env.SIGNING_ALLOW_SELF_SIGNED !== 'true') throw new ServiceUnavailableException('No sealing certificate is set up (SIGNING_P12_PATH or SIGNING_P12_BASE64).');
    const created = createSelfSignedSeal('Wealth Pooling platform seal (self-signed)', process.env.SIGNING_P12_PASSPHRASE ?? '');
    // Kept so every document is sealed by the same certificate across restarts.
    if (process.env.SIGNING_P12_PATH) writeFileSync(process.env.SIGNING_P12_PATH, created.p12, { mode: 0o600 });
    this.logger.warn('Sealing with a self-signed certificate: PDF readers will show the seal as from an unknown signer.');
    return (this.seal = created);
  }

  /** Builds, seals and time-stamps the final PDF of an executed agreement; safe to call again. */
  async finalize(contractId: string) {
    const existing = await this.prisma.signedAgreementDocument.findUnique({ where: { contractId }, select: { id: true, timestampToken: true } });
    if (existing) {
      if (!existing.timestampToken) await this.timestamp(contractId);
      return;
    }
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId }, include: { versions: { orderBy: { version: 'desc' }, take: 1 }, parties: true, approvals: { orderBy: { decidedAt: 'asc' } }, events: { orderBy: { createdAt: 'asc' } } } });
    if (!contract || contract.status !== 'EXECUTION') return;
    const version = contract.versions[0];
    if (!version) return;
    const local = (date: Date | null | undefined) => (date ? formatLocalDateTime(date, contract.countryNodeId) : '-');
    const nameOf = (userId: string | null | undefined, eventType?: string) => contract.events.filter((event) => event.actorId === userId && (!eventType || event.eventType === eventType)).map((event) => (event.metadata as { byName?: string } | null)?.byName).find(Boolean) ?? userId ?? '-';
    const parties = contract.parties.filter((party) => party.role);
    const signers = await Promise.all(parties.map(async (party) => {
      const [kyc, challenge] = await Promise.all([
        party.signedBy ? this.prisma.kycApplication.findFirst({ where: { userId: party.signedBy, status: 'APPROVED' }, orderBy: { updatedAt: 'desc' }, select: { applicationNumber: true } }) : null,
        party.signedBy ? this.prisma.signatureChallenge.findFirst({ where: { contractId, userId: party.signedBy, usedAt: { not: null } }, orderBy: { usedAt: 'desc' }, select: { channel: true, destination: true, usedAt: true } }) : null,
      ]);
      return {
        side: party.role === 'OWNER' ? 'Asset owner' : 'Delivery partner',
        organisation: party.displayName,
        name: nameOf(party.signedBy, 'PARTY_SIGNED'),
        typedSignature: party.signatureName ?? '-',
        signedAt: local(party.signedAt),
        identity: kyc ? `KYC approved (${kyc.applicationNumber})` : 'Platform account; no approved KYC on record',
        code: challenge ? `${challenge.channel === 'EMAIL' ? 'email' : challenge.channel.toLowerCase()} to ${challenge.destination}, entered ${local(challenge.usedAt)}` : 'not recorded',
      };
    }));
    const approvals = contract.approvals.filter((item) => item.status === 'SHARIAH_REVIEW' || item.status === 'APPROVED').map((item) => ({ step: item.status === 'SHARIAH_REVIEW' ? 'Legal approval' : 'Shariah approval', by: nameOf(item.approverId, 'STATUS_CHANGED'), at: local(item.decidedAt) }));
    const content = version.content as { sections?: Section[]; front?: AgreementFront } | null;
    const sections = (content?.sections ?? []).map((section) => (section.title === 'Signatures' && parties.length ? { ...section, paragraphs: parties.map((party) => `For the ${party.role === 'OWNER' ? 'asset owner' : 'delivery partner'}, ${party.displayName}: signed electronically by ${party.signatureName} on ${local(party.signedAt)}. See the Certificate of Completion.`) } : section));
    const completedAt = new Date();
    const execution = (content?.front?.parties ?? []).map((party, index) => {
      const signer = parties.find((item) => item.role === (index === 0 ? 'OWNER' : 'PDP'));
      return { defined: party.defined, name: party.name, registration: party.registration, signed: signer?.signedAt ? `Signed electronically on the Platform by ${signer.signatureName} on ${local(signer.signedAt)}, verified by a one-time code. See the Certificate of Completion.` : undefined };
    });
    const layout = { contractNumber: contract.contractNumber, title: contract.title ?? contract.contractType, version: version.version, status: 'Executed', dated: datedLine(completedAt), front: content?.front ?? null, sections, execution };
    const pdf = await renderSignedAgreementPdf(layout, { contractNumber: contract.contractNumber, title: contract.title ?? contract.contractType, version: version.version, versionSha256: entryHash(version.content), completedAt: local(completedAt), signers, approvals });
    const seal = this.sealCredentials();
    const sealed = await sealPdf(pdf, seal, { reason: `Signed by both parties; sealed by the platform`, location: 'Malaysia', contact: 'Wealth Pooling platform', signingTime: completedAt });
    const sha256 = sha256Hex(sealed);
    await this.prisma.signedAgreementDocument.create({ data: { contractId, version: version.version, pdf: sealed, sha256, sealedAt: completedAt, sealCertSha256: certificateFingerprint(seal) } });
    await this.audit.record({ userId: 'SYSTEM', action: 'agreement.sealed', resourceType: 'Contract', resourceId: contractId, organisationId: contract.organisationId, countryNodeId: contract.countryNodeId, metadata: { version: version.version, sha256, certificateSha256: certificateFingerprint(seal) } });
    await this.timestamp(contractId);
  }

  /** Asks the time-stamp authority to stamp the sealed file's hash; a failure is retried by the sweeper. */
  async timestamp(contractId: string) {
    const document = await this.prisma.signedAgreementDocument.findUnique({ where: { contractId }, select: { sha256: true, timestampToken: true } });
    if (!document || document.timestampToken) return;
    try {
      const stamp = await requestTimestamp(document.sha256);
      await this.prisma.signedAgreementDocument.update({ where: { contractId }, data: { timestampToken: stamp.token, timestampAt: stamp.genTime, timestampAuthority: stamp.authority, timestampSerial: stamp.serial } });
      await this.audit.record({ userId: 'SYSTEM', action: 'agreement.timestamped', resourceType: 'Contract', resourceId: contractId, metadata: { sha256: document.sha256, genTime: stamp.genTime.toISOString(), authority: stamp.authority, serial: stamp.serial } });
      await this.checkIntegrity(contractId);
    } catch (error) {
      this.logger.warn(`Time-stamp for agreement ${contractId} not obtained yet: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Checks the stored file: its hash is the one recorded, the seal still covers it and was made with the
   * recorded certificate, and the time-stamp stamps that hash. A mismatch is recorded and reported.
   */
  async checkIntegrity(contractId: string) {
    const document = await this.prisma.signedAgreementDocument.findUnique({ where: { contractId } });
    if (!document) return { status: 'NOT_SEALED' as const };
    const problems: string[] = [];
    const previous = document.integrityStatus;
    const pdf = Buffer.from(document.pdf);
    if (sha256Hex(pdf) !== document.sha256) problems.push('the stored file no longer has its recorded SHA-256');
    const seal = verifySealedPdf(pdf);
    if (!seal.digestMatches || !seal.signatureValid) problems.push(seal.reason ?? 'the platform seal does not verify');
    if (seal.certificateSha256 && seal.certificateSha256 !== document.sealCertSha256) problems.push('the seal was made with a different certificate');
    let stampedAt: Date | null = null;
    if (document.timestampToken) {
      try {
        const token = readStoredToken(document.timestampToken);
        if (token.imprintHex !== document.sha256) problems.push('the time-stamp is for a different file');
        stampedAt = token.genTime;
      } catch { problems.push('the time-stamp token cannot be read'); }
    }
    const status = problems.length ? 'MISMATCH' : document.timestampToken ? 'VERIFIED' : 'SEALED';
    const note = problems.length ? `Integrity check failed: ${problems.join('; ')}.` : null;
    await this.prisma.signedAgreementDocument.update({ where: { contractId }, data: { integrityStatus: status, integrityCheckedAt: new Date(), integrityNote: note } });
    if (status === 'MISMATCH' && previous !== 'MISMATCH') await this.reportMismatch(contractId, note!);
    return { status, checkedAt: new Date().toISOString(), sha256: document.sha256, sealedAt: document.sealedAt.toISOString(), signer: seal.signer, certificateSha256: document.sealCertSha256, timestamp: document.timestampToken ? { at: (stampedAt ?? document.timestampAt)?.toISOString() ?? null, authority: document.timestampAuthority, serial: document.timestampSerial } : null, note };
  }

  private async reportMismatch(contractId: string, note: string) {
    await this.audit.record({ userId: 'SYSTEM', action: 'agreement.integrity_mismatch', resourceType: 'Contract', resourceId: contractId, result: 'Failure', metadata: { note } });
    this.logger.error(`Signed agreement ${contractId}: ${note}`);
    if (!this.notifications) return;
    const admins = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: ['Super_Admin'] as PrismaUserRole[] }, isActive: true }, select: { userId: true, organisationId: true, countryNodeId: true } });
    await Promise.all(admins.map((admin) => this.notifications!.enqueue({ recipientUserId: admin.userId, organisationId: admin.organisationId, countryNodeId: admin.countryNodeId, type: 'INTEGRITY', title: 'Signed agreement failed its integrity check', message: `${contractId}: ${note}`, resourceType: 'Contract', resourceId: contractId, dedupeKey: `agreement-integrity:${contractId}:${new Date().toISOString().slice(0, 10)}:${admin.userId}` }).catch(() => undefined)));
  }

  /** The sealed PDF, checked first: a file that no longer matches is not handed out. */
  async signedPdf(contractId: string) {
    const integrity = await this.checkIntegrity(contractId);
    if (integrity.status === 'NOT_SEALED') throw new ConflictException('The signed agreement is still being sealed. Try again in a moment.');
    if (integrity.status === 'MISMATCH') throw new ConflictException('The stored signed agreement no longer matches its seal; an administrator has been told.');
    const document = await this.prisma.signedAgreementDocument.findUniqueOrThrow({ where: { contractId }, select: { pdf: true } });
    return Buffer.from(document.pdf);
  }

  async timestampToken(contractId: string) {
    const document = await this.prisma.signedAgreementDocument.findUnique({ where: { contractId }, select: { timestampToken: true } });
    if (!document?.timestampToken) throw new ConflictException('The time-stamp is not available yet.');
    return Buffer.from(document.timestampToken, 'base64');
  }
}
