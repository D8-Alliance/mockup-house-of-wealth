import { PrismaService } from '../prisma.service';
import { EngagementTerms, offerMetrics } from '../asset-partnerships/asset-partnership-rules';
import { coverStatus, fundingBlockers, minSponsorPct, sponsorCapital, takafulRequirements } from './safeguard-rules';

/** Partnerships whose terms both sides accepted: their assets need cover and count in the capital structure. */
const AGREED = ['ACCEPTED', 'APPROVED'];

/**
 * Everything the capital and takaful conditions depend on, for one project: used by the project screen,
 * the roadmap, opening a pool and releasing funds, so they all judge the same facts.
 */
export async function safeguardFacts(prisma: PrismaService, projectId: string, now = new Date()) {
  const project = await prisma.project.findUnique({
    where: { projectId },
    select: { projectId: true, organisationId: true, countryNodeId: true, totalProjectCost: true, fundingRequired: true, hasSiteWork: true, hasWorkers: true, countryNode: { select: { currency: true } } },
  });
  if (!project) return null;
  const [commitments, engagements, policies, tranches] = await Promise.all([
    prisma.projectCapitalCommitment.findMany({ where: { projectId }, select: { source: true, amount: true, status: true } }),
    prisma.assetEngagement.findMany({
      where: { projectId, status: { in: AGREED } },
      select: { id: true, akad: true, terms: true, startDate: true, endDate: true, asset: { select: { id: true, assetType: true, name: true, estimatedValue: true, organisation: { select: { name: true } } } } },
    }),
    prisma.takafulPolicy.findMany({ where: { projectId }, select: { id: true, coverType: true, assetId: true, sumCovered: true, startDate: true, endDate: true, status: true } }),
    prisma.projectMilestone.aggregate({ where: { projectId }, _sum: { disbursementAmount: true } }),
  ]);
  const currency = project.countryNode?.currency ?? 'MYR';
  const totalProjectCost = Number(project.totalProjectCost);
  const capital = sponsorCapital(commitments.map((item) => ({ source: item.source, amount: Number(item.amount), status: item.status })), totalProjectCost, minSponsorPct(project.countryNodeId));
  const assets = engagements.map((engagement) => {
    const terms = (engagement.terms ?? {}) as EngagementTerms;
    // Under Musharakah the agreed value is what the asset is worth to the partnership; otherwise its estimated value.
    const value = engagement.akad === 'MUSHARAKAH' && terms.contributionValue ? terms.contributionValue : Number(engagement.asset.estimatedValue);
    return { assetId: engagement.asset.id, assetType: engagement.asset.assetType, name: engagement.asset.name, value, akad: engagement.akad, ownerName: engagement.asset.organisation.name, engagementId: engagement.id, terms, startDate: engagement.startDate, endDate: engagement.endDate };
  });
  const requirements = takafulRequirements({ assets, hasSiteWork: project.hasSiteWork, hasWorkers: project.hasWorkers });
  const cover = coverStatus(requirements, policies.map((policy) => ({ ...policy, sumCovered: Number(policy.sumCovered) })), now);
  const facts = { capital, cover, currency };
  // Sources and uses: what pays for the project, and what the money is for.
  const inKind = assets.filter((asset) => asset.akad === 'MUSHARAKAH').map((asset) => ({ engagementId: asset.engagementId, assetName: asset.name, ownerName: asset.ownerName, value: asset.value }));
  const pdpCash = assets.filter((asset) => asset.akad === 'MUSHARAKAH').reduce((sum, asset) => sum + (asset.terms.pdpContributionValue ?? 0), 0);
  const rent = assets.filter((asset) => asset.akad === 'IJARAH').map((asset) => ({ engagementId: asset.engagementId, assetName: asset.name, ownerName: asset.ownerName, total: offerMetrics('IJARAH', asset.terms, asset.startDate, asset.endDate, null, null).totalRent ?? 0 }));
  return {
    projectId, currency, totalProjectCost, fundingRequired: Number(project.fundingRequired), hasSiteWork: project.hasSiteWork, hasWorkers: project.hasWorkers,
    capital, inKind, pdpCash, rent, allocatedToTranches: Number(tranches._sum.disbursementAmount ?? 0),
    cover,
    blockers: { pool: fundingBlockers('POOL', facts), disburse: fundingBlockers('DISBURSE', facts) },
  };
}

export type SafeguardFacts = NonNullable<Awaited<ReturnType<typeof safeguardFacts>>>;
