import { PrismaClient } from '@prisma/client';

/**
 * Renames a user's id everywhere it is used, e.g. the seeded `USR-mock-user` that a real
 * Super Admin was linked to on staging:
 *
 *   npx tsx scripts/rename-user-id.ts USR-mock-user USR-SYS-002
 *
 * Foreign keys follow the new id on their own (ON UPDATE CASCADE). Every other text column
 * that holds the old id (createdBy, reviewerId, ownerUserId...) is updated in the same
 * transaction. The tamper-evident tables (audit trail and ledger) are left alone on purpose:
 * rewriting them would break their hash chain, and they record who acted at the time.
 */
const PROTECTED_TABLES = new Set(['AuditEvent', 'HashChainLink', 'LedgerTransaction', 'LedgerEntry', '_prisma_migrations']);
const ID_PATTERN = /^USR-[A-Za-z0-9-]{2,60}$/;

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function main() {
  const [oldId, newId] = process.argv.slice(2);
  if (!oldId || !newId) throw new Error('Usage: npx tsx scripts/rename-user-id.ts <old-id> <new-id>');
  if (!ID_PATTERN.test(newId)) throw new Error(`The new id must look like USR-XXX-000 (letters, digits and dashes): ${newId}`);

  const prisma = new PrismaClient();
  try {
    const [oldUser, taken] = await Promise.all([
      prisma.user.findUnique({ where: { id: oldId }, select: { id: true, email: true, name: true } }),
      prisma.user.findUnique({ where: { id: newId }, select: { id: true } }),
    ]);
    if (!oldUser) throw new Error(`No user with id ${oldId}`);
    if (taken) throw new Error(`${newId} is already used by another user`);

    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND data_type IN ('text', 'character varying')`;

    const changed = await prisma.$transaction(async (tx) => {
      const counts: string[] = [];
      await tx.$executeRaw`UPDATE "User" SET id = ${newId} WHERE id = ${oldId}`;
      for (const { table_name: table, column_name: column } of columns) {
        if (PROTECTED_TABLES.has(table) || (table === 'User' && column === 'id')) continue;
        const count = await tx.$executeRawUnsafe(`UPDATE ${quote(table)} SET ${quote(column)} = $1 WHERE ${quote(column)} = $2`, newId, oldId);
        if (count > 0) counts.push(`${table}.${column}: ${count}`);
      }
      return counts;
    }, { timeout: 60_000 });

    console.log(`Renamed ${oldUser.name} <${oldUser.email}> from ${oldId} to ${newId}.`);
    console.log(changed.length ? `Also updated: ${changed.join(', ')}` : 'No other columns referred to the old id.');
    console.log('The audit trail and ledger keep the old id as a historical record. Sign out and sign in again.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
