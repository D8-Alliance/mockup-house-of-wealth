/**
 * Puts a baseline library of approved clauses and Shariah rules for Musharakah and Ijarah into one
 * country, so agreements can be drafted, reviewed and approved on staging. The texts are a starting
 * point: Legal and the Shariah adviser must review them before production.
 *
 *   npx tsx scripts/seed-contract-library.ts --org ORG-MYS-T9W0W5SS --by USR-SYS-002
 *
 * Options:
 *   --country  country node (default CN-MYS)
 *   --org      the organisation that owns the library entries (an administrative organisation)
 *   --by       the Member ID recorded as their author (e.g. the Super Admin)
 * Running it again adds nothing that is already there.
 */
import { PrismaClient } from '@prisma/client';

const args = Object.fromEntries(process.argv.slice(2).reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1] ?? '']] : pairs), []));

const CLAUSES: Array<{ contractType: string; clauseCategory: string; clauseTitle: string; clauseText: string; shariahReference: string; riskLevel: string }> = [
  { contractType: 'MUSHARAKAH', clauseCategory: 'Capital', clauseTitle: 'Capital contributions', clauseText: 'Each partner contributes the capital stated in Schedule 1. A contribution in kind is valued at the amount agreed by the partners on the basis of an independent valuation, and that value is the partner\'s capital.', shariahReference: 'AAOIFI Shariah Standard No. 12 (Sharikah), clause 3/1/2', riskLevel: 'HIGH' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Profit', clauseTitle: 'Profit sharing', clauseText: 'Profit is shared between the partners in the ratio stated in Schedule 1, as a share of actual distributable profit. No partner is entitled to a fixed amount or a percentage of capital.', shariahReference: 'AAOIFI Shariah Standard No. 12, clause 3/1/5', riskLevel: 'HIGH' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Loss', clauseTitle: 'Loss sharing by capital', clauseText: 'Losses are borne by the partners in proportion to their capital contributions. A partner bears a loss beyond its share only if caused by its own negligence, misconduct or breach of this agreement.', shariahReference: 'AAOIFI Shariah Standard No. 12, clause 3/1/5/4', riskLevel: 'HIGH' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Return', clauseTitle: 'No guaranteed return', clauseText: 'No partner guarantees the capital or any return of another partner. Any undertaking to pay a fixed return or to repay capital regardless of results is void.', shariahReference: 'AAOIFI Shariah Standard No. 12, clause 3/1/4/3', riskLevel: 'HIGH' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Management', clauseTitle: 'Management and reporting', clauseText: 'The managing partner runs the venture and keeps proper accounts, reporting to the other partner at least quarterly. Decisions on the contributed asset need the consent of the partner who contributed it.', shariahReference: 'AAOIFI Shariah Standard No. 12, clause 3/1/3', riskLevel: 'MEDIUM' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Exit', clauseTitle: 'Term, exit and dissolution', clauseText: 'The partnership ends on the date in Schedule 1 or earlier by mutual agreement. On dissolution, assets are valued, liabilities paid, and the remainder returned to the partners according to their capital shares. A contributed asset is returned to its contributor or bought by the other partner at its value then.', shariahReference: 'AAOIFI Shariah Standard No. 12, clause 3/1/6', riskLevel: 'MEDIUM' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Legal', clauseTitle: 'Governing law and disputes', clauseText: 'This agreement is governed by the laws of Malaysia. Disputes are first referred to amicable settlement, then to arbitration at the Asian International Arbitration Centre under its i-Arbitration Rules. Shariah questions are referred to the Shariah adviser.', shariahReference: 'Islamic Financial Services Act 2013', riskLevel: 'MEDIUM' },
  { contractType: 'MUSHARAKAH', clauseCategory: 'Legal', clauseTitle: 'Default and termination', clauseText: 'Either partner may terminate on a material breach not remedied within 30 days of written notice. Termination does not affect rights already accrued.', shariahReference: 'General contract principle', riskLevel: 'MEDIUM' },
  { contractType: 'IJARAH', clauseCategory: 'Ownership', clauseTitle: 'Ownership stays with the lessor', clauseText: 'The lessor keeps ownership of the asset throughout the lease and bears the risks of ownership, including major maintenance and takaful. The lessee pays rent for its use (usufruct).', shariahReference: 'AAOIFI Shariah Standard No. 9 (Ijarah), clause 5/1', riskLevel: 'HIGH' },
  { contractType: 'IJARAH', clauseCategory: 'Rent', clauseTitle: 'Rent', clauseText: 'The rent, its currency and payment dates are as stated in Schedule 1 and are known at signing. Rent for a later period may be reviewed only by a formula agreed at signing.', shariahReference: 'AAOIFI Shariah Standard No. 9, clause 5/2', riskLevel: 'HIGH' },
  { contractType: 'IJARAH', clauseCategory: 'Maintenance', clauseTitle: 'Maintenance and takaful', clauseText: 'Day-to-day upkeep is borne by the party stated in Schedule 1. Major maintenance and takaful of the asset are borne by the lessor.', shariahReference: 'AAOIFI Shariah Standard No. 9, clause 5/1/7', riskLevel: 'MEDIUM' },
  { contractType: 'IJARAH', clauseCategory: 'Late payment', clauseTitle: 'Late payment', clauseText: 'A lessee that pays late undertakes to pay a compensation of actual loss (ta\'widh) only; any further late-payment charge (gharamah) is paid to charity and is not income of the lessor.', shariahReference: 'BNM Late Payment Charges policy; AAOIFI Shariah Standard No. 3', riskLevel: 'MEDIUM' },
  { contractType: 'IJARAH', clauseCategory: 'Legal', clauseTitle: 'Governing law and disputes', clauseText: 'This agreement is governed by the laws of Malaysia. Disputes are first referred to amicable settlement, then to arbitration at the Asian International Arbitration Centre under its i-Arbitration Rules. Shariah questions are referred to the Shariah adviser.', shariahReference: 'Islamic Financial Services Act 2013', riskLevel: 'MEDIUM' },
  { contractType: 'IJARAH', clauseCategory: 'Legal', clauseTitle: 'Default and termination', clauseText: 'Either party may terminate on a material breach not remedied within 30 days of written notice. If the asset is destroyed without the lessee\'s fault, the lease ends and rent stops from that date.', shariahReference: 'AAOIFI Shariah Standard No. 9, clause 7', riskLevel: 'MEDIUM' },
];

