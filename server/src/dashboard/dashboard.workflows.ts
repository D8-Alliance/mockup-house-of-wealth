import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';

/** One workflow and how many records sit at each of its statuses. */
export interface WorkflowPipeline {
  key: string;
  label: string;
  stages: Array<{ status: string; count: number }>;
}

/**
 * Where the platform's records stand in each workflow, as the database has them: Super Admin across all
 * countries, a Country Admin in theirs. The stage order is each workflow's own, so empty stages still show.
 */
export async function workflowPipelines(prisma: PrismaService, actor: AuthenticatedUser): Promise<WorkflowPipeline[]> {
  const global = actor.role === 'Super Admin';
  const country = global ? {} : { countryNodeId: actor.countryNodeId };
  const count = (rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, field: string) => {
    const totals = new Map<string, number>();
    for (const row of rows) totals.set(String(row[field]), row._count._all);
    return totals;
  };
  const [projects, agreements, funding, orders, kyc, kyb, pdp] = await Promise.all([
    prisma.project.groupBy({ by: ['status'], where: country, _count: { _all: true } }),
    prisma.contract.groupBy({ by: ['status'], where: country, _count: { _all: true } }),
    prisma.fundingRequest.groupBy({ by: ['status'], where: country, _count: { _all: true } }),
    prisma.investmentOrder.groupBy({ by: ['status'], where: country, _count: { _all: true } }),
    prisma.kycApplication.groupBy({ by: ['status'], where: country, _count: { _all: true } }),
    prisma.organisation.groupBy({ by: ['kybStatus'], where: country, _count: { _all: true } }),
    prisma.pdpApplication.groupBy({ by: ['status'], where: global ? {} : { countryCode: actor.countryNodeId.replace(/^CN-/, '') }, _count: { _all: true } }),
  ]);

  const pipeline = (key: string, label: string, order: string[], totals: Map<string, number>): WorkflowPipeline => {
    // Statuses outside the known order (older data) are kept, after the known ones.
    const extra = [...totals.keys()].filter((status) => !order.includes(status));
    return { key, label, stages: [...order, ...extra].map((status) => ({ status, count: totals.get(status) ?? 0 })) };
  };

  return [
    pipeline('projects', 'Projects', ['DRAFT', 'SUBMITTED', 'DUE_DILIGENCE', 'APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'COMPLETED', 'REJECTED'], count(projects, 'status')),
    pipeline('agreements', 'Agreements', ['DRAFT', 'LEGAL_REVIEW', 'SHARIAH_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'EXECUTION'], count(agreements, 'status')),
    pipeline('orders', 'Investor orders', ['PENDING', 'SETTLED', 'CANCELLED'], count(orders, 'status')),
    pipeline('tranches', 'Tranche releases', ['PENDING', 'APPROVED', 'DISBURSED', 'REJECTED'], count(funding, 'status')),
    pipeline('kyc', 'Investor KYC', ['DRAFT', 'SUBMITTED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'], count(kyc, 'status')),
    pipeline('kyb', 'Organisation KYB', ['NOT_SUBMITTED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED'], count(kyb, 'kybStatus')),
    pipeline('pdp', 'PDP applications', ['DRAFT', 'SUBMITTED', 'ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED'], count(pdp, 'status')),
  ];
}
