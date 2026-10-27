import { PrismaClient } from '@prisma/client';

/**
 * Read-only: lists the organisations of a country and who holds a role in each, so an administrator
 * can pick the --org-id for provision-user.ts.
 *
 *   npx tsx scripts/list-organisations.ts --country CN-MYS
 */
const args = Object.fromEntries(process.argv.slice(2).reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1] ?? '']] : pairs), []));

async function main() {
  const country = args.country?.trim() || 'CN-MYS';
  const prisma = new PrismaClient();
  try {
    const organisations = await prisma.organisation.findMany({ where: { countryNodeId: country, NOT: { id: { contains: '-IND-' } } }, orderBy: { name: 'asc' }, select: { id: true, name: true, status: true } });
    const assignments = await prisma.userRoleAssignment.findMany({ where: { countryNodeId: country }, select: { organisationId: true, role: true, user: { select: { email: true, name: true } } } });
    for (const org of organisations) {
      const members = assignments.filter((item) => item.organisationId === org.id);
      console.log(`${org.id}  ${org.name}  [${org.status}]`);
      for (const member of members) console.log(`    ${member.role.replace(/_/g, ' ')}: ${member.user?.name ?? ''} <${member.user?.email ?? ''}>`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
