import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Prisma, ProjectPerformanceReport } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { NotificationService } from '../notifications/notification.service';
import { INVESTOR_ROLES } from '../pools/pool-access';
import { PrismaService } from '../prisma.service';
import { ReviewPerformanceReportDto, SavePerformanceReportDto } from './performance-reports.dto';

/** The project's own organisation fills its reports. */
export const REPORT_WRITER_ROLES = ['Project Sponsor', 'Project Manager', 'Organization Admin'];
/** An independent auditor of the country verifies them (Super Admin may too), never for their own organisation. */
export const REPORT_VERIFIER_ROLES = ['Auditor', 'Super Admin'];
const EDITABLE = ['DRAFT', 'RETURNED'];

interface HistoryEntry { at: string; by: string; byName: string; action: string; note?: string }

/** First and last instant of a calendar quarter (UTC). */
export function quarterRange(year: number, quarter: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || ![1, 2, 3, 4].includes(quarter)) throw new BadRequestException('Choose a year and a quarter from 1 to 4.');
  return { from: new Date(Date.UTC(year, (quarter - 1) * 3, 1)), to: new Date(Date.UTC(year, quarter * 3, 1)) };
}

/** A quarter may be reported once it has ended. */
export function quarterEnded(year: number, quarter: number, now = new Date()) {
  return quarterRange(year, quarter).to <= now;
}

/**
 * Quarterly project performance reports: the PDP enters actual against projected figures and KPIs, an auditor
 * verifies or returns them, and verified reports are shown to the investors of the project's pools.
 */
