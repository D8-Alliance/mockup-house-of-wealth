import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { Prisma } from '@prisma/client';
import { CreatePoolDto, SetAkadTermsDto } from './pools.dto';
import { AKAD_RULES, buildAkadTermsText, hashTerms, PoolAkadType, validateProfitShare } from './akad-terms';
import { assertTenantScope } from '../tenancy/tenant-scope';
import { assertCanViewPool, poolVisibilityFilter } from './pool-access';
import { FUNDABLE_PROJECT_STATUSES, hasCurrentFinalApproval } from '../projects/project-lock';
import { safeguardFacts } from '../capital-takaful/safeguard-facts';

export const POOL_SIGN_OFF_STEPS = ['shariah', 'compliance', 'risk', 'authorised'] as const;
export type PoolSignOffStep = (typeof POOL_SIGN_OFF_STEPS)[number];

@Injectable()
export class PoolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    const where = poolVisibilityFilter(user);
    if (user.role !== 'Super Admin' && !this.policy.can(user.role, 'pooling', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'pooling', 'read').reason);
    }
    const pools = await this.prisma.wealthPool.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100, include: { project: { select: { projectName: true, fundingRequired: true } } } });
    // What each pool has raised: investor money Finance has settled (posted contributions).
    const raised = pools.length ? await this.prisma.investmentContribution.groupBy({ by: ['poolId'], where: { poolId: { in: pools.map((pool) => pool.poolId) }, status: 'POSTED' }, _sum: { amount: true } }) : [];
    const raisedByPool = new Map(raised.map((row) => [row.poolId, Number(row._sum.amount || 0)]));
    return pools.map(({ project, ...pool }) => ({ ...pool, projectName: project.projectName, targetAmount: Number(project.fundingRequired), raisedAmount: raisedByPool.get(pool.poolId) ?? 0 }));
  }

  async get(id: string, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id }, include: { project: { select: { fundingRequired: true } } } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertCanViewPool(user, pool);
    const [raised, akadTerms] = await Promise.all([
      this.prisma.investmentContribution.aggregate({ _sum: { amount: true }, where: { poolId: id, status: 'POSTED' } }),
      this.currentTerms(this.prisma, id),
    ]);
    return { ...pool, raisedAmount: Number(raised._sum.amount || 0), targetAmount: Number(pool.project.fundingRequired), akadTerms };
  }

  async akadTerms(id: string, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertCanViewPool(user, pool);
    const versions = await this.prisma.poolAkadTerms.findMany({ where: { poolId: id }, orderBy: { version: 'desc' } });
    return { current: versions[0] ?? null, versions };
  }

  /**
   * Publishes a new version of the pool's akad terms. Once an investor has accepted the
   * current version, the terms are fixed: changing the ratio afterwards would change a
   * contract the investor already agreed to.
   */
  async setAkadTerms(id: string, input: SetAkadTermsDto, user: AuthenticatedUser) {
    const invalid = validateProfitShare(input.akadType, input.investorProfitSharePct);
    if (invalid) throw new BadRequestException(invalid);
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id }, include: { project: { select: { projectName: true } } } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    if (!['DRAFT', 'APPROVED', 'OPEN', 'PAUSED'].includes(pool.status)) throw new BadRequestException('Akad terms can only be set before the pool is full or closed.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "poolId" FROM "WealthPool" WHERE "poolId" = ${id} FOR UPDATE`;
      const current = await this.currentTerms(tx, id);
      if (current && await tx.investmentOrder.count({ where: { akadTermsId: current.id, status: { not: 'CANCELLED' } } })) {
        throw new ConflictException('Investors have already accepted the current akad terms; they cannot be changed.');
      }
      const terms = await this.publishTerms(tx, user, { poolId: id, version: (current?.version ?? 0) + 1, akadType: input.akadType, investorProfitSharePct: input.investorProfitSharePct, poolName: pool.poolName, projectName: pool.project.projectName, currency: pool.currency, indicativeExpectedReturn: Number(pool.indicativeExpectedReturn) });
      await tx.wealthPool.update({ where: { poolId: id }, data: { investmentStructure: AKAD_RULES[input.akadType].label } });
      await this.audit.recordActor(user, { action: 'pool.akad_terms.publish', resourceType: 'WealthPool', resourceId: id, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { termsId: terms.id, version: terms.version, akadType: terms.akadType, investorProfitSharePct: input.investorProfitSharePct, termsHash: terms.termsHash, previousVersion: current?.version ?? null } }, tx);
      return terms;
    });
  }

  private currentTerms(client: Prisma.TransactionClient | PrismaService, poolId: string) {
    return client.poolAkadTerms.findFirst({ where: { poolId }, orderBy: { version: 'desc' } });
  }

  private publishTerms(tx: Prisma.TransactionClient, user: AuthenticatedUser, input: { poolId: string; version: number; akadType: PoolAkadType; investorProfitSharePct: number; poolName: string; projectName: string; currency: string; indicativeExpectedReturn: number }) {
    const termsText = buildAkadTermsText(input);
    return tx.poolAkadTerms.create({ data: { poolId: input.poolId, version: input.version, akadType: input.akadType, investorProfitSharePct: new Prisma.Decimal(input.investorProfitSharePct), termsText, termsHash: hashTerms(termsText), createdBy: user.userId } });
  }

  async transitionStatus(id: string, status: 'OPEN' | 'PAUSED' | 'FULL' | 'CLOSED', user: AuthenticatedUser, note?: string) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    const allowed: Record<string, string[]> = { OPEN: ['PAUSED', 'FULL', 'CLOSED'], PAUSED: ['OPEN', 'CLOSED'], FULL: ['CLOSED'], CLOSED: [] };
    if (!allowed[pool.status]?.includes(status)) throw new BadRequestException(`Pool cannot transition from ${pool.status} to ${status}`);
    const updated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.wealthPool.updateMany({ where: { poolId: id, status: pool.status }, data: { status } });
      if (!claimed.count) throw new BadRequestException('Pool status changed concurrently.');
      const result = await tx.wealthPool.findUniqueOrThrow({ where: { poolId: id } });
      await this.audit.recordActor(user, { action: 'pool.status_change', resourceType: 'WealthPool', resourceId: id, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { fromStatus: pool.status, toStatus: status, note: note || null } }, tx);
      return result;
    });
    return updated;
  }

  /**
   * Records one governance sign-off on a DRAFT pool. Once Shariah, compliance, risk and the
   * authorised executive have all signed, the pool becomes APPROVED and can be opened.
   */
  async signOff(id: string, step: PoolSignOffStep, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    if (pool.status !== 'DRAFT') throw new BadRequestException(`Only a DRAFT pool takes sign-offs; this pool is ${pool.status}.`);
    if (pool[`${step}ApprovedAt`]) return pool;
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.wealthPool.updateMany({
        where: { poolId: id, status: 'DRAFT', [`${step}ApprovedAt`]: null },
        data: { [`${step}ApprovedBy`]: user.name, [`${step}ApprovedAt`]: new Date() },
      });
      if (!claimed.count) throw new ConflictException('The pool changed while you were signing; reload and try again.');
      let result = await tx.wealthPool.findUniqueOrThrow({ where: { poolId: id } });
      const allSigned = POOL_SIGN_OFF_STEPS.every((item) => result[`${item}ApprovedAt`]);
      if (allSigned) result = await tx.wealthPool.update({ where: { poolId: id }, data: { status: 'APPROVED' } });
      await this.audit.recordActor(user, { action: 'pool.sign_off', resourceType: 'WealthPool', resourceId: id, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { step, status: result.status } }, tx);
      return result;
    });
  }

  /** Opens an APPROVED pool for investor subscriptions. */
  async open(id: string, user: AuthenticatedUser) {
    const pool = await this.prisma.wealthPool.findUnique({ where: { poolId: id } });
    if (!pool) throw new NotFoundException('Pool not found');
    assertTenantScope(user, pool, 'Pool');
    if (pool.status !== 'APPROVED') throw new BadRequestException('Pool cannot be opened until all governance sign-offs are complete.');
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.wealthPool.updateMany({ where: { poolId: id, status: 'APPROVED' }, data: { status: 'OPEN' } });
      if (!claimed.count) throw new BadRequestException('Pool status changed concurrently.');
      await this.audit.recordActor(user, { action: 'pool.status_change', resourceType: 'WealthPool', resourceId: id, organisationId: pool.organisationId, countryNodeId: pool.countryNodeId, metadata: { fromStatus: 'APPROVED', toStatus: 'OPEN', note: null } }, tx);
      return tx.wealthPool.findUniqueOrThrow({ where: { poolId: id } });
    });
  }

  async create(dto: CreatePoolDto, user: AuthenticatedUser) {
    assertTenantScope(user, { countryNodeId: dto.countryNodeId, organisationId: dto.organisationId }, 'Target tenant');
    const invalidShare = validateProfitShare(dto.akadType, dto.investorProfitSharePct);
    if (invalidShare) throw new BadRequestException(invalidShare);

    const [organisation, project] = await Promise.all([
      this.prisma.organisation.findFirst({
        where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
        select: { id: true, name: true },
      }),
      this.prisma.project.findUnique({
        where: { projectId: dto.projectId },
        select: { projectId: true, projectName: true, organisationId: true, countryNodeId: true, status: true },
      }),
    ]);
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }
    if (!project) throw new NotFoundException('Project not found');
    if (project.organisationId !== dto.organisationId || project.countryNodeId !== dto.countryNodeId) {
      throw new ForbiddenException('Project is outside the requested tenant scope');
    }
    if (!FUNDABLE_PROJECT_STATUSES.includes(project.status) || !(await hasCurrentFinalApproval(this.prisma, project))) throw new BadRequestException('Pooling requires an approved current feasibility revision and project status.');
    // The project's organisation delivers it: it must be an approved delivery partner (PDP) before investors are invited.
    const pdp = await this.prisma.pdpApplication.findFirst({ where: { status: { in: ['APPROVED', 'ACTIVE'] }, OR: [{ organisationId: project.organisationId }, { organisationId: null, organisationName: { equals: organisation.name ?? '', mode: 'insensitive' } }] }, select: { id: true } });
    if (!pdp) throw new BadRequestException(`${organisation.name ?? 'The organisation'} must be an approved delivery partner (PDP) before it launches a pool.`);
    const safeguards = await safeguardFacts(this.prisma, project.projectId);
    if (safeguards?.blockers.pool.length) throw new BadRequestException(safeguards.blockers.pool.join(' '));

    const pool = await this.prisma.$transaction(async (tx) => {
      const created = await tx.wealthPool.create({
        data: {
          poolName: dto.poolName,
          currency: dto.currency,
          investmentStructure: dto.investmentStructure || AKAD_RULES[dto.akadType].label,
          indicativeExpectedReturn: dto.indicativeExpectedReturn,
          // Governance signs off before investors see it (see signOff and open).
          status: 'DRAFT',
          projectId: dto.projectId,
          organisationId: dto.organisationId,
          countryNodeId: dto.countryNodeId,
        },
      });
      // The akad is fixed before the pool takes any investment.
      const terms = await this.publishTerms(tx, user, { poolId: created.poolId, version: 1, akadType: dto.akadType, investorProfitSharePct: dto.investorProfitSharePct, poolName: created.poolName, projectName: project.projectName, currency: created.currency, indicativeExpectedReturn: dto.indicativeExpectedReturn });
      await this.audit.recordActor(user, { action: 'pool.create', resourceType: 'WealthPool', resourceId: created.poolId, organisationId: dto.organisationId, countryNodeId: dto.countryNodeId, metadata: { poolName: created.poolName, akadType: dto.akadType, investorProfitSharePct: dto.investorProfitSharePct, termsId: terms.id, termsHash: terms.termsHash } }, tx);
      return { ...created, akadTerms: terms };
    });

    return pool;
  }
}
