import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { minSponsorPct } from '../capital-takaful/safeguard-rules';
import { kycInvestmentLimit, KycLimitsMisconfigured } from '../investments/kyc-limits';
import { CREDIT_PACKAGES, FALLBACK_PRICING, PLANS } from '../membership/membership.service';
import { TOYYIBPAY_FPX_FEE_MYR } from '../membership/toyyibpay.service';
import { REQUIRED_KYB_DOCUMENTS } from '../organisation-kyb/organisation-kyb.service';
import { PrismaService } from '../prisma.service';
import { PROJECT_PROMOTION_PACKAGES } from '../projects/projects.service';
import { approvalMatrix } from './approval-matrix';
import { CreateIncidentDto, SaveFatwaDto, SaveRiskDto, UpdateIncidentDto } from './governance.dto';
import { buildReport, GOVERNANCE_REPORTS, GovernanceReportKey } from './governance-reports';

/** Dashboards, reports, the approval matrix, fees and country rules. */
export const GOVERNANCE_READERS = ['Super Admin', 'Country Admin', 'Compliance Officer', 'Auditor'];
export const RISK_EDITORS = ['Super Admin', 'Country Admin', 'Compliance Officer', 'Risk Officer'];
export const RISK_READERS = [...RISK_EDITORS, 'Auditor'];
export const FATWA_EDITORS = ['Super Admin', 'Shariah Committee', 'Shariah Advisor'];
export const FATWA_READERS = [...FATWA_EDITORS, 'Shariah Reviewer', 'Country Admin', 'Compliance Officer', 'Legal Officer', 'Auditor'];

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIVILEGED_ROLES = (['Super_Admin', 'Country_Admin', 'Organization_Admin', 'Data_Administrator', 'AI_Administrator'] as const).filter((role) => role in PrismaUserRole) as PrismaUserRole[];
const KYC_LEVELS = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3'];

interface HistoryEntry { at: string; by: string; byName: string; status: string; note: string }

const counts = <K extends string>(rows: Array<{ _count: { _all: number } } & Record<K, unknown>>, field: K) =>
  Object.fromEntries(rows.map((row) => [String(row[field]), row._count._all]));

/** Sums per status and currency, e.g. { PENDING: { MYR: 5000 } }. */
const sums = (rows: Array<{ status: string; currency: string; _sum: { [key: string]: Prisma.Decimal | null } }>, field: string) => {
  const result: Record<string, Record<string, number>> = {};
  for (const row of rows) (result[row.status] ??= {})[row.currency] = Number(row._sum[field] ?? 0);
  return result;
};

