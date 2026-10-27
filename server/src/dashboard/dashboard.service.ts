import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { PROJECT_REVIEWER_ROLES, tenantScopeFilter } from '../tenancy/tenant-scope';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly policy: PolicyService) {}

  async summary(actor: AuthenticatedUser) {
    if (actor.role !== 'Super Admin' && !this.policy.can(actor.role, 'dashboard', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(actor.role, 'dashboard', 'read').reason);
    }

    const scope = tenantScopeFilter(actor);
    // Reviewers count what they review: the submitted projects of their country, and its pools and contracts.
    const reviewer = PROJECT_REVIEWER_ROLES.includes(actor.role);
    const projectScope = reviewer ? { countryNodeId: actor.countryNodeId, OR: [{ organisationId: actor.organisationId }, { status: { not: 'DRAFT' } }] } : scope;
    const countryScope = reviewer ? { countryNodeId: actor.countryNodeId } : scope;
    const country = await this.prisma.countryNode.findUnique({ where: { code: actor.countryNodeId }, select: { currency: true } });
    const [projects, pools, contracts, funding] = await Promise.all([
      this.prisma.project.aggregate({ where: projectScope, _count: { _all: true }, _sum: { totalProjectCost: true, fundingRequired: true } }),
      this.prisma.wealthPool.count({ where: countryScope }),
      this.prisma.contract.count({ where: countryScope }),
      this.prisma.fundingRequest.aggregate({ where: countryScope, _sum: { requestedAmount: true }, _count: { _all: true } }),
    ]);

    return {
      source: 'database',
      scope: reviewer ? countryScope : scope,
      currency: country?.currency ?? 'USD',
      projectCount: projects._count._all,
      totalProjectValue: Number(projects._sum.totalProjectCost || 0),
      fundingRequired: Number(projects._sum.fundingRequired || 0),
      activePoolCount: pools,
      contractCount: contracts,
      fundingRequestCount: funding._count._all,
      fundingRequested: Number(funding._sum.requestedAmount || 0),
    };
  }
}
