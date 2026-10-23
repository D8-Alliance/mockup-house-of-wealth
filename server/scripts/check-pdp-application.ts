/**
 * Read-only. Shows the PDP applications that could belong to an organisation, and why the sponsor
 * portal does or does not find them (applicant, organisation id, name, country, status).
 *
 *   npx tsx scripts/check-pdp-application.ts --org ORG-MYS-1FF17D84
 */
import { PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const orgId = argv[argv.indexOf('--org') + 1];

async function main() {
  if (!orgId || argv.indexOf('--org') < 0) throw new Error('Usage: --org <organisation id>');
  const prisma = new PrismaClient();
  try {
    const organisation = await prisma.organisation.findUnique({ where: { id: orgId }, select: { id: true, name: true, countryNodeId: true } });
    if (!organisation) throw new Error(`No organisation ${orgId}.`);
    const members = await prisma.userRoleAssignment.findMany({ where: { organisationId: orgId, isActive: true }, select: { userId: true, role: true, user: { select: { name: true, email: true } } } });
    const firstWord = organisation.name.split(/\s+/)[0];
    const applications = await prisma.pdpApplication.findMany({
      where: { OR: [{ organisationId: orgId }, { userId: { in: members.map((member) => member.userId) } }, { organisationName: { contains: firstWord, mode: 'insensitive' } }] },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, applicationNumber: true, organisationName: true, organisationId: true, countryCode: true, status: true, userId: true, userEmail: true, updatedAt: true },
    });
    console.log(`Organisation: ${organisation.id} "${organisation.name}" (${organisation.countryNodeId})`);
    console.log('Members:');
    for (const member of members) console.log(`  ${member.userId}  ${member.role}  ${member.user.name} <${member.user.email}>`);
    console.log(applications.length ? 'PDP applications:' : 'No PDP application found by organisation, member or name.');
    for (const application of applications) {
      const found = application.organisationId === orgId ? 'matched: organisation id'
        : application.organisationId === null && application.organisationName.toLowerCase() === organisation.name.toLowerCase() && `CN-${application.countryCode}` === organisation.countryNodeId ? 'matched: same name'
        : 'NOT matched: name, organisation or country differs';
      console.log(`  ${application.applicationNumber}  ${application.status}  "${application.organisationName}"  org=${application.organisationId ?? '-'}  country=${application.countryCode}  by ${application.userEmail}  -> ${application.status === 'DRAFT' ? 'draft (only its applicant sees it)' : found}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