@Injectable()
export class GovernanceService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** Super Admin sees every country (null); everyone else only their own. */
  private country(actor: AuthenticatedUser): string | null {
    return actor.role === 'Super Admin' ? null : actor.countryNodeId;
  }

  private scope(actor: AuthenticatedUser) {
    const country = this.country(actor);
    return country ? { countryNodeId: country } : {};
  }

  private require(actor: AuthenticatedUser, roles: string[], what: string) {
    if (!roles.includes(actor.role)) throw new ForbiddenException(`Your role cannot ${what}.`);
  }

  /** Where a new record goes: Super Admin names the country, everyone else uses their own. */
  private targetCountry(actor: AuthenticatedUser, requested?: string) {
    if (actor.role !== 'Super Admin') return actor.countryNodeId;
    if (!requested) throw new BadRequestException('Choose the country this record belongs to.');
    return requested;
  }

  private assertInScope(actor: AuthenticatedUser, countryNodeId: string | null) {
    const country = this.country(actor);
    if (country && countryNodeId !== country) throw new NotFoundException('Record not found.');
  }

  // Dashboards

  async complianceDashboard(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the compliance dashboard');
    const scope = this.scope(actor);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [kyc, kyb, assets, agreements, oldestKyc, oldestKyb, related, consents, people, openIncidents, highRisks] = await Promise.all([
      this.prisma.kycApplication.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.organisation.groupBy({ by: ['kybStatus'], where: scope, _count: { _all: true } }),
      this.prisma.asset.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.contract.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.kycApplication.findFirst({ where: { ...scope, status: 'SUBMITTED' }, orderBy: { submittedAt: 'asc' }, select: { submittedAt: true } }),
      this.prisma.organisation.findFirst({ where: { ...scope, kybStatus: 'SUBMITTED' }, orderBy: { kybSubmittedAt: 'asc' }, select: { kybSubmittedAt: true } }),
      this.prisma.investmentOrder.groupBy({ by: ['currency'], where: { ...scope, relatedParty: true, status: { in: ['PENDING', 'SETTLED'] } }, _count: { _all: true }, _sum: { amount: true } }),
      this.prisma.privacyConsent.findMany({ where: { acceptedAt: { gte: since } }, select: { userId: true }, distinct: ['userId'] }),
      this.prisma.user.count(),
      this.prisma.incident.count({ where: { ...scope, status: { in: ['OPEN', 'INVESTIGATING'] } } }),
      this.prisma.riskItem.findMany({ where: { ...scope, status: { not: 'CLOSED' } }, select: { likelihood: true, impact: true } }),
    ]);
    const days = (from: Date | null | undefined) => (from ? Math.floor((Date.now() - from.getTime()) / DAY_MS) : null);
    return {
      kyc: counts(kyc, 'status'),
      kyb: counts(kyb, 'kybStatus'),
      assets: counts(assets, 'status'),
      agreements: counts(agreements, 'status'),
      oldestKycWaitingDays: days(oldestKyc?.submittedAt),
      oldestKybWaitingDays: days(oldestKyb?.kybSubmittedAt),
      relatedParty: related.map((row) => ({ currency: row.currency, orders: row._count._all, amount: Number(row._sum.amount ?? 0) })),
      privacyConsentsLast30Days: consents.length,
      users: people,
      openIncidents,
      highRisks: highRisks.filter((risk) => risk.likelihood * risk.impact >= 15).length,
    };
  }

  async auditDashboard(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the audit dashboard');
    const scope = this.scope(actor);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const where = { ...scope, createdAt: { gte: since } };
    const [total, byAction, byResource, failures, perDay, seals] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.groupBy({ by: ['action'], where, _count: { _all: true }, orderBy: { _count: { action: 'desc' } }, take: 12 }),
      this.prisma.auditEvent.groupBy({ by: ['resourceType'], where, _count: { _all: true }, orderBy: { _count: { resourceType: 'desc' } }, take: 10 }),
      this.prisma.auditEvent.findMany({ where: { ...where, result: { not: 'Success' } }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, resourceType: true, resourceId: true, userEmail: true, result: true, createdAt: true } }),
      this.prisma.$queryRaw<Array<{ day: Date; events: bigint }>>(scopeCountry(scope)
        ? Prisma.sql`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS events FROM "AuditEvent" WHERE "createdAt" >= ${since} AND "countryNodeId" = ${scopeCountry(scope)} GROUP BY 1 ORDER BY 1`
        : Prisma.sql`SELECT date_trunc('day', "createdAt") AS day, COUNT(*) AS events FROM "AuditEvent" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`),
      this.prisma.hashChainLink.groupBy({ by: ['chain'], _max: { sealedAt: true, sequence: true } }),
    ]);
    return {
      totalLast30Days: total,
      byAction: byAction.map((row) => ({ action: row.action, count: row._count._all })),
      byResource: byResource.map((row) => ({ resourceType: row.resourceType, count: row._count._all })),
      failures: failures.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      perDay: perDay.map((row) => ({ day: row.day.toISOString().slice(0, 10), events: Number(row.events) })),
      chains: seals.map((row) => ({ chain: row.chain, records: (row._max.sequence ?? -1) + 1, lastSealedAt: row._max.sealedAt?.toISOString() ?? null })),
    };
  }

  async financeDashboard(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the finance dashboard');
    const scope = this.scope(actor);
    const country = this.country(actor);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [orders, settled30, tranches, distributions, payouts, accounts, nodes] = await Promise.all([
      this.prisma.investmentOrder.groupBy({ by: ['status', 'currency'], where: scope, _sum: { amount: true } }),
      this.prisma.investmentOrder.groupBy({ by: ['currency'], where: { ...scope, status: 'SETTLED', settledAt: { gte: since } }, _sum: { amount: true }, _count: { _all: true } }),
      this.prisma.fundingRequest.groupBy({ by: ['status', 'currency'], where: scope, _sum: { requestedAmount: true } }),
      this.prisma.distribution.groupBy({ by: ['status', 'currency'], where: scope, _sum: { totalAmount: true } }),
      this.prisma.payoutInstruction.groupBy({ by: ['status', 'currency'], where: country ? { allocation: { distribution: { countryNodeId: country } } } : {}, _sum: { amount: true } }),
      this.prisma.collectionAccount.findMany({ where: country ? { countryNodeId: country } : {}, select: { countryNodeId: true } }),
      this.prisma.countryNode.findMany({ where: country ? { code: country } : {}, select: { code: true, name: true } }),
    ]);
    const withAccount = new Set(accounts.map((account) => account.countryNodeId));
    return {
      orders: sums(orders, 'amount'),
      settledLast30Days: settled30.map((row) => ({ currency: row.currency, orders: row._count._all, amount: Number(row._sum.amount ?? 0) })),
      tranches: sums(tranches, 'requestedAmount'),
      distributions: sums(distributions, 'totalAmount'),
      payouts: sums(payouts, 'amount'),
      collectionAccounts: nodes.map((node) => ({ countryNodeId: node.code, name: node.name, configured: withAccount.has(node.code) })),
    };
  }

  async securityDashboard(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the security dashboard');
    const scope = this.scope(actor);
    const since = new Date(Date.now() - 30 * DAY_MS);
    const [roleChanges, privileged, failures, incidents] = await Promise.all([
      this.prisma.auditEvent.findMany({ where: { ...scope, createdAt: { gte: since }, action: { in: ['user.role_assignment', 'user.role_revocation', 'role.disable'] } }, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, action: true, userEmail: true, resourceId: true, metadata: true, createdAt: true } }),
      this.prisma.userRoleAssignment.groupBy({ by: ['role'], where: { ...scope, isActive: true, role: { in: PRIVILEGED_ROLES } }, _count: { _all: true } }),
      this.prisma.auditEvent.count({ where: { ...scope, createdAt: { gte: since }, result: { not: 'Success' } } }),
      this.prisma.incident.count({ where: { ...scope, category: { in: ['SECURITY', 'DATA_PROTECTION'] }, status: { in: ['OPEN', 'INVESTIGATING'] } } }),
    ]);
    const env = process.env;
    // Production settings the platform depends on; each is read from the running server.
    const settings = [
      { key: 'Sign-in through Keycloak (OIDC)', ok: env.AUTH_MODE === 'oidc', value: env.AUTH_MODE ?? 'not set' },
      { key: 'Production mode', ok: env.NODE_ENV === 'production', value: env.NODE_ENV ?? 'not set' },
      { key: 'Allowed browser origins (CORS)', ok: !!env.CORS_ORIGINS?.trim(), value: env.CORS_ORIGINS?.trim() ? 'set' : 'not set' },
      { key: 'Simulated payments refused', ok: env.ALLOW_SIMULATED_PAYMENTS !== 'true', value: env.ALLOW_SIMULATED_PAYMENTS === 'true' ? 'allowed' : 'refused' },
      { key: 'Signers must be verified (KYC/KYB)', ok: env.SIGNING_REQUIRE_VERIFIED_IDENTITY === 'true', value: env.SIGNING_REQUIRE_VERIFIED_IDENTITY === 'true' ? 'required' : 'not required' },
      { key: 'Face liveness required in KYC', ok: env.KYC_REQUIRE_LIVENESS === 'true', value: env.KYC_REQUIRE_LIVENESS === 'true' ? 'required' : 'not required' },
      { key: 'Redis over TLS', ok: env.REDIS_TLS === 'true', value: env.REDIS_TLS === 'true' ? 'on' : 'off' },
      { key: 'Investment limits by KYC level', ok: !!env.KYC_INVESTMENT_LIMITS?.trim(), value: env.KYC_INVESTMENT_LIMITS?.trim() ? 'set' : 'no limits' },
    ];
    return {
      settings,
      roleChangesLast30Days: roleChanges.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      privilegedRoles: privileged.map((row) => ({ role: row.role.replace(/_/g, ' '), holders: row._count._all })),
      failedActionsLast30Days: failures,
      openSecurityIncidents: incidents,
    };
  }

  // Reports

  reports(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'export reports');
    return GOVERNANCE_REPORTS;
  }

  async report(actor: AuthenticatedUser, key: string) {
    this.require(actor, GOVERNANCE_READERS, 'export reports');
    if (!GOVERNANCE_REPORTS.some((report) => report.key === key)) throw new NotFoundException('Report not found.');
    const country = this.country(actor);
    const content = await buildReport(this.prisma, key as GovernanceReportKey, country);
    await this.audit.recordActor(actor, { action: 'governance.report.export', resourceType: 'Report', resourceId: key, countryNodeId: country ?? undefined, metadata: { key, scope: country ?? 'ALL' } });
    return { fileName: `house-of-wealth-${key}-${new Date().toISOString().slice(0, 10)}.csv`, content };
  }

  // Risk register

  async risks(actor: AuthenticatedUser) {
    this.require(actor, RISK_READERS, 'see the risk register');
    const rows = await this.prisma.riskItem.findMany({ where: this.scope(actor), orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }], take: 500 });
    return rows.map((row) => ({ ...row, score: row.likelihood * row.impact }));
  }

  async saveRisk(actor: AuthenticatedUser, input: SaveRiskDto, id?: string) {
    this.require(actor, RISK_EDITORS, 'change the risk register');
    const data = { title: input.title, category: input.category, likelihood: input.likelihood, impact: input.impact, ownerName: input.ownerName, mitigation: input.mitigation ?? '', status: input.status ?? 'OPEN', reviewDue: input.reviewDue ? new Date(input.reviewDue) : null, updatedBy: actor.userId };
    let saved;
    if (id) {
      const existing = await this.prisma.riskItem.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Risk not found.');
      this.assertInScope(actor, existing.countryNodeId);
      saved = await this.prisma.riskItem.update({ where: { id }, data });
    } else {
      saved = await this.prisma.riskItem.create({ data: { ...data, countryNodeId: this.targetCountry(actor, input.countryNodeId), createdBy: actor.userId } });
    }
    await this.audit.recordActor(actor, { action: id ? 'governance.risk.update' : 'governance.risk.create', resourceType: 'RiskItem', resourceId: saved.id, countryNodeId: saved.countryNodeId, metadata: { ...data, reviewDue: data.reviewDue?.toISOString() ?? null } });
    return { ...saved, score: saved.likelihood * saved.impact };
  }

  // Incidents

  async incidents(actor: AuthenticatedUser) {
    this.require(actor, RISK_READERS, 'see incidents');
    return this.prisma.incident.findMany({ where: this.scope(actor), orderBy: [{ occurredAt: 'desc' }], take: 500 });
  }

  async createIncident(actor: AuthenticatedUser, input: CreateIncidentDto) {
    this.require(actor, RISK_EDITORS, 'report incidents');
    const entry: HistoryEntry = { at: new Date().toISOString(), by: actor.userId, byName: actor.name ?? actor.email ?? actor.userId, status: 'OPEN', note: 'Reported' };
    const incident = await this.prisma.incident.create({ data: { countryNodeId: this.targetCountry(actor, input.countryNodeId), title: input.title, category: input.category, severity: input.severity, description: input.description, occurredAt: new Date(input.occurredAt), reportedBy: actor.userId, history: [entry] as unknown as Prisma.InputJsonValue } });
    await this.audit.recordActor(actor, { action: 'governance.incident.create', resourceType: 'Incident', resourceId: incident.id, countryNodeId: incident.countryNodeId, metadata: { title: input.title, category: input.category, severity: input.severity } });
    return incident;
  }

  async updateIncident(actor: AuthenticatedUser, id: string, input: UpdateIncidentDto) {
    this.require(actor, RISK_EDITORS, 'update incidents');
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException('Incident not found.');
    this.assertInScope(actor, incident.countryNodeId);
    if (incident.status === 'CLOSED') throw new BadRequestException('This incident is closed.');
    const resolved = input.status === 'RESOLVED' || input.status === 'CLOSED';
    const history = [...((incident.history as unknown as HistoryEntry[]) ?? []), { at: new Date().toISOString(), by: actor.userId, byName: actor.name ?? actor.email ?? actor.userId, status: input.status, note: input.note }];
    const updated = await this.prisma.incident.update({ where: { id }, data: { status: input.status, history: history as unknown as Prisma.InputJsonValue, ...(resolved ? { resolution: input.note, resolvedAt: incident.resolvedAt ?? new Date() } : {}) } });
    await this.audit.recordActor(actor, { action: 'governance.incident.update', resourceType: 'Incident', resourceId: id, countryNodeId: incident.countryNodeId, metadata: { from: incident.status, to: input.status, note: input.note } });
    return updated;
  }

  // Fatwa repository

  async fatwas(actor: AuthenticatedUser) {
    this.require(actor, FATWA_READERS, 'see the fatwa repository');
    const country = this.country(actor);
    return this.prisma.fatwaResolution.findMany({ where: country ? { OR: [{ countryNodeId: country }, { countryNodeId: null }] } : {}, orderBy: [{ status: 'asc' }, { issuedOn: 'desc' }], take: 500 });
  }

  async saveFatwa(actor: AuthenticatedUser, input: SaveFatwaDto, id?: string) {
    this.require(actor, FATWA_EDITORS, 'record fatwas');
    // Only Super Admin records a resolution for every country; others record for their own.
    const countryNodeId = actor.role === 'Super Admin' ? input.countryNodeId || null : actor.countryNodeId;
    const data = { reference: input.reference, title: input.title, issuedBy: input.issuedBy, issuedOn: new Date(input.issuedOn), topic: input.topic.toUpperCase(), summary: input.summary, sourceUrl: input.sourceUrl || null, status: input.status ?? 'ACTIVE', countryNodeId };
    let saved;
    if (id) {
      const existing = await this.prisma.fatwaResolution.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Resolution not found.');
      if (actor.role !== 'Super Admin' && existing.countryNodeId !== actor.countryNodeId) throw new NotFoundException('Resolution not found.');
      saved = await this.prisma.fatwaResolution.update({ where: { id }, data });
    } else {
      saved = await this.prisma.fatwaResolution.create({ data: { ...data, recordedBy: actor.userId } });
    }
    await this.audit.recordActor(actor, { action: id ? 'governance.fatwa.update' : 'governance.fatwa.create', resourceType: 'FatwaResolution', resourceId: saved.id, countryNodeId: saved.countryNodeId ?? undefined, metadata: { reference: data.reference, title: data.title, status: data.status } });
    return saved;
  }

  // Read-only views of what the code enforces

  approvalMatrix(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the approval matrix');
    return approvalMatrix();
  }

  async fees(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the fee schedule');
    const pricing = await this.prisma.aiCapabilityPricing.findMany({ where: { enabled: true }, orderBy: { operationKey: 'asc' } });
    return {
      plans: PLANS.map((plan) => ({ id: plan.id, name: plan.name, monthlyPriceMYR: plan.monthlyPriceMYR, annualPriceMYR: plan.annualPriceMYR, aiCreditsMonthly: plan.aiCreditsMonthly, userSeats: plan.userSeats })),
      creditPackages: CREDIT_PACKAGES,
      aiOperations: pricing.length ? pricing.map((row) => ({ operationKey: row.operationKey, operationName: row.operationName, creditsRequired: row.creditsRequired })) : Object.entries(FALLBACK_PRICING).map(([operationKey, row]) => ({ operationKey, operationName: row.operationName, creditsRequired: row.creditsRequired })),
      promotionPackages: PROJECT_PROMOTION_PACKAGES,
      paymentGatewayFeeMYR: TOYYIBPAY_FPX_FEE_MYR,
      creditValueMYR: Number(process.env.MEMBERSHIP_CREDIT_VALUE_MYR) > 0 ? Number(process.env.MEMBERSHIP_CREDIT_VALUE_MYR) : 0.2,
    };
  }

  async countryRules(actor: AuthenticatedUser) {
    this.require(actor, GOVERNANCE_READERS, 'see the country rules');
    const country = this.country(actor);
    const [nodes, accounts] = await Promise.all([
      this.prisma.countryNode.findMany({ where: country ? { code: country } : {}, orderBy: { name: 'asc' }, select: { code: true, name: true, currency: true, regulatoryProfile: true, status: true } }),
      this.prisma.collectionAccount.findMany({ select: { countryNodeId: true, bankName: true } }),
    ]);
    const banks = new Map(accounts.map((account) => [account.countryNodeId, account.bankName]));
    let limitsError: string | null = null;
    const limits = (currency: string) => KYC_LEVELS.map((level) => {
      try {
        return { level, limit: kycInvestmentLimit(level, currency) };
      } catch (error) {
        if (error instanceof KycLimitsMisconfigured) { limitsError = 'KYC_INVESTMENT_LIMITS is not valid JSON, so new orders are refused.'; return { level, limit: null }; }
        throw error;
      }
    });
    const rows = nodes.map((node) => ({
      ...node,
      minSponsorContributionPct: minSponsorPct(node.code),
      kycLimits: limits(node.currency),
      collectionBank: banks.get(node.code) ?? null,
    }));
    return { countries: rows, requiredKybDocuments: REQUIRED_KYB_DOCUMENTS, limitsError };
  }
}

function scopeCountry(scope: { countryNodeId?: string }) {
  return scope.countryNodeId ?? null;
}