const RULES: Array<{ contractType: string; ruleName: string; description: string; severity: string; validationLogic: string }> = [
  { contractType: 'MUSHARAKAH', ruleName: 'Profit as a ratio', description: 'Profit is shared as a ratio of actual profit, never a fixed amount or a percentage of capital.', severity: 'HIGH', validationLogic: 'profit sharing ratio' },
  { contractType: 'MUSHARAKAH', ruleName: 'Loss by capital', description: 'Losses are borne in proportion to capital contributions.', severity: 'HIGH', validationLogic: 'proportion to capital' },
  { contractType: 'MUSHARAKAH', ruleName: 'No guaranteed return', description: 'No partner guarantees another partner\'s capital or return.', severity: 'HIGH', validationLogic: 'no guaranteed return' },
  { contractType: 'MUSHARAKAH', ruleName: 'Valued contribution in kind', description: 'A contribution in kind is valued at an agreed value, ideally from an independent valuation.', severity: 'MEDIUM', validationLogic: 'agreed value' },
  { contractType: 'IJARAH', ruleName: 'Lessor keeps ownership risk', description: 'The lessor owns the asset and bears ownership risks, major maintenance and takaful.', severity: 'HIGH', validationLogic: 'ownership' },
  { contractType: 'IJARAH', ruleName: 'Known rent', description: 'The rent and the lease period are known and agreed at signing.', severity: 'HIGH', validationLogic: 'rent' },
  { contractType: 'IJARAH', ruleName: 'Late payment to charity', description: 'Late-payment charges beyond actual loss go to charity, not to the lessor.', severity: 'MEDIUM', validationLogic: 'charity' },
];

async function main() {
  const countryNodeId = args.country || 'CN-MYS';
  const organisationId = args.org?.trim();
  const createdBy = args.by?.trim();
  if (!organisationId || !createdBy) throw new Error('Required: --org (an administrative organisation) and --by (a Member ID). See the comment at the top of this script.');
  const prisma = new PrismaClient();
  try {
    const organisation = await prisma.organisation.findFirst({ where: { id: organisationId, countryNodeId }, select: { name: true } });
    if (!organisation) throw new Error(`Organisation ${organisationId} is not in ${countryNodeId}.`);
    if (!(await prisma.user.findUnique({ where: { id: createdBy }, select: { id: true } }))) throw new Error(`No user ${createdBy}.`);
    let clauses = 0;
    let rules = 0;
    for (const clause of CLAUSES) {
      const exists = await prisma.contractClause.findFirst({ where: { countryNodeId, contractType: clause.contractType, clauseTitle: clause.clauseTitle }, select: { id: true } });
      if (exists) continue;
      await prisma.contractClause.create({ data: { ...clause, organisationId, countryNodeId, jurisdiction: 'Malaysia', approvalStatus: 'APPROVED', createdBy } });
      clauses += 1;
    }
    for (const rule of RULES) {
      const exists = await prisma.shariahRule.findFirst({ where: { countryNodeId, contractType: rule.contractType, ruleName: rule.ruleName }, select: { id: true } });
      if (exists) continue;
      await prisma.shariahRule.create({ data: { ...rule, organisationId, countryNodeId, jurisdiction: 'Malaysia', approvalStatus: 'APPROVED', createdBy } });
      rules += 1;
    }
    console.log(`Added ${clauses} clauses and ${rules} Shariah rules for ${countryNodeId} under ${organisation.name}. Already there: ${CLAUSES.length - clauses} clauses, ${RULES.length - rules} rules.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