@Injectable()
export class PerformanceReportsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, @Optional() private readonly notifications?: NotificationService) {}

  private async project(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { projectId }, select: { projectId: true, projectName: true, organisationId: true, countryNodeId: true, projectSponsorId: true } });
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  private isWriter(actor: AuthenticatedUser, project: { organisationId: string; projectSponsorId: string }) {
    if (!REPORT_WRITER_ROLES.includes(actor.role) || actor.organisationId !== project.organisationId) return false;
    return actor.role !== 'Project Sponsor' || actor.userId === project.projectSponsorId;
  }

  private isVerifier(actor: AuthenticatedUser, project: { organisationId: string; countryNodeId: string }) {
    if (!REPORT_VERIFIER_ROLES.includes(actor.role) || actor.organisationId === project.organisationId) return false;
    return actor.role === 'Super Admin' || actor.countryNodeId === project.countryNodeId;
  }

  private async holdsProject(actor: AuthenticatedUser, projectId: string) {
    if (!INVESTOR_ROLES.has(actor.role)) return false;
    return !!(await this.prisma.investmentOrder.findFirst({ where: { investorUserId: actor.userId, projectId, status: 'SETTLED' }, select: { id: true } }));
  }

  private entry(actor: AuthenticatedUser, action: string, note?: string): HistoryEntry {
    return { at: new Date().toISOString(), by: actor.userId, byName: actor.name || actor.email || actor.userId, action, ...(note ? { note } : {}) };
  }

  private view(report: ProjectPerformanceReport, projectName?: string) {
    const num = (value: Prisma.Decimal) => Number(value);
    return {
      ...report,
      projectName,
      revenueActual: num(report.revenueActual), revenueProjected: num(report.revenueProjected),
      costActual: num(report.costActual), costProjected: num(report.costProjected),
      profitDistributed: num(report.profitDistributed),
    };
  }

  /** The project's currency: its pools', or the country's when it has none yet. */
  private async currency(project: { projectId: string; countryNodeId: string }) {
    const pool = await this.prisma.wealthPool.findFirst({ where: { projectId: project.projectId }, select: { currency: true } });
    if (pool) return pool.currency;
    const country = await this.prisma.countryNode.findUnique({ where: { code: project.countryNodeId }, select: { currency: true } });
    return country?.currency ?? 'MYR';
  }

  /** Reports of a project: all of them for its PDP and verifiers, only verified ones for investors who hold it. */
  async list(actor: AuthenticatedUser, projectId: string) {
    const project = await this.project(projectId);
    const full = this.isWriter(actor, project) || this.isVerifier(actor, project);
    if (!full && !(await this.holdsProject(actor, projectId))) throw new ForbiddenException('You cannot see this project\'s reports.');
    const reports = await this.prisma.projectPerformanceReport.findMany({ where: { projectId, ...(full ? {} : { status: 'VERIFIED' }) }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] });
    return reports.map((report) => this.view(report, project.projectName));
  }

  async save(actor: AuthenticatedUser, projectId: string, year: number, quarter: number, input: SavePerformanceReportDto) {
    const project = await this.project(projectId);
    if (!this.isWriter(actor, project)) throw new ForbiddenException('Only the project\'s own organisation fills its reports.');
    quarterRange(year, quarter);
    if (!quarterEnded(year, quarter)) throw new BadRequestException('A quarter can be reported once it has ended.');
    const existing = await this.prisma.projectPerformanceReport.findUnique({ where: { projectId_year_quarter: { projectId, year, quarter } } });
    if (existing && !EDITABLE.includes(existing.status)) throw new ConflictException(existing.status === 'VERIFIED' ? 'This report is verified and can no longer change.' : 'This report is with the auditor.');
    const data = {
      revenueActual: input.revenueActual, revenueProjected: input.revenueProjected, costActual: input.costActual, costProjected: input.costProjected,
      milestonesOnTimePct: input.milestonesOnTimePct, budgetUsedPct: input.budgetUsedPct, shariahIncidents: input.shariahIncidents,
      auditFindings: input.auditFindings ?? '', commentary: input.commentary ?? '',
      sectorKpis: (input.sectorKpis ?? []) as unknown as Prisma.InputJsonValue,
    };
    const report = existing
      ? await this.prisma.projectPerformanceReport.update({ where: { id: existing.id }, data })
      : await this.prisma.projectPerformanceReport.create({ data: { ...data, projectId, year, quarter, organisationId: project.organisationId, countryNodeId: project.countryNodeId, currency: await this.currency(project) } });
    await this.audit.recordActor(actor, { action: 'project.performance_report.save', resourceType: 'ProjectPerformanceReport', resourceId: report.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId, year, quarter } });
    return this.view(report, project.projectName);
  }

  async submit(actor: AuthenticatedUser, projectId: string, year: number, quarter: number) {
    const project = await this.project(projectId);
    if (!this.isWriter(actor, project)) throw new ForbiddenException('Only the project\'s own organisation submits its reports.');
    const report = await this.prisma.projectPerformanceReport.findUnique({ where: { projectId_year_quarter: { projectId, year, quarter } } });
    if (!report) throw new NotFoundException('Save the report first.');
    if (!EDITABLE.includes(report.status)) throw new ConflictException('This report is already with the auditor or verified.');
    // Profit distributed comes from the platform's own distributions approved in the quarter, not from the PDP.
    const { from, to } = quarterRange(year, quarter);
    const distributed = await this.prisma.distribution.aggregate({ _sum: { totalAmount: true }, where: { projectId, currency: report.currency, status: { in: ['APPROVED', 'PROCESSING', 'PARTIALLY_SETTLED', 'SETTLED', 'POSTED'] }, approvedAt: { gte: from, lt: to } } });
    const history = [...((report.history as unknown as HistoryEntry[]) ?? []), this.entry(actor, report.status === 'RETURNED' ? 'RESUBMITTED' : 'SUBMITTED')];
    const claimed = await this.prisma.projectPerformanceReport.updateMany({ where: { id: report.id, status: report.status }, data: { status: 'SUBMITTED', submittedBy: actor.userId, submittedAt: new Date(), profitDistributed: distributed._sum.totalAmount ?? 0, history: history as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new ConflictException('The report changed meanwhile. Reload and try again.');
    await this.audit.recordActor(actor, { action: 'project.performance_report.submit', resourceType: 'ProjectPerformanceReport', resourceId: report.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId, year, quarter } });
    await this.notifications?.notifyRoles(['Auditor'], { countryNodeId: project.countryNodeId }, {
      type: 'REVIEW', title: 'Performance report to verify',
      message: `${project.projectName}: the Q${quarter} ${year} performance report is waiting for an auditor.`,
      resourceType: 'ProjectPerformanceReport', resourceId: report.id, dedupeKey: `performance-report-submitted:${report.id}:${history.length}`,
    }, actor.userId);
    return this.view((await this.prisma.projectPerformanceReport.findUniqueOrThrow({ where: { id: report.id } })), project.projectName);
  }

  /** Reports waiting for an auditor of the actor's country (all countries for Super Admin). */
  async queue(actor: AuthenticatedUser) {
    if (!REPORT_VERIFIER_ROLES.includes(actor.role)) throw new ForbiddenException('Only auditors verify performance reports.');
    const reports = await this.prisma.projectPerformanceReport.findMany({ where: { status: 'SUBMITTED', organisationId: { not: actor.organisationId }, ...(actor.role === 'Super Admin' ? {} : { countryNodeId: actor.countryNodeId }) }, orderBy: { submittedAt: 'asc' }, take: 200 });
    const names = new Map((await this.prisma.project.findMany({ where: { projectId: { in: reports.map((report) => report.projectId) } }, select: { projectId: true, projectName: true } })).map((project) => [project.projectId, project.projectName]));
    return reports.map((report) => this.view(report, names.get(report.projectId)));
  }

  async review(actor: AuthenticatedUser, reportId: string, input: ReviewPerformanceReportDto) {
    const report = await this.prisma.projectPerformanceReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found.');
    const project = await this.project(report.projectId);
    if (!this.isVerifier(actor, project)) throw new ForbiddenException('Only an auditor of the project\'s country, from another organisation, verifies this report.');
    if (report.status !== 'SUBMITTED') throw new BadRequestException('This report is not waiting for verification.');
    const verified = input.decision === 'VERIFY';
    const history = [...((report.history as unknown as HistoryEntry[]) ?? []), this.entry(actor, verified ? 'VERIFIED' : 'RETURNED', input.note)];
    const claimed = await this.prisma.projectPerformanceReport.updateMany({
      where: { id: reportId, status: 'SUBMITTED' },
      data: { status: verified ? 'VERIFIED' : 'RETURNED', reviewNote: input.note, history: history as unknown as Prisma.InputJsonValue, ...(verified ? { verifiedBy: actor.userId, verifiedAt: new Date() } : {}) },
    });
    if (!claimed.count) throw new ConflictException('Someone already decided this. Reload to see the decision.');
    await this.audit.recordActor(actor, { action: verified ? 'project.performance_report.verify' : 'project.performance_report.return', resourceType: 'ProjectPerformanceReport', resourceId: reportId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { projectId: project.projectId, year: report.year, quarter: report.quarter, note: input.note } });
    const label = `Q${report.quarter} ${report.year}`;
    if (report.submittedBy) {
      await this.notifications?.notifyUsers([report.submittedBy], {
        type: 'REVIEW', title: verified ? 'Performance report verified' : 'Performance report returned',
        message: verified ? `${project.projectName}: the ${label} report is verified and now visible to investors.` : `${project.projectName}: the auditor returned the ${label} report: ${input.note}`,
        resourceType: 'ProjectPerformanceReport', resourceId: reportId, dedupeKey: `performance-report-decided:${reportId}:${history.length}`,
      });
    }
    if (verified) {
      const holders = await this.prisma.investmentOrder.findMany({ where: { projectId: project.projectId, status: 'SETTLED' }, select: { investorUserId: true }, distinct: ['investorUserId'] });
      if (holders.length) {
        await this.notifications?.notifyUsers(holders.map((holder) => holder.investorUserId), {
          type: 'INVESTMENT', title: 'New project performance report',
          message: `${project.projectName}: the verified ${label} performance report is in Investments.`,
          resourceType: 'ProjectPerformanceReport', resourceId: reportId, dedupeKey: `performance-report-published:${reportId}`,
        });
      }
    }
    return this.view(await this.prisma.projectPerformanceReport.findUniqueOrThrow({ where: { id: reportId } }), project.projectName);
  }

  /** Verified reports of every project the investor holds, newest first. */
  async forInvestor(actor: AuthenticatedUser) {
    if (!INVESTOR_ROLES.has(actor.role)) throw new ForbiddenException('These reports are for investor accounts.');
    const held = await this.prisma.investmentOrder.findMany({ where: { investorUserId: actor.userId, status: 'SETTLED' }, select: { projectId: true }, distinct: ['projectId'] });
    const projectIds = held.map((row) => row.projectId);
    if (!projectIds.length) return [];
    const [reports, projects] = await Promise.all([
      this.prisma.projectPerformanceReport.findMany({ where: { projectId: { in: projectIds }, status: 'VERIFIED' }, orderBy: [{ year: 'desc' }, { quarter: 'desc' }] }),
      this.prisma.project.findMany({ where: { projectId: { in: projectIds } }, select: { projectId: true, projectName: true } }),
    ]);
    const names = new Map(projects.map((project) => [project.projectId, project.projectName]));
    // Investors see the figures and the auditor's sign-off, not the internal history.
    return reports.map((report) => ({ ...this.view(report, names.get(report.projectId)), history: [], submittedBy: null, verifiedBy: null }));
  }
}
