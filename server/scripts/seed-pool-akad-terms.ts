import { Prisma, PrismaClient } from '@prisma/client';
import { AKAD_RULES, buildAkadTermsText, hashTerms, POOL_AKAD_TYPES, PoolAkadType } from '../src/pools/akad-terms';

/** Investor share of net profit used for the demo terms; within each akad's allowed range. */
const DEMO_INVESTOR_SHARE: Record<PoolAkadType, number> = { MUDARABAH: 70, MUSHARAKAH: 70, WAKALAH: 90, IJARAH: 90 };

function akadTypeFor(structure: string): PoolAkadType {
  const match = POOL_AKAD_TYPES.find((type) => AKAD_RULES[type].label.toLowerCase() === structure.toLowerCase() || structure.toUpperCase().startsWith(type));
  return match ?? 'MUDARABAH';
}

/**
 * Publishes version 1 of the akad terms for every pool that has none, so the demo investment
 * flow (accept terms, then place an order) works. Pools that already have terms are left alone.
 */
export async function seedPoolAkadTerms(prisma: PrismaClient): Promise<number> {
  const pools = await prisma.wealthPool.findMany({ where: { akadTerms: { none: {} } }, include: { project: { select: { projectName: true } } } });
  for (const pool of pools) {
    const akadType = akadTypeFor(pool.investmentStructure);
    const investorProfitSharePct = DEMO_INVESTOR_SHARE[akadType];
    const termsText = buildAkadTermsText({ akadType, investorProfitSharePct, version: 1, poolName: pool.poolName, projectName: pool.project?.projectName ?? pool.projectId, currency: pool.currency, indicativeExpectedReturn: Number(pool.indicativeExpectedReturn) });
    await prisma.poolAkadTerms.create({ data: { poolId: pool.poolId, version: 1, akadType, investorProfitSharePct: new Prisma.Decimal(investorProfitSharePct), termsText, termsHash: hashTerms(termsText), createdBy: 'SEED' } });
  }
  return pools.length;
}

// Run on its own against an existing database: npx tsx scripts/seed-pool-akad-terms.ts
if (require.main === module) {
  const prisma = new PrismaClient();
  seedPoolAkadTerms(prisma)
    .then((count) => console.log(`Published akad terms (version 1) for ${count} pool(s).`))
    .catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
}
