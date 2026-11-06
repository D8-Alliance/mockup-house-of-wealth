import { Prisma, PrismaClient } from '@prisma/client';
import { actionDueAfter } from '../src/leasing/rent-collection-rules';
import { newCountryScopedId } from '../src/users/user-identity';

/**
 * Opens a rent collection case for one unpaid month of an approved lease now, for testing (SIT) on staging, instead
 * of waiting until the month is 7 days late. The case starts at "Unpaid" with reminder 1 due in 7 days, exactly as
 * the daily check would open it, and the opening is written to the audit log. Recording the month as received still
 * closes it.
 *
 * Shows what would happen; add --confirm to do it:
 *   npx tsx scripts/open-collection-case.ts --lease LEASE-MYS-XXXXXXXX [--period 2026-12] --by <userId> --reason "SIT rent collection"
 */
const prisma = new PrismaClient();
const arg = (name: string) => { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; };

async function main() {
  const leaseId = arg('--lease');
  if (!leaseId) throw new Error('Say which lease: --lease LEASE-MYS-XXXXXXXX.');
  const lease = await prisma.assetLease.findUnique({ where: { id: leaseId }, include: { unit: { select: { label: true, asset: { select: { name: true } } } }, payments: { where: { status: 'DUE' }, orderBy: { dueDate: 'asc' } } } });
  if (!lease) throw new Error(`No lease ${leaseId}.`);
  if (!['APPROVED', 'ENDED'].includes(lease.status)) throw new Error(`${leaseId} is ${lease.status}; only an approved lease has rent to collect.`);
  const period = arg('--period');
  const payment = period ? lease.payments.find((item) => item.period === period) : lease.payments[0];
  if (!payment) throw new Error(period ? `No unpaid month ${period} on ${leaseId}.` : `${leaseId} has no unpaid month.`);
  const existing = await prisma.rentCollectionCase.findUnique({ where: { paymentId: payment.id }, select: { id: true, stage: true } });
  if (existing) throw new Error(`Month ${payment.period} already has case ${existing.id} (${existing.stage}).`);

  console.log(`${lease.unit.label}, ${lease.unit.asset.name} (${leaseId})`);
  console.log(`  month ${payment.period}, due ${payment.dueDate.toISOString().slice(0, 10)}, ${payment.currency} ${Number(payment.amount).toFixed(2)}`);
  if (!process.argv.includes('--confirm')) { console.log('\nNothing changed. Add --confirm (with --by and --reason) to open the case.'); return; }

  const by = arg('--by');
  const reason = arg('--reason');
  if (!by || !reason || reason.trim().length < 3) throw new Error('Say who is doing this and why: --by <userId> --reason "<why>".');
  const actor = await prisma.user.findUnique({ where: { id: by }, select: { id: true, email: true, name: true } });
  if (!actor) throw new Error(`No user with id ${by}.`);

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.rentCollectionCase.create({ data: {
      id: newCountryScopedId('COLL', lease.countryNodeId), leaseId, paymentId: payment.id, period: payment.period, ownerOrganisationId: lease.ownerOrganisationId, tenantOrganisationId: lease.tenantOrganisationId,
      countryNodeId: lease.countryNodeId, amount: payment.amount, currency: payment.currency, stage: 'OPEN', actionDueAt: actionDueAfter('OPEN', now), followUps: [],
      history: [{ at: now.toISOString(), by: actor.id, byName: actor.name, action: 'OPENED', stage: 'OPEN', note: `Opened for testing: ${reason.trim()}` }] as unknown as Prisma.InputJsonValue,
    } });
    await tx.auditEvent.create({ data: {
      userId: actor.id, userEmail: actor.email, action: 'rent_collection.opened_for_testing', resourceType: 'RentCollectionCase', resourceId: row.id,
      organisationId: lease.ownerOrganisationId, countryNodeId: lease.countryNodeId, result: 'Success',
      metadata: { reason: reason.trim(), via: 'scripts/open-collection-case.ts', leaseId, period: payment.period, dueDate: payment.dueDate.toISOString() } as Prisma.InputJsonValue,
    } });
    return row;
  });
  console.log(`\nOpened ${created.id}: reminder 1 due by ${created.actionDueAt.toISOString().slice(0, 10)}.`);
}

main()
  .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
