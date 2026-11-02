import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Removes a test project, or takes it out of every list when it cannot be removed:
 *
 *   npx tsx scripts/delete-test-project.ts --find "Biochar"            list matching projects and their ids
 *   npx tsx scripts/delete-test-project.ts <projectId>                 show what would happen (nothing is changed)
 *   npx tsx scripts/delete-test-project.ts <projectId> --confirm --by USR-SYS-002 --reason "Test data"
 *
 * A project whose pools have akad terms, or whose money went through the ledger, cannot be deleted:
 * those tables are append-only by database trigger (the record of what investors agreed to and of
 * every movement of money), and this script never switches the triggers off. Such a project is
 * archived instead: pending orders are cancelled, its pools are closed, and it disappears from every
 * project and pool list and dashboard, while its records stay. Everything happens in one transaction
 * and is written to the audit log.
 */
const OPEN_POOL_STATUSES = ['DRAFT', 'APPROVED', 'OPEN', 'PAUSED', 'FULL'];

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : undefined;
}

async function find(prisma: PrismaClient, text: string) {
  const rows = await prisma.project.findMany({ where: { OR: [{ projectName: { contains: text, mode: 'insensitive' } }, { projectCode: { contains: text, mode: 'insensitive' } }] }, select: { projectId: true, projectCode: true, projectName: true, status: true, countryNodeId: true, archivedAt: true, createdAt: true }, orderBy: { createdAt: 'asc' } });
  if (!rows.length) console.log(`No project matches "${text}".`);
  for (const row of rows) console.log(`${row.projectId}  ${row.projectCode}  ${row.status}${row.archivedAt ? ' (archived)' : ''}  ${row.countryNodeId}  ${row.createdAt.toISOString().slice(0, 10)}  ${row.projectName}`);
}

/** Every record of the project, and which of them are append-only. */
async function inventory(prisma: PrismaClient, projectId: string) {
  const pools = await prisma.wealthPool.findMany({ where: { projectId }, select: { poolId: true, poolName: true, status: true } });
  const poolIds = pools.map((pool) => pool.poolId);
  const engagements = await prisma.assetEngagement.findMany({ where: { projectId }, select: { id: true } });
  const accountCodes = [...poolIds.map((id) => `POOL-${id}-`), `PROJECT-${projectId}-`];
  const accounts = await prisma.financialAccount.findMany({ where: { OR: accountCodes.map((prefix) => ({ accountCode: { startsWith: prefix } })) }, select: { id: true, accountCode: true } });
  const [akadTerms, ledgerTransactions, orders, contributions, fundingRequests, disbursements, distributions, needs, contracts, commitments, takaful, shariah] = await Promise.all([
    prisma.poolAkadTerms.count({ where: { poolId: { in: poolIds } } }),
    accounts.length ? prisma.ledgerTransaction.count({ where: { entries: { some: { accountId: { in: accounts.map((account) => account.id) } } } } }) : 0,
    prisma.investmentOrder.groupBy({ by: ['status'], where: { projectId }, _count: { _all: true } }),
    prisma.investmentContribution.count({ where: { projectId } }),
    prisma.fundingRequest.count({ where: { projectId } }),
    prisma.fundingDisbursement.count({ where: { projectId } }),
    prisma.distribution.count({ where: { projectId } }),
    prisma.projectAssetNeed.count({ where: { projectId } }),
    engagements.length ? prisma.contract.count({ where: { engagementId: { in: engagements.map((engagement) => engagement.id) } } }) : 0,
    prisma.projectCapitalCommitment.count({ where: { projectId } }),
    prisma.takafulPolicy.count({ where: { projectId } }),
    prisma.shariahReview.count({ where: { projectId } }),
  ]);
  return { pools, poolIds, engagements, accounts, akadTerms, ledgerTransactions, orders, contributions, fundingRequests, disbursements, distributions, needs, contracts, commitments, takaful, shariah };
}

