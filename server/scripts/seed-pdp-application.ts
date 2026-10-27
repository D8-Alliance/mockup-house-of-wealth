/**
 * STAGING ONLY. Gives an organisation an approved delivery partner (PDP) application filled with placeholder
 * data, so its sponsor can test pools without the KYB review. If the organisation already has an application,
 * that one is approved instead of creating another. Organisations created later apply and are reviewed normally.
 *
 *   npx tsx scripts/seed-pdp-application.ts --org ORG-MYS-1FF17D84 --email r.muhd.umar@gmail.com --by USR-SYS-002 --allow-production
 *
 * Options:
 *   --org      the organisation
 *   --email    the member recorded as the applicant (their portal shows the application)
 *   --by       the Member ID recorded as the reviewer
 *   --type     Company, Organisation, Institution or Individual (default Institution)
 */
import { Prisma, PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]?.startsWith('--') ? '' : (all[index + 1] ?? '')]] : pairs), []));
const TYPES = ['Company', 'Organisation', 'Institution', 'Individual'];
const NOTE = 'Staging: approved with placeholder data. No real KYB check was made.';

async function main() {
  if (process.env.NODE_ENV === 'production' && !('allow-production' in args)) throw new Error('NODE_ENV=production: add --allow-production to confirm this is the staging system.');
  const pdpType = args.type || 'Institution';
  if (!args.org || !args.email || !args.by || !TYPES.includes(pdpType)) throw new Error('Usage: --org <id> --email <applicant email> --by <reviewer Member ID> [--type Institution]');
  const prisma = new PrismaClient();
  try {
    const organisation = await prisma.organisation.findUnique({ where: { id: args.org }, select: { id: true, name: true, countryNodeId: true, registrationNumber: true, registeredAddress: true, countryNode: { select: { name: true, currency: true } } } });
    if (!organisation) throw new Error(`No organisation ${args.org}.`);
    const applicant = await prisma.user.findUnique({ where: { email: args.email.toLowerCase() }, select: { id: true, name: true, email: true } });
    if (!applicant) throw new Error(`No user with email ${args.email}.`);
    const reviewer = await prisma.user.findUnique({ where: { id: args.by }, select: { id: true, name: true } });
    if (!reviewer) throw new Error(`No user ${args.by}.`);
    const now = new Date();
    const decided = { at: now.toISOString(), by: reviewer.id, byName: reviewer.name, role: 'Super Admin', action: 'APPROVED', note: NOTE };
    const approval = { status: 'APPROVED', kybStatus: 'VERIFIED_MANUAL', organisationId: organisation.id, reviewNote: NOTE, reviewedBy: reviewer.id, reviewedAt: now };

    const existing = await prisma.pdpApplication.findFirst({ where: { OR: [{ organisationId: organisation.id }, { organisationId: null, organisationName: { equals: organisation.name, mode: 'insensitive' } }] }, orderBy: { updatedAt: 'desc' } });
    if (existing) {
      if (existing.status === 'APPROVED' || existing.status === 'ACTIVE') {
        // Already approved: only make sure it is tied to the organisation, so every member sees it.
        if (!existing.organisationId) await prisma.pdpApplication.update({ where: { id: existing.id }, data: { organisationId: organisation.id } });
        console.log(`${existing.applicationNumber} is already ${existing.status} (applicant ${existing.userEmail}).`);
        return;
      }
      const history = Array.isArray(existing.history) ? existing.history : [];
      await prisma.pdpApplication.update({ where: { id: existing.id }, data: { ...approval, submittedAt: existing.submittedAt ?? now, history: [...history, decided] as Prisma.InputJsonValue } });
      console.log(`${existing.applicationNumber} (was ${existing.status}, applicant ${existing.userEmail}) is now APPROVED.`);
      return;
    }

    const countryCode = organisation.countryNodeId.replace(/^CN-/, '');
    const year = now.getFullYear();
    const count = await prisma.pdpApplication.count({ where: { applicationNumber: { startsWith: `PDP-APP-${year}-` } } });
    const applicationNumber = `PDP-APP-${year}-${String(count + 1).padStart(3, '0')}`;
    const registrationNumber = organisation.registrationNumber || 'PLACEHOLDER-0000000';
    const registeredAddress = organisation.registeredAddress || 'Placeholder address, Kuala Lumpur';
    const payload = {
      userMobile: '+60 12-000 0000', preferredLanguage: 'Bahasa Melayu', pdpType, organisationName: organisation.name, tradingName: organisation.name,
      registrationNumber, countryOfRegistration: organisation.countryNode?.name ?? countryCode, registeredAddress, businessAddress: registeredAddress,
      contactPhone: '+60 3-0000 0000', website: 'https://example.invalid', businessCategory: 'Agriculture and land development', dateOfIncorporation: '1966-01-01', taxIdentificationNumber: 'PLACEHOLDER-TIN',
      representative: { id: 'REP-1', fullName: applicant.name, nationality: 'Malaysian', idPassportNumber: 'PLACEHOLDER', position: 'Project Sponsor', email: applicant.email, mobile: '+60 12-000 0000' },
      beneficialOwners: [{ id: 'UBO-1', fullName: 'Placeholder owner', nationality: 'Malaysian', idNumber: 'PLACEHOLDER', ownershipPercentage: 100, isDirector: false, isAuthorisedSignatory: false, pepStatus: false }],
      documents: [],
      bankInfo: { bankName: 'Placeholder Bank', accountHolderName: organisation.name, accountNumber: '****-****-0000', swiftBicCode: 'PLACEHOLDER', currency: organisation.countryNode?.currency ?? 'MYR', country: countryCode, settlementMethod: 'Corporate FPX' },
      compliance: { amlCftDeclaration: true, sourceOfFundsDeclaration: true, beneficialOwnershipAccurate: true, sanctionsNonMatchDeclared: true, regulatoryComplianceAgreed: true, shariahComplianceAttested: true, termsAndConditionsAccepted: true, privacyConsentGranted: true, declaredAt: now.toISOString() },
      statusHistory: [], activePoolsCount: 0, totalRaisedMYR: 0, totalDistributedMYR: 0, pendingSettlementMYR: 0,
    };
    await prisma.pdpApplication.create({ data: {
      applicationNumber, userId: applicant.id, userEmail: applicant.email, countryCode, countryName: organisation.countryNode?.name ?? countryCode, organisationName: organisation.name, pdpType,
      payload: payload as Prisma.InputJsonValue, submittedAt: now, history: [{ at: now.toISOString(), by: applicant.id, byName: applicant.name, role: 'Project Sponsor', action: 'SUBMITTED' }, decided] as Prisma.InputJsonValue, ...approval,
    } });
    console.log(`${applicationNumber}: ${organisation.name} approved as PDP (${pdpType}), applicant ${applicant.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
