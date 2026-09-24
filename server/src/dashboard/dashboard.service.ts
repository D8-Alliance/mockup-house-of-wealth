import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { tenantScopeFilter } from '../tenancy/tenant-scope';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, private readonly policy: PolicyService) {}

  async summary(actor: AuthenticatedUser) {
    if (actor.role !== 'Super Admin' && !this.policy.can(actor.role, 'dashboard', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(actor.role, 'dashboard', 'read').reason);
    }

    const scope = tenantScopeFilter(actor);
    const [projects, pools, contracts, funding] = await Promise.all([
      this.prisma.project.aggregate({ where: scope, _count: { _all: true }, _sum: { totalProjectCost: true, fundingRequired: true } }),
      this.prisma.wealthPool.count({ where: scope }),
      this.prisma.contract.count({ where: scope }),
      this.prisma.fundingRequest.aggregate({ where: scope, _sum: { requestedAmount: true }, _count: { _all: true } }),
    ]);

    return {
      source: 'database',
      scope,
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
