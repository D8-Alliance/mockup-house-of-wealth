import { Prisma, PrismaClient } from '@prisma/client';
import { leaseTermMonths, rentSchedule } from '../src/leasing/leasing-rules';

/**
 * Puts a lease the owner ended early back to approved, for testing (SIT) on staging: the "Ended" entry leaves the
 * lease history, the rent periods removed when it ended are added back as due, and the reopening is written to the
 * audit log with the entry it removed. Rent already recorded as received is kept. Refuses a lease whose deposits
 * were refunded, or whose unit another lease now holds.
 *
 * Shows what would change; add --confirm to do it:
 *   npx tsx scripts/reopen-ended-lease.ts --lease LEASE-MYS-XXXXXXXX --by <userId> --reason "SIT not finished"
 */
const prisma = new PrismaClient();
const arg = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };

type HistoryEntry = { at: string; action: string; party: string; byName: string };

async function main() {
  const leaseId = arg('--lease');
  if (!leaseId) throw new Error('Say which lease: --lease LEASE-MYS-XXXXXXXX.');
  const lease = await prisma.assetLease.findUnique({ where: { id: leaseId }, include: { unit: { select: { label: true, asset: { select: { name: true } } } }, payments: { select: { period: true, status: true } } } });
  if (!lease) throw new Error(`No lease ${leaseId}.`);
  if (lease.status !== 'ENDED' || !lease.endedAt) throw new Error(`${leaseId} is ${lease.status}; only a lease the owner ended can be reopened.`);
  if (lease.depositReturnedAt || (Array.isArray(lease.depositRefunds) && lease.depositRefunds.length)) throw new Error('Its deposits were already refunded; reopening would leave the refund recorded against a running lease.');
  const holder = await prisma.assetLease.findFirst({ where: { unitId: lease.unitId, id: { not: leaseId }, status: { in: ['ACCEPTED', 'APPROVED'] }, startDate: { lte: lease.endDate }, endDate: { gte: lease.startDate } }, select: { id: true } });
  if (holder) throw new Error(`${holder.id} now holds this unit for an overlapping period.`);

  const history = lease.history as unknown as HistoryEntry[];
  const ended = history[history.length - 1];
  if (ended?.action !== 'ENDED') throw new Error('The last history entry is not "Ended"; check the lease by hand.');
  const schedule = rentSchedule(lease.startDate, leaseTermMonths(lease.startDate, lease.endDate), Number(lease.monthlyRent));
  const missing = schedule.filter((row) => !lease.payments.some((payment) => payment.period === row.period));

  console.log(`${lease.unit.label}, ${lease.unit.asset.name} (${leaseId})`);
  console.log(`  ended ${lease.endedAt.toISOString()} by ${ended.byName}`);
  console.log(`  rent recorded: ${lease.payments.length} period(s), kept`);
  console.log(`  rent periods to add back as due: ${missing.map((row) => row.period).join(', ') || 'none'}`);
  if (!process.argv.includes('--confirm')) { console.log('\nNothing changed. Add --confirm (with --by and --reason) to reopen it as approved.'); return; }

  const by = arg('--by');
  const reason = arg('--reason');
  if (!by || !reason || reason.trim().length < 3) throw new Error('Say who is doing this and why: --by <userId> --reason "<why>".');
  const actor = await prisma.user.findUnique({ where: { id: by }, select: { id: true, email: true } });
  if (!actor) throw new Error(`No user with id ${by}.`);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.assetLease.updateMany({ where: { id: leaseId, status: 'ENDED', updatedAt: lease.updatedAt }, data: { status: 'APPROVED', awaiting: 'NONE', endedAt: null, history: history.slice(0, -1) as unknown as Prisma.InputJsonValue } });
    if (!claimed.count) throw new Error('The lease changed meanwhile; run again.');
    await tx.leaseRentPayment.createMany({ data: missing.map((row) => ({ leaseId, period: row.period, dueDate: new Date(row.dueDate), amount: row.amount, currency: lease.currency })), skipDuplicates: true });
    await tx.auditEvent.create({ data: {
      userId: actor.id, userEmail: actor.email, action: 'asset_lease.reopened', resourceType: 'AssetLease', resourceId: leaseId,
      organisationId: lease.ownerOrganisationId, countryNodeId: lease.countryNodeId, result: 'Success',
      metadata: { reason: reason.trim(), via: 'scripts/reopen-ended-lease.ts', removedHistoryEntry: ended, endedAt: lease.endedAt.toISOString(), rentPeriodsAddedBack: missing.map((row) => row.period) } as Prisma.InputJsonValue,
    } });
  });
  console.log('\nReopened: the lease is approved again.');
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
