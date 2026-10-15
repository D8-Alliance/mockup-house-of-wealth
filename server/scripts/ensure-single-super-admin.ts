import { PrismaClient } from '@prisma/client';

/**
 * The platform has exactly one Super Admin (owner decision 2026-10-15). Seeded demo personas
 * also hold the role, so on a real server run this once after seeding:
 *
 *   npx tsx scripts/ensure-single-super-admin.ts                 # list who holds Super Admin
 *   npx tsx scripts/ensure-single-super-admin.ts --keep USR-SYS-002   # keep one, switch the rest off
 *
 * Other Super Admin roles are deactivated, not deleted, so their history stays.
 */
async function main() {
  const keepIndex = process.argv.indexOf('--keep');
  const keep = keepIndex >= 0 ? process.argv[keepIndex + 1] : undefined;
  const prisma = new PrismaClient();
  try {
    const holders = await prisma.userRoleAssignment.findMany({
      where: { role: 'Super_Admin', isActive: true },
      include: { user: { select: { id: true, name: true, email: true, idpProvider: true } } },
      orderBy: { assignedAt: 'asc' },
    });
    console.log(`Active Super Admin roles: ${holders.length}`);
    for (const h of holders) console.log(`  ${h.user.id.padEnd(22)} ${h.user.name} <${h.user.email}> (${h.user.idpProvider}) ${h.organisationId}/${h.countryNodeId}`);
    if (!keep) {
      if (holders.length > 1) console.log('\nMore than one. Run again with --keep <user id> to keep only that one.');
      return;
    }
    if (!holders.some((h) => h.userId === keep)) throw new Error(`${keep} does not hold an active Super Admin role; nothing was changed.`);
    const others = holders.filter((h) => h.userId !== keep);
    if (others.length === 0) { console.log(`\nOnly ${keep} is Super Admin. Nothing to change.`); return; }
    await prisma.userRoleAssignment.updateMany({ where: { id: { in: others.map((h) => h.id) } }, data: { isActive: false } });
    console.log(`\nKept ${keep}. Switched off Super Admin for: ${[...new Set(others.map((h) => h.userId))].join(', ')}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
