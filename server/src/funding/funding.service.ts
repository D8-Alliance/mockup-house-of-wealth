import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { assertTenantScope, TenantResource } from '../tenancy/tenant-scope';
import { hasCurrentFinalApproval } from '../projects/project-lock';
import { advanceProjectStatus, RELEASABLE_PROJECT_STATUSES } from '../projects/project-status';
import { FinancialLedgerService } from '../financial/financial-ledger.service';
import { safeguardFacts } from '../capital-takaful/safeguard-facts';
import { proRataShares } from '../capital-takaful/safeguard-rules';

/** Approvers who check releases for every organisation of their country, never their own organisation's projects. */
const COUNTRY_APPROVER_ROLES = ['Finance Officer'];
/** Requests still to be decided or paid out; a tranche has at most one. */
const OPEN_REQUEST_STATUSES = ['PENDING', 'APPROVED'];

/**
 * Investors' money reaches the project tranche by tranche. The project side asks for one tranche once
 * the pool has raised the funding; Finance (or the Country Admin) approves it; another person, the
 * Country Admin, releases it, and only while the sponsor capital is deposited and the cover is in force.
 */
@Injectable()
export class FundingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
    private readonly ledger: FinancialLedgerService,
  ) {}

  async request(projectId: string, milestoneId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    this.assertProjectSponsorScope(user, project.projectSponsorId);
    if (!RELEASABLE_PROJECT_STATUSES.includes(project.status) || !(await hasCurrentFinalApproval(this.prisma, project))) {
      throw new BadRequestException('Tranches are released once the pool has raised the funding required (project FUNDED).');
    }
    const milestone = await this.prisma.projectMilestone.findFirst({ where: { id: milestoneId, projectId } });
    if (!milestone) throw new NotFoundException('Tranche not found on this project.');
    const amount = Number(milestone.disbursementAmount);
    if (amount <= 0) throw new BadRequestException('This milestone releases no funds.');
    const open = await this.prisma.fundingRequest.findFirst({ where: { milestoneId, status: { in: [...OPEN_REQUEST_STATUSES, 'DISBURSED'] } }, select: { status: true } });
    if (open) throw new ConflictException(open.status === 'DISBURSED' ? 'This tranche has already been released.' : `A release of this tranche is already ${open.status.toLowerCase()}.`);

    const pool = await this.prisma.wealthPool.findFirst({ where: { projectId }, orderBy: { createdAt: 'asc' } });
    if (!pool) throw new BadRequestException('Project has no wealth pool; launch the pool first.');

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fundingRequest.create({
        data: {
          projectId: project.projectId,
          poolId: pool.poolId,
          milestoneId,
          requestedAmount: milestone.disbursementAmount,
          currency: pool.currency,
          purpose: milestone.title,
          status: 'PENDING',
          requestedBy: user.userId,
          organisationId: project.organisationId,
          countryNodeId: project.countryNodeId,
        },
      });
      await this.audit.recordActor(user, { action: 'funding.request', resourceType: 'FundingRequest', resourceId: created.fundingRequestId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { milestoneId, purpose: milestone.title, requestedAmount: amount } }, tx);
      return created;
    });

    return { requestId: request.fundingRequestId, status: request.status };
  }

  /** What the approver has to act on: Finance approves new requests, the Country Admin also releases approved ones. */
  async queue(user: AuthenticatedUser) {
    const statuses = COUNTRY_APPROVER_ROLES.includes(user.role) ? ['PENDING'] : OPEN_REQUEST_STATUSES;
    const where = user.role === 'Super Admin' ? {} : { countryNodeId: user.countryNodeId, organisationId: { not: user.organisationId } };
    return this.prisma.fundingRequest.findMany({
      where: { ...where, status: { in: statuses } },
      orderBy: { requestedAt: 'asc' },
      take: 100,
      include: { project: { select: { projectName: true } }, milestone: { select: { title: true, targetDate: true } } },
    });
  }

  async approve(fundingRequestId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const request = await this.prisma.fundingRequest.findUnique({ where: { fundingRequestId } });
    if (!request) throw new NotFoundException('Funding request not found');
    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve a request in state "${request.status}"`);
    }
    this.assertApproverScope(user, request);
    if (!this.policy.can(user.role, 'approvals', 'approve')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'approvals', 'approve').reason);
    }
    // Segregation of duties: the person who asked for the money cannot approve it.
    if (request.requestedBy === user.userId) throw new ForbiddenException('You submitted this funding request, so another person must approve it.');

    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.fundingRequest.updateMany({ where: { fundingRequestId, status: 'PENDING' }, data: { status: 'APPROVED', approvedBy: user.userId, approvedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Funding request was already approved or changed state.');
      const result = await tx.fundingRequest.findUniqueOrThrow({ where: { fundingRequestId } });
      await this.audit.recordActor(user, { action: 'funding.approve', resourceType: 'FundingRequest', resourceId: fundingRequestId, organisationId: request.organisationId, countryNodeId: request.countryNodeId }, tx);
      return result;
    });

    return { requestId: fundingRequestId, status: updated.status };
  }

  /** Turns a request down before the money moves; the project side may ask again once it has fixed the reason. */
  async reject(fundingRequestId: string, note: string | undefined, user: AuthenticatedUser): Promise<{ requestId: string; status: string }> {
    const request = await this.prisma.fundingRequest.findUnique({ where: { fundingRequestId } });
    if (!request) throw new NotFoundException('Funding request not found');
    if (!OPEN_REQUEST_STATUSES.includes(request.status)) throw new BadRequestException(`Cannot reject a request in state "${request.status}"`);
    this.assertApproverScope(user, request);
    if (!this.policy.can(user.role, 'approvals', 'approve')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'approvals', 'approve').reason);
    }
    if (request.requestedBy === user.userId) throw new ForbiddenException('You submitted this funding request, so another person must decide on it.');
    const reason = note?.trim() ?? '';
    if (reason.length < 5) throw new BadRequestException('Say why the release is rejected, so the project can fix it.');
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.fundingRequest.updateMany({ where: { fundingRequestId, status: request.status }, data: { status: 'REJECTED', decisionNote: reason } });
      if (!claimed.count) throw new BadRequestException('Funding request changed state. Reload.');
      await this.audit.recordActor(user, { action: 'funding.reject', resourceType: 'FundingRequest', resourceId: fundingRequestId, organisationId: request.organisationId, countryNodeId: request.countryNodeId, metadata: { reason } }, tx);
    });
    return { requestId: fundingRequestId, status: 'REJECTED' };
  }

  async disburse(fundingRequestId: string, user: AuthenticatedUser): Promise<{ requestId: string; status: string; proRata: ReturnType<typeof proRataShares> | null }> {
    const request = await this.prisma.fundingRequest.findUnique({
      where: { fundingRequestId },
    });
    if (!request) throw new NotFoundException('Funding request not found');
    if (request.status !== 'APPROVED') {
      throw new BadRequestException(`Cannot disburse a request in state "${request.status}"`);
    }
    // Enforce tenant scope: only Super Admin crosses country/organisation boundaries
    assertTenantScope(user, request, 'Request');
    if (!this.policy.can(user.role, 'approvals', 'disburse')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'approvals', 'disburse').reason);
    }
    // Segregation of duties: neither the requester nor the approver releases the money.
    if (request.requestedBy === user.userId) throw new ForbiddenException('You submitted this funding request, so another person must disburse it.');
    if (request.approvedBy === user.userId) throw new ForbiddenException('You approved this funding request, so another person must disburse it.');

    const safeguards = await safeguardFacts(this.prisma, request.projectId);
    if (safeguards?.blockers.disburse.length) throw new BadRequestException(safeguards.blockers.disburse.join(' '));
    const amount = Number(request.requestedAmount);
    if (request.poolId) {
      // The pool can only pay out what investors' settled money holds, less earlier releases.
      const [raised, released] = await Promise.all([
        this.prisma.investmentContribution.aggregate({ _sum: { amount: true }, where: { poolId: request.poolId, status: 'POSTED' } }),
        this.prisma.fundingRequest.aggregate({ _sum: { requestedAmount: true }, where: { poolId: request.poolId, status: 'DISBURSED' } }),
      ]);
      const available = Number(raised._sum.amount ?? 0) - Number(released._sum.requestedAmount ?? 0);
      if (amount > available + 0.005) throw new BadRequestException(`The pool holds ${available.toFixed(2)} ${request.currency} of settled investment, less than this tranche.`);
    }
    const shares = safeguards ? proRataShares(amount, safeguards.capital.deposited, safeguards.fundingRequired) : null;
    const currency = request.currency;
    const poolAccount = await this.ledger.ensureAccount(user, { accountCode: `POOL-${request.poolId || request.projectId}-CASH-${currency}`, accountType: 'ASSET', ownerType: 'POOL', ownerId: request.poolId || request.projectId, organisationId: request.organisationId, countryNodeId: request.countryNodeId, currency });
    const projectAccount = await this.ledger.ensureAccount(user, { accountCode: `PROJECT-${request.projectId}-CASH-${currency}`, accountType: 'ASSET', ownerType: 'PROJECT', ownerId: request.projectId, organisationId: request.organisationId, countryNodeId: request.countryNodeId, currency });
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.fundingRequest.updateMany({ where: { fundingRequestId, status: 'APPROVED' }, data: { status: 'DISBURSED', disbursedBy: user.userId, disbursedAt: new Date() } });
      if (!claimed.count) throw new BadRequestException('Funding request was already disbursed or changed state.');
      await this.ledger.recordFundingDisbursementInTransaction(tx, user, { fundingRequestId, projectId: request.projectId, organisationId: request.organisationId, countryNodeId: request.countryNodeId, amount, currency, posting: { transactionType: 'FUNDING_DISBURSEMENT', referenceType: 'FundingRequest', referenceId: fundingRequestId, currency, description: `${request.purpose} (${request.projectId})`, idempotencyKey: `funding-disbursement:${fundingRequestId}`, entries: [{ accountId: projectAccount.id, direction: 'DEBIT', amount, description: 'Project funding received' }, { accountId: poolAccount.id, direction: 'CREDIT', amount, description: 'Pool funding disbursed' }] } });
      if (request.milestoneId) await tx.projectMilestone.update({ where: { id: request.milestoneId }, data: { status: 'RELEASED' } });
      await advanceProjectStatus(tx, request, ['FUNDED'], 'EXECUTION', user.userId, `First tranche released: ${request.purpose}.`);
      await this.audit.recordActor(user, { action: 'funding.disburse', resourceType: 'FundingRequest', resourceId: fundingRequestId, organisationId: request.organisationId, countryNodeId: request.countryNodeId, metadata: { milestoneId: request.milestoneId, amount, proRata: shares } }, tx);
      return tx.fundingRequest.findUniqueOrThrow({ where: { fundingRequestId } });
    });

    return { requestId: fundingRequestId, status: updated.status, proRata: shares };
  }

  async list(projectId: string, user: AuthenticatedUser): Promise<unknown[]> {
    const project = await this.prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    this.assertProjectSponsorScope(user, project.projectSponsorId);
    return this.prisma.fundingRequest.findMany({
      where: { projectId },
      orderBy: { requestedAt: 'desc' },
      include: { milestone: { select: { title: true } } },
    });
  }

  /**
   * Finance decides for any organisation of its country; others within their tenant. Nobody approves a
   * release for a project their own organisation runs, Super Admin aside.
   */
  private assertApproverScope(user: AuthenticatedUser, request: TenantResource) {
    if (COUNTRY_APPROVER_ROLES.includes(user.role)) {
      if (user.countryNodeId !== request.countryNodeId) throw new ForbiddenException('Request is outside your country.');
    } else {
      assertTenantScope(user, request, 'Request');
    }
    if (user.role !== 'Super Admin' && user.organisationId === request.organisationId) {
      throw new ForbiddenException('Your organisation runs this project, so someone outside it must decide on the release.');
    }
  }

  private assertProjectSponsorScope(user: AuthenticatedUser, projectSponsorId: string) {
    if (user.role === 'Project Sponsor' && projectSponsorId !== user.userId) {
      throw new ForbiddenException('Project is not assigned to this sponsor');
    }
  }
}