async function remove(tx: Prisma.TransactionClient, projectId: string, poolIds: string[], engagementIds: string[]) {
  const distributionIds = (await tx.distribution.findMany({ where: { projectId }, select: { id: true } })).map((row) => row.id);
  const allocationIds = (await tx.distributionAllocation.findMany({ where: { distributionId: { in: distributionIds } }, select: { id: true } })).map((row) => row.id);
  const payoutIds = (await tx.payoutInstruction.findMany({ where: { allocationId: { in: allocationIds } }, select: { id: true } })).map((row) => row.id);
  await tx.payoutProviderEvent.deleteMany({ where: { payoutInstructionId: { in: payoutIds } } });
  await tx.payoutInstruction.deleteMany({ where: { id: { in: payoutIds } } });
  await tx.distributionAllocation.deleteMany({ where: { id: { in: allocationIds } } });
  await tx.distributionApproval.deleteMany({ where: { distributionId: { in: distributionIds } } });
  await tx.distribution.deleteMany({ where: { id: { in: distributionIds } } });
  await tx.investmentContribution.deleteMany({ where: { projectId } });
  await tx.fundingDisbursement.deleteMany({ where: { projectId } });
  await tx.fundingRequest.deleteMany({ where: { projectId } });
  await tx.investmentOrder.deleteMany({ where: { projectId } });
  await tx.contract.deleteMany({ where: { engagementId: { in: engagementIds } } });
  await tx.assetEngagement.deleteMany({ where: { projectId } });
  await tx.projectAssetNeed.deleteMany({ where: { projectId } });
  await tx.projectCapitalCommitment.deleteMany({ where: { projectId } });
  await tx.takafulPolicy.deleteMany({ where: { projectId } });
  // Revisions point at their parent review: unlink them so they can go in any order.
  await tx.shariahReview.updateMany({ where: { projectId }, data: { parentReviewId: null } });
  await tx.shariahReview.deleteMany({ where: { projectId } });
  await tx.wealthPool.deleteMany({ where: { poolId: { in: poolIds } } });
  // Milestones, team, documents, analyses, feasibility revisions, approvals and lifecycle events go with the project (ON DELETE CASCADE).
  await tx.project.delete({ where: { projectId } });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const search = arg('--find');
    if (search) return await find(prisma, search);
    const projectId = process.argv[2];
    if (!projectId || projectId.startsWith('--')) throw new Error('Usage: npx tsx scripts/delete-test-project.ts --find "<name>" | <projectId> [--confirm --by <userId> --reason "<why>"]');
    const project = await prisma.project.findUnique({ where: { projectId }, select: { projectId: true, projectCode: true, projectName: true, status: true, organisationId: true, countryNodeId: true, archivedAt: true } });
    if (!project) throw new Error(`No project with id ${projectId}. Use --find to look it up by name.`);

    const found = await inventory(prisma, projectId);
    const protectedRecords = found.akadTerms + found.ledgerTransactions;
    const pendingOrders = found.orders.find((row) => row.status === 'PENDING')?._count._all ?? 0;
    console.log(`${project.projectName} (${project.projectCode}, ${project.status}${project.archivedAt ? ', already archived' : ''})`);
    console.log(`  pools: ${found.pools.map((pool) => `${pool.poolName} [${pool.status}]`).join(', ') || 'none'}`);
    console.log(`  investment orders: ${found.orders.map((row) => `${row._count._all} ${row.status}`).join(', ') || 'none'}; settled contributions: ${found.contributions}`);
    console.log(`  funding requests: ${found.fundingRequests}, disbursements: ${found.disbursements}, distributions: ${found.distributions}`);
    console.log(`  asset needs: ${found.needs}, asset partnerships: ${found.engagements.length} (agreements ${found.contracts}), capital commitments: ${found.commitments}, takaful: ${found.takaful}, Shariah reviews: ${found.shariah}`);
    console.log(`  append-only: akad terms ${found.akadTerms}, ledger transactions ${found.ledgerTransactions}`);
    const action = protectedRecords ? 'ARCHIVE' : 'DELETE';
    console.log(protectedRecords
      ? `\nIt cannot be deleted: its akad terms or ledger postings are append-only. It will be ARCHIVED: ${pendingOrders} pending order(s) cancelled, open pools closed, hidden from every list.`
      : '\nIt will be DELETED with all its records.');

    if (!process.argv.includes('--confirm')) return console.log('\nNothing was changed. Add --confirm --by <your user id> --reason "<why>" to go ahead.');
    const by = arg('--by');
    const reason = arg('--reason');
    if (!by || !reason || reason.trim().length < 3) throw new Error('Say who is doing this and why: --by <userId> --reason "<why>".');
    const actor = await prisma.user.findUnique({ where: { id: by }, select: { id: true, email: true } });
    if (!actor) throw new Error(`No user with id ${by}.`);

    await prisma.$transaction(async (tx) => {
      if (action === 'DELETE') {
        await remove(tx, projectId, found.poolIds, found.engagements.map((engagement) => engagement.id));
      } else {
        await tx.investmentOrder.updateMany({ where: { projectId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
        await tx.wealthPool.updateMany({ where: { projectId, status: { in: OPEN_POOL_STATUSES } }, data: { status: 'CLOSED' } });
        await tx.project.update({ where: { projectId }, data: { archivedAt: new Date(), archivedBy: by, archivedReason: reason.trim() } });
      }
      await tx.auditEvent.create({ data: {
        userId: actor.id, userEmail: actor.email, action: action === 'DELETE' ? 'project.test_data_deleted' : 'project.archived', resourceType: 'Project', resourceId: projectId,
        organisationId: project.organisationId, countryNodeId: project.countryNodeId, result: 'Success',
        metadata: { projectCode: project.projectCode, projectName: project.projectName, status: project.status, reason: reason.trim(), via: 'scripts/delete-test-project.ts', pools: found.pools, pendingOrdersCancelled: action === 'ARCHIVE' ? pendingOrders : 0, akadTerms: found.akadTerms, ledgerTransactions: found.ledgerTransactions } as Prisma.InputJsonValue,
      } });
    }, { timeout: 60_000 });
    console.log(action === 'DELETE' ? '\nDeleted.' : '\nArchived: hidden from every list; records kept.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
