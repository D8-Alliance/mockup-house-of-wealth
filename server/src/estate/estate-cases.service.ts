import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PayoutDestinationService } from '../distribution/payout-destination.service';
import { CreatePayoutDestinationDto } from '../distribution/payout-destination.dto';
import { FinancialLedgerService, investorCashAccount } from '../financial/financial-ledger.service';
import { detectDocumentType } from '../kyc/kyc.service';
import { NotificationService } from '../notifications/notification.service';
import { EARNED_DISTRIBUTION_STATUSES } from '../investments/positions';
import { INVESTOR_ROLES } from '../pools/pool-access';
import { PrismaService } from '../prisma.service';
import { postingOnBehalfOf } from '../tenancy/tenant-scope';
import { DeathReportDto } from './estate.dto';
import { planProblems, SettlementPlan, splitHolding } from './estate-settlement';

/** Who handles estate cases: the estate officer, and the country's admin or the Super Admin as stand-ins. */
export const ESTATE_CASE_ROLES = ['Estate Officer', 'Country Admin', 'Super Admin'];
export const ESTATE_DOCUMENT_TYPES = ['DEATH_CERTIFICATE', 'SIJIL_FARAID', 'PROBATE', 'LETTER_OF_ADMINISTRATION', 'HEIR_CONSENT', 'OTHER'] as const;
/** At least one of these, from the court, before holdings can be settled. */
const COURT_DOCUMENTS = ['SIJIL_FARAID', 'PROBATE', 'LETTER_OF_ADMINISTRATION'];
const OPEN_STATUSES = ['REPORTED', 'DEATH_VERIFIED', 'DOCUMENTS_VERIFIED', 'PLAN_SUBMITTED'];
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const INVESTOR_PRISMA_ROLES = [...INVESTOR_ROLES].map((role) => role.replace(/ /g, '_')) as PrismaUserRole[];

interface HistoryEntry { at: string; by: string; byName: string; action: string; note?: string }
type CaseRow = Prisma.EstateCaseGetPayload<{ include: { documents: { select: { id: true; documentType: true; fileName: true; mimeType: true; fileSize: true; sha256: true; uploadedBy: true; createdAt: true } }; consents: true } }>;

const normaliseId = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
const sameName = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const last4 = (masked: string | null) => (masked ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4).toLowerCase();
const round2 = (value: number) => Math.round(value * 100) / 100;
const DOCUMENT_SELECT = { id: true, documentType: true, fileName: true, mimeType: true, fileSize: true, sha256: true, uploadedBy: true, createdAt: true } as const;

/**
 * A member's estate after death. A recorded executor or beneficiary reports the death without signing in; the estate
 * officer verifies it and the account is frozen; the court documents (faraid certificate, probate or letters of
 * administration) are verified and any heirs' consent recorded; an estate payout account receives profit still due;
 * then a settlement plan moves each pool holding to the named recipients, approved by a second person.
 * The guidance follows Malaysian practice and needs Shariah and legal review before real use.
 */
@Injectable()
export class EstateCasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ledger: FinancialLedgerService,
    private readonly payoutAccounts: PayoutDestinationService,
    @Optional() private readonly notifications?: NotificationService,
  ) {}

  // ---- The report, without signing in ----

  /**
   * Accepts a death report. The answer is the same whether or not the details match a member and a recorded
   * executor or beneficiary, so the form cannot be used to find out who is a member; only matching reports open a case.
   */
  async report(input: DeathReportDto, file: Express.Multer.File | undefined, evidence: { ip?: string; userAgent?: string }) {
    const received = { received: true, message: 'Thank you. If the details match our records, an estate officer will contact you.' };
    if (!file) throw new BadRequestException('Attach the death certificate (PDF, JPG or PNG).');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('The file is larger than 15 MB.');
    const mimeType = detectDocumentType(file.buffer);
    if (!mimeType) throw new BadRequestException('The death certificate must be a PDF, JPG or PNG file.');
    const dateOfDeath = new Date(`${input.dateOfDeath}T00:00:00Z`);
    if (Number.isNaN(dateOfDeath.getTime()) || dateOfDeath > new Date()) throw new BadRequestException('The date of death cannot be in the future.');

    const wanted = normaliseId(input.deceasedIdNumber);
    const candidates = await this.prisma.kycApplication.findMany({ where: { status: 'APPROVED', idDocumentNumber: { endsWith: wanted.slice(-4), mode: 'insensitive' } }, select: { userId: true, countryNodeId: true, fullName: true, idDocumentNumber: true } });
    const kyc = candidates.find((row) => normaliseId(row.idDocumentNumber) === wanted);
    const deceased = kyc ? await this.prisma.user.findUnique({ where: { id: kyc.userId }, select: { id: true, name: true, homeCountryNodeId: true } }) : null;
    const reporter = deceased && (sameName(input.deceasedName, deceased.name) || sameName(input.deceasedName, kyc!.fullName)) ? await this.matchReporter(deceased.id, input) : null;
    const open = deceased ? await this.prisma.estateCase.findFirst({ where: { deceasedUserId: deceased.id, status: { in: OPEN_STATUSES } }, select: { id: true } }) : null;
    if (!deceased || !reporter || open) {
      await this.audit.record({ userId: 'ESTATE-REPORTER', action: open ? 'estate.death_report.duplicate' : 'estate.death_report.unmatched', resourceType: 'EstateCase', resourceId: open?.id ?? 'none', metadata: { ip: evidence.ip ?? null } });
      return received;
    }
    const countryNodeId = deceased.homeCountryNodeId ?? kyc!.countryNodeId;
    const caseNumber = `EST-${countryNodeId.replace(/^CN-/, '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const history: HistoryEntry[] = [{ at: new Date().toISOString(), by: 'REPORTER', byName: input.reporterName.trim(), action: 'REPORTED', note: `${reporter.kind === 'EXECUTOR' ? 'Executor' : 'Beneficiary'} (${input.reporterRelation.trim()})` }];
    const created = await this.prisma.estateCase.create({
      data: {
        caseNumber, deceasedUserId: deceased.id, countryNodeId, dateOfDeath,
        reporterName: input.reporterName.trim(), reporterRelation: input.reporterRelation.trim(), reporterKind: reporter.kind, reporterRefId: reporter.id,
        reporterEmail: input.reporterEmail?.trim() || null, reporterPhone: input.reporterPhone?.trim() || null,
        reportEvidence: { ip: evidence.ip ?? null, userAgent: evidence.userAgent?.slice(0, 300) ?? null, at: new Date().toISOString() },
        history: history as unknown as Prisma.InputJsonValue,
        documents: { create: { documentType: 'DEATH_CERTIFICATE', fileName: file.originalname.slice(0, 200), mimeType, fileSize: file.size, fileContent: file.buffer, sha256, uploadedBy: 'REPORTER' } },
      },
    });
    await this.audit.record({ userId: 'ESTATE-REPORTER', action: 'estate.death_report.received', resourceType: 'EstateCase', resourceId: created.id, countryNodeId, metadata: { caseNumber, reporterKind: reporter.kind, certificateSha256: sha256, ip: evidence.ip ?? null } });
    await this.notifications?.notifyRoles(['Estate_Officer'], { countryNodeId }, {
      type: 'ESTATE', title: 'Death reported',
      message: `A death has been reported for ${deceased.name} (case ${caseNumber}). Check the death certificate and verify or reject the report.`,
      resourceType: 'EstateCase', resourceId: created.id, dedupeKey: `estate-reported:${created.id}`,
    });
    return received;
  }

  /** The reporter must be one of the deceased's recorded executors or beneficiaries: same name and the same last four ID characters. */
  private async matchReporter(deceasedUserId: string, input: DeathReportDto) {
    const tail = input.reporterIdLast4.toLowerCase();
    const [executors, beneficiaries] = await Promise.all([
      this.prisma.estateExecutor.findMany({ where: { ownerUserId: deceasedUserId }, select: { id: true, name: true, identityNumberMasked: true } }),
      this.prisma.estateBeneficiary.findMany({ where: { ownerUserId: deceasedUserId }, select: { id: true, name: true, identityNumberMasked: true } }),
    ]);
    const executor = executors.find((row) => sameName(row.name, input.reporterName) && last4(row.identityNumberMasked) === tail);
    if (executor) return { kind: 'EXECUTOR', id: executor.id };
    const beneficiary = beneficiaries.find((row) => sameName(row.name, input.reporterName) && last4(row.identityNumberMasked) === tail);
    return beneficiary ? { kind: 'BENEFICIARY', id: beneficiary.id } : null;
  }

  // ---- The officer's case ----

  private requireOfficer(actor: AuthenticatedUser) {
    if (!ESTATE_CASE_ROLES.includes(actor.role)) throw new ForbiddenException('Only estate officers handle estate cases.');
  }

  private async load(actor: AuthenticatedUser, id: string): Promise<CaseRow> {
    this.requireOfficer(actor);
    const row = await this.prisma.estateCase.findUnique({ where: { id }, include: { documents: { select: DOCUMENT_SELECT, orderBy: { createdAt: 'asc' } }, consents: { orderBy: { createdAt: 'asc' } } } });
    if (!row || (actor.role !== 'Super Admin' && row.countryNodeId !== actor.countryNodeId)) throw new NotFoundException('Estate case not found.');
    return row;
  }

  private entry(actor: AuthenticatedUser, action: string, note?: string): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name || actor.email || actor.userId, action, ...(note ? { note } : {}) };
  }

  private async step(actor: AuthenticatedUser, row: CaseRow, from: string[], data: Prisma.EstateCaseUpdateManyMutationInput, action: string, note?: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const history = [...((row.history as unknown as HistoryEntry[]) ?? []), this.entry(actor, action, note)];
    const claimed = await tx.estateCase.updateMany({ where: { id: row.id, status: { in: from } }, data: { ...data, history: history as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('The case changed meanwhile. Reload it.');
    await this.audit.recordActor(actor, { action: `estate.case.${action.toLowerCase()}`, resourceType: 'EstateCase', resourceId: row.id, countryNodeId: row.countryNodeId, metadata: { caseNumber: row.caseNumber, note: note ?? null } }, tx);
  }

  async list(actor: AuthenticatedUser) {
    this.requireOfficer(actor);
    const rows = await this.prisma.estateCase.findMany({ where: actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId }, orderBy: { createdAt: 'desc' }, take: 200, select: { id: true, caseNumber: true, deceasedUserId: true, countryNodeId: true, status: true, dateOfDeath: true, reporterName: true, reporterRelation: true, createdAt: true, settledAt: true } });
    const names = new Map((await this.prisma.user.findMany({ where: { id: { in: rows.map((row) => row.deceasedUserId) } }, select: { id: true, name: true } })).map((user) => [user.id, user.name]));
    return rows.map((row) => ({ ...row, deceasedName: names.get(row.deceasedUserId) ?? row.deceasedUserId }));
  }

  /**
   * The case file. The deceased's estate instructions and holdings are shown only once the death is verified,
   * and every such view is written to the audit log.
   */
  async get(actor: AuthenticatedUser, id: string) {
    const row = await this.load(actor, id);
    const deceased = await this.prisma.user.findUnique({ where: { id: row.deceasedUserId }, select: { id: true, name: true, email: true, isActive: true, deceasedAt: true, profile: true } });
    const { history, plan, ...rest } = row;
    const base = { ...rest, history, plan: plan as SettlementPlan | null, deceased: deceased ? { id: deceased.id, name: deceased.name, email: deceased.email, frozen: !deceased.isActive, deceasedAt: deceased.deceasedAt } : null };
    if (row.status === 'REPORTED' || row.status === 'REJECTED') return { ...base, instructions: null, holdings: [], estateAccounts: [] };
    const [beneficiaries, executors, holdings, estateAccounts] = await Promise.all([
      this.prisma.estateBeneficiary.findMany({ where: { ownerUserId: row.deceasedUserId }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, relation: true, distributionType: true, allocationPercent: true, email: true, phone: true, identityNumberMasked: true, payoutMethod: true, hibahQabulStatus: true, heirConsentRequired: true } }),
      this.prisma.estateExecutor.findMany({ where: { ownerUserId: row.deceasedUserId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], select: { id: true, name: true, kind: true, relation: true, email: true, phone: true, identityNumberMasked: true, isPrimary: true } }),
      this.holdings(row.deceasedUserId),
      this.prisma.payoutDestination.findMany({ where: { ownerUserId: row.deceasedUserId, status: { in: ['PENDING_VERIFICATION', 'VERIFIED'] } }, select: { id: true, provider: true, maskedReference: true, accountHolder: true, status: true, currency: true } }),
    ]);
    const framework = ((deceased?.profile as { preferences?: { estateFramework?: string } } | null)?.preferences?.estateFramework) ?? null;
    await this.audit.recordActor(actor, { action: 'estate.case.instructions_read', resourceType: 'EstateCase', resourceId: row.id, countryNodeId: row.countryNodeId, metadata: { caseNumber: row.caseNumber } });
    return { ...base, instructions: { framework, beneficiaries: beneficiaries.map((item) => ({ ...item, allocationPercent: item.allocationPercent === null ? null : Number(item.allocationPercent) })), executors }, holdings, estateAccounts };
  }

  /** The deceased's capital in each pool (confirmed contributions) and profit earned but not yet paid out. */
  private async holdings(userId: string) {
    const contributions = await this.prisma.investmentContribution.groupBy({ by: ['poolId', 'currency'], where: { investorUserId: userId, status: 'POSTED', poolId: { not: null } }, _sum: { amount: true } });
    const poolIds = contributions.map((row) => row.poolId!).filter(Boolean);
    const [pools, unpaid] = await Promise.all([
      this.prisma.wealthPool.findMany({ where: { poolId: { in: poolIds } }, select: { poolId: true, poolName: true, status: true } }),
      // Earned (distribution approved) but its bank payout has not settled: it waits for the estate account.
      this.prisma.distributionAllocation.findMany({ where: { beneficiaryUserId: userId, distribution: { status: { in: EARNED_DISTRIBUTION_STATUSES } }, OR: [{ payoutInstruction: null }, { payoutInstruction: { status: { not: 'SETTLED' } } }] }, select: { amount: true, currency: true, distribution: { select: { poolId: true } } } }),
    ]);
    const names = new Map(pools.map((pool) => [pool.poolId, pool]));
    return contributions.map((row) => ({
      poolId: row.poolId!, poolName: names.get(row.poolId!)?.poolName ?? row.poolId!, poolStatus: names.get(row.poolId!)?.status ?? '',
      currency: row.currency, capital: round2(Number(row._sum.amount ?? 0)),
      profitUnpaid: round2(unpaid.filter((item) => item.distribution.poolId === row.poolId && item.currency === row.currency).reduce((sum, item) => sum + Number(item.amount), 0)),
    })).filter((row) => row.capital > 0);
  }

  /**
   * Verifying the death freezes the account: the member can no longer sign in, orders waiting for payment are
   * cancelled, and their bank accounts stop receiving payouts (profit then waits for the estate account).
   */
  async decideDeath(actor: AuthenticatedUser, id: string, decision: 'VERIFY' | 'REJECT', note: string) {
    const row = await this.load(actor, id);
    if (row.status !== 'REPORTED') throw new BadRequestException('Only a new report is verified or rejected.');
    if (decision === 'REJECT') {
      await this.step(actor, row, ['REPORTED'], { status: 'REJECTED', rejectedReason: note }, 'REJECTED', note);
      return this.get(actor, id);
    }
    await this.prisma.$transaction(async (tx) => {
      await this.step(actor, row, ['REPORTED'], { status: 'DEATH_VERIFIED', deathVerifiedBy: actor.userId, deathVerifiedAt: new Date() }, 'DEATH_VERIFIED', note, tx);
      await tx.user.update({ where: { id: row.deceasedUserId }, data: { isActive: false, deceasedAt: row.dateOfDeath } });
      const cancelled = await tx.investmentOrder.updateMany({ where: { investorUserId: row.deceasedUserId, status: 'PENDING' }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      const suspended = await tx.payoutDestination.updateMany({ where: { ownerUserId: row.deceasedUserId, status: { in: ['VERIFIED', 'PENDING_VERIFICATION'] } }, data: { status: 'SUSPENDED', isDefault: false } });
      await this.audit.recordActor(actor, { action: 'estate.account.frozen', resourceType: 'User', resourceId: row.deceasedUserId, countryNodeId: row.countryNodeId, metadata: { caseNumber: row.caseNumber, ordersCancelled: cancelled.count, payoutAccountsSuspended: suspended.count } }, tx);
    });
    return this.get(actor, id);
  }

  async uploadDocument(actor: AuthenticatedUser, id: string, documentType: string, file: Express.Multer.File | undefined) {
    const row = await this.load(actor, id);
    if (!(ESTATE_DOCUMENT_TYPES as readonly string[]).includes(documentType)) throw new BadRequestException(`Choose a document type: ${ESTATE_DOCUMENT_TYPES.join(', ')}.`);
    if (!OPEN_STATUSES.includes(row.status)) throw new BadRequestException('This case is closed.');
    if (!file) throw new BadRequestException('A PDF, JPG or PNG file is required.');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('The file is larger than 15 MB.');
    const mimeType = detectDocumentType(file.buffer);
    if (!mimeType) throw new BadRequestException('The file is not a valid PDF, JPG or PNG.');
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const document = await this.prisma.estateCaseDocument.create({ data: { caseId: id, documentType, fileName: file.originalname.slice(0, 200), mimeType, fileSize: file.size, fileContent: file.buffer, sha256, uploadedBy: actor.userId }, select: { id: true } });
    await this.audit.recordActor(actor, { action: 'estate.case.document_uploaded', resourceType: 'EstateCase', resourceId: id, countryNodeId: row.countryNodeId, metadata: { documentId: document.id, documentType, sha256 } });
    return this.get(actor, id);
  }

  async downloadDocument(actor: AuthenticatedUser, id: string, documentId: string) {
    const row = await this.load(actor, id);
    const document = await this.prisma.estateCaseDocument.findFirst({ where: { id: documentId, caseId: id }, select: { fileName: true, mimeType: true, fileContent: true } });
    if (!document) throw new NotFoundException('Document not found.');
    await this.audit.recordActor(actor, { action: 'estate.case.document_downloaded', resourceType: 'EstateCase', resourceId: id, countryNodeId: row.countryNodeId, metadata: { documentId } });
    return document;
  }

  async verifyDocuments(actor: AuthenticatedUser, id: string, note: string) {
    const row = await this.load(actor, id);
    if (row.status !== 'DEATH_VERIFIED') throw new BadRequestException('Verify the death first.');
    if (!row.documents.some((document) => COURT_DOCUMENTS.includes(document.documentType))) throw new BadRequestException('Upload the faraid certificate (Sijil Faraid), the grant of probate or the letters of administration first.');
    await this.step(actor, row, ['DEATH_VERIFIED'], { status: 'DOCUMENTS_VERIFIED', documentsVerifiedBy: actor.userId, documentsVerifiedAt: new Date() }, 'DOCUMENTS_VERIFIED', note);
    return this.get(actor, id);
  }

  /** An heir's consent or refusal, after the death, to a wasiyyah that needs it. Without consent that part follows faraid. */
  async recordConsent(actor: AuthenticatedUser, id: string, input: { beneficiaryId: string; heirName: string; heirRelation: string; decision: 'CONSENTED' | 'REFUSED'; note?: string }) {
    const row = await this.load(actor, id);
    if (!['DEATH_VERIFIED', 'DOCUMENTS_VERIFIED'].includes(row.status)) throw new BadRequestException('Heirs\' consent is recorded after the death is verified and before the plan is submitted.');
    const bequest = await this.prisma.estateBeneficiary.findFirst({ where: { id: input.beneficiaryId, ownerUserId: row.deceasedUserId, heirConsentRequired: true }, select: { id: true } });
    if (!bequest) throw new BadRequestException('Only a wasiyyah marked as needing the heirs\' consent takes it.');
    await this.prisma.estateHeirConsent.create({ data: { caseId: id, beneficiaryId: input.beneficiaryId, heirName: input.heirName.trim(), heirRelation: input.heirRelation.trim(), decision: input.decision, note: input.note?.trim() ?? '', recordedBy: actor.userId } });
    await this.audit.recordActor(actor, { action: 'estate.case.heir_consent', resourceType: 'EstateCase', resourceId: id, countryNodeId: row.countryNodeId, metadata: { beneficiaryId: input.beneficiaryId, heirRelation: input.heirRelation, decision: input.decision } });
    return this.get(actor, id);
  }

  /**
   * The estate's bank account, held by the executor or administrator, for profit still due to the deceased. It is
   * added unverified in the deceased's name; a settlement operator verifies it like any payout account.
   */
  async addEstateAccount(actor: AuthenticatedUser, id: string, input: CreatePayoutDestinationDto) {
    const row = await this.load(actor, id);
    if (!['DEATH_VERIFIED', 'DOCUMENTS_VERIFIED', 'PLAN_SUBMITTED'].includes(row.status)) throw new BadRequestException('Add the estate account after the death is verified.');
    const assignment = await this.prisma.userRoleAssignment.findFirst({ where: { userId: row.deceasedUserId, countryNodeId: row.countryNodeId }, orderBy: { assignedAt: 'asc' }, select: { organisationId: true } });
    if (!assignment) throw new BadRequestException('The deceased has no organisation in this country to hold the account.');
    await this.payoutAccounts.createFor(actor, { userId: row.deceasedUserId, organisationId: assignment.organisationId, countryNodeId: row.countryNodeId }, { ...input, isDefault: true });
    await this.audit.recordActor(actor, { action: 'estate.case.estate_account_added', resourceType: 'EstateCase', resourceId: id, countryNodeId: row.countryNodeId, metadata: { provider: input.provider } });
    return this.get(actor, id);
  }

  /** People who can receive a holding: active investors of the case's country with approved KYC. */
  async recipients(actor: AuthenticatedUser, id: string, query: string) {
    const row = await this.load(actor, id);
    const needle = query.trim();
    if (needle.length < 3) return [];
    const users = await this.prisma.user.findMany({
      where: { isActive: true, id: { not: row.deceasedUserId }, OR: [{ email: { contains: needle, mode: 'insensitive' } }, { name: { contains: needle, mode: 'insensitive' } }, { id: needle }], roleAssignments: { some: { isActive: true, countryNodeId: row.countryNodeId, role: { in: INVESTOR_PRISMA_ROLES } } } },
      take: 10, select: { id: true, name: true, email: true },
    });
    const approved = new Set((await this.prisma.kycApplication.findMany({ where: { userId: { in: users.map((user) => user.id) }, status: 'APPROVED' }, select: { userId: true } })).map((kyc) => kyc.userId));
    return users.map((user) => ({ ...user, kycApproved: approved.has(user.id) }));
  }

  async submitPlan(actor: AuthenticatedUser, id: string, plan: SettlementPlan) {
    const row = await this.load(actor, id);
    if (row.status !== 'DOCUMENTS_VERIFIED') throw new BadRequestException('Verify the court documents before the settlement plan.');
    const held = (await this.holdings(row.deceasedUserId)).map((holding) => holding.poolId);
    const problems = planProblems(plan, held, row.deceasedUserId);
    if (problems.length) throw new BadRequestException(problems.join(' '));
    await this.assertRecipients(row, plan);
    await this.step(actor, row, ['DOCUMENTS_VERIFIED'], { status: 'PLAN_SUBMITTED', plan: plan as unknown as Prisma.InputJsonValue, planBy: actor.userId, planAt: new Date() }, 'PLAN_SUBMITTED', plan.note || undefined);
    await this.notifications?.notifyRoles(['Estate_Officer', 'Country_Admin'], { countryNodeId: row.countryNodeId }, {
      type: 'ESTATE', title: 'Estate settlement plan to approve',
      message: `Case ${row.caseNumber}: a settlement plan is waiting for a second officer's approval.`,
      resourceType: 'EstateCase', resourceId: id, dedupeKey: `estate-plan:${id}:${new Date().toISOString().slice(0, 16)}`,
    }, actor.userId);
    return this.get(actor, id);
  }

  private async assertRecipients(row: CaseRow, plan: SettlementPlan) {
    const ids = [...new Set(plan.holdings.flatMap((holding) => holding.recipients.map((recipient) => recipient.userId)))];
    const [users, kyc] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: ids }, isActive: true, roleAssignments: { some: { isActive: true, countryNodeId: row.countryNodeId, role: { in: INVESTOR_PRISMA_ROLES } } } }, select: { id: true } }),
      this.prisma.kycApplication.findMany({ where: { userId: { in: ids }, status: 'APPROVED' }, select: { userId: true } }),
    ]);
    const ok = new Set(users.map((user) => user.id));
    const verified = new Set(kyc.map((item) => item.userId));
    const missing = ids.filter((userId) => !ok.has(userId) || !verified.has(userId));
    if (missing.length) throw new BadRequestException(`Every recipient needs an active investor account in this country with approved KYC: ${missing.join(', ')}.`);
  }

  /**
   * A second person approves or returns the plan. Approval moves every holding at once: the deceased's capital in
   * each pool is posted from their investor account to each recipient's, each recipient gets a settled order under
   * the same akad terms and their share of the capital, and the deceased's orders and contributions there are
   * marked TRANSFERRED. Profit already earned stays with the deceased and is paid to the estate account.
   */
  async decidePlan(actor: AuthenticatedUser, id: string, decision: 'APPROVE' | 'RETURN', note: string) {
    const row = await this.load(actor, id);
    if (row.status !== 'PLAN_SUBMITTED' || !row.plan) throw new BadRequestException('No settlement plan is waiting.');
    if (row.planBy === actor.userId) throw new ForbiddenException('You submitted this plan, so another officer must decide it.');
    if (decision === 'RETURN') {
      await this.step(actor, row, ['PLAN_SUBMITTED'], { status: 'DOCUMENTS_VERIFIED' }, 'PLAN_RETURNED', note);
      return this.get(actor, id);
    }
    const plan = row.plan as unknown as SettlementPlan;
    await this.assertRecipients(row, plan);
    const moved: Array<{ userId: string; poolId: string; amount: number; currency: string }> = [];
    await this.prisma.$transaction(async (tx) => {
      await this.step(actor, row, ['PLAN_SUBMITTED'], { status: 'SETTLED', approvedBy: actor.userId, approvedAt: new Date(), settledAt: new Date() }, 'SETTLED', note, tx);
      for (const holding of plan.holdings) {
        const pool = await tx.wealthPool.findUnique({ where: { poolId: holding.poolId }, select: { poolId: true, projectId: true, organisationId: true, countryNodeId: true, currency: true } });
        if (!pool) throw new NotFoundException(`Pool ${holding.poolId} not found.`);
        const contributions = await tx.investmentContribution.findMany({ where: { investorUserId: row.deceasedUserId, poolId: pool.poolId, status: 'POSTED', currency: pool.currency }, select: { id: true, amount: true } });
        const capital = round2(contributions.reduce((sum, item) => sum + Number(item.amount), 0));
        if (capital <= 0) throw new BadRequestException(`The deceased no longer holds capital in pool ${pool.poolId}.`);
        const lastOrder = await tx.investmentOrder.findFirst({ where: { investorUserId: row.deceasedUserId, poolId: pool.poolId, status: 'SETTLED' }, orderBy: { settledAt: 'desc' }, select: { akadTermsId: true, akadTermsHash: true } });
        const books = postingOnBehalfOf(actor, pool);
        const fromAccount = await this.ledger.ensureAccountInTransaction(tx, books, await investorCashAccount(tx, row.deceasedUserId, pool.organisationId, pool.countryNodeId, pool.currency));
        for (const [index, part] of splitHolding(capital, holding.recipients).entries()) {
          if (part.amount <= 0) continue;
          const toAccount = await this.ledger.ensureAccountInTransaction(tx, books, await investorCashAccount(tx, part.userId, pool.organisationId, pool.countryNodeId, pool.currency));
          const order = await tx.investmentOrder.create({ data: {
            orderNumber: `HOW-EST-${row.caseNumber.replace(/^EST-/, '')}-${pool.poolId.slice(-6)}-${index + 1}`, poolId: pool.poolId, projectId: pool.projectId, investorUserId: part.userId,
            organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, amount: new Prisma.Decimal(part.amount), currency: pool.currency, status: 'SETTLED',
            idempotencyKey: `estate:${row.id}:${pool.poolId}:${part.userId}`, settledAt: new Date(), settledBy: actor.userId, paymentReference: `ESTATE ${row.caseNumber}`,
            akadTermsId: lastOrder?.akadTermsId ?? null, akadTermsHash: lastOrder?.akadTermsHash ?? null, akadAcceptedAt: lastOrder?.akadTermsId ? new Date() : null, estateCaseId: row.id,
          } });
          const posting = await this.ledger.postInTransaction(tx, books, {
            transactionType: 'ESTATE_TRANSFER', referenceType: 'EstateCase', referenceId: row.id, currency: pool.currency,
            description: `Estate ${row.caseNumber}: capital in ${pool.poolId} passed to an heir`, idempotencyKey: `estate-transfer:${row.id}:${pool.poolId}:${part.userId}`,
            entries: [{ accountId: fromAccount.id, direction: 'DEBIT', amount: part.amount, description: 'Deceased investor capital' }, { accountId: toAccount.id, direction: 'CREDIT', amount: part.amount, description: 'Inherited investor capital' }],
          });
          await tx.investmentContribution.create({ data: { orderId: order.id, projectId: pool.projectId, poolId: pool.poolId, investorUserId: part.userId, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, amount: new Prisma.Decimal(part.amount), currency: pool.currency, ledgerTransactionId: posting.id } });
          moved.push({ userId: part.userId, poolId: pool.poolId, amount: part.amount, currency: pool.currency });
        }
        await tx.investmentContribution.updateMany({ where: { id: { in: contributions.map((item) => item.id) } }, data: { status: 'TRANSFERRED' } });
        await tx.investmentOrder.updateMany({ where: { investorUserId: row.deceasedUserId, poolId: pool.poolId, status: 'SETTLED' }, data: { status: 'TRANSFERRED', estateCaseId: row.id } });
      }
      await this.audit.recordActor(actor, { action: 'estate.case.holdings_transferred', resourceType: 'EstateCase', resourceId: row.id, countryNodeId: row.countryNodeId, metadata: { caseNumber: row.caseNumber, transfers: moved } }, tx);
    }, { timeout: 60_000 });
    const pools = new Map((await this.prisma.wealthPool.findMany({ where: { poolId: { in: moved.map((item) => item.poolId) } }, select: { poolId: true, poolName: true } })).map((pool) => [pool.poolId, pool.poolName]));
    for (const item of moved) {
      await this.notifications?.notifyUsers([item.userId], {
        type: 'ESTATE', title: 'Inherited investment',
        message: `${item.currency} ${item.amount.toFixed(2)} in ${pools.get(item.poolId) ?? item.poolId} has passed to you from an estate (case ${row.caseNumber}). It now shows in your Investments under the same akad terms.`,
        resourceType: 'EstateCase', resourceId: row.id, dedupeKey: `estate-inherited:${row.id}:${item.poolId}:${item.userId}`,
      });
    }
    return this.get(actor, id);
  }
}
