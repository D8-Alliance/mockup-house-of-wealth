/**
 * STAGING ONLY. Marks an existing organisation's KYB as verified with a placeholder document, so test
 * accounts can draft and sign agreements without going through the KYB review. Organisations created
 * later go through the normal flow (submit on the dashboard, a KYB reviewer verifies).
 *
 *   npx tsx scripts/seed-organisation-kyb.ts --email itmanager@alhidayahgroup.com --number "201901012345 (1234567-A)" --address "Jalan ..., Selangor" --by USR-SYS-002
 *
 * Options:
 *   --email    a member's email; the organisation is the one they belong to
 *   --org      the organisation id instead (needed when the member belongs to more than one)
 *   --number   company registration number shown on agreements
 *   --address  registered address shown on agreements
 *   --by       the Member ID recorded as the reviewer (e.g. the Super Admin)
 * Refused when NODE_ENV=production unless --allow-production is given.
 */
import PDFDocument from 'pdfkit';
import { Prisma, PrismaClient } from '@prisma/client';
import { inspectDocument } from '../src/projects/document-integrity';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]?.startsWith('--') ? '' : (all[index + 1] ?? '')]] : pairs), []));

function placeholderPdf(organisationName: string, number: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: 'Placeholder SSM company profile', Producer: 'D-8 Wealth Pooling staging' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.font('Helvetica-Bold').fontSize(18).text('PLACEHOLDER: NOT A REAL SSM DOCUMENT');
    doc.moveDown().font('Helvetica').fontSize(11)
      .text(`Organisation: ${organisationName}`)
      .text(`Registration number: ${number}`)
      .moveDown()
      .text('This file was added on the staging system so test accounts can be marked as verified. Replace it with the real SSM company profile (e-Info) before production.');
    doc.end();
  });
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !('allow-production' in args)) {
    // Staging also runs with NODE_ENV=production, so the flag is required there too.
    throw new Error('NODE_ENV=production: add --allow-production to confirm this is the staging system, never the live one.');
  }
  const number = args.number?.trim();
  const address = args.address?.trim();
  if (!number || !address || !args.by || (!args.email && !args.org)) throw new Error('Usage: --email <member email> | --org <id>, --number "<registration no.>", --address "<registered address>", --by <reviewer Member ID>');

  const prisma = new PrismaClient();
  try {
    let organisationId = args.org;
    if (!organisationId) {
      const user = await prisma.user.findUnique({ where: { email: args.email.toLowerCase() }, select: { id: true, roleAssignments: { where: { isActive: true }, select: { organisationId: true, organisation: { select: { name: true } } } } } });
      if (!user) throw new Error(`No user with email ${args.email}.`);
      const organisations = [...new Map(user.roleAssignments.map((assignment) => [assignment.organisationId, assignment.organisation.name])).entries()];
      if (organisations.length !== 1) throw new Error(`${args.email} belongs to ${organisations.length} organisations; choose one with --org:\n${organisations.map(([id, name]) => `  ${id}  ${name}`).join('\n')}`);
      organisationId = organisations[0][0];
    }
    const organisation = await prisma.organisation.findUnique({ where: { id: organisationId }, select: { id: true, name: true, kybHistory: true } });
    if (!organisation) throw new Error(`No organisation ${organisationId}.`);
    const reviewer = await prisma.user.findUnique({ where: { id: args.by }, select: { id: true, name: true } });
    if (!reviewer) throw new Error(`No user ${args.by}.`);

    const content = await placeholderPdf(organisation.name, number);
    const integrity = inspectDocument(content);
    const now = new Date();
    const note = 'Staging: marked verified with a placeholder document. No real SSM check was made.';
    const history = [...(Array.isArray(organisation.kybHistory) ? organisation.kybHistory : []), { at: now.toISOString(), by: reviewer.id, byName: reviewer.name, role: 'Super Admin', action: 'APPROVE', note }];
    await prisma.$transaction([
      prisma.organisationKybDocument.deleteMany({ where: { organisationId: organisation.id, fileName: 'placeholder-ssm-profile.pdf' } }),
      prisma.organisationKybDocument.create({ data: { organisationId: organisation.id, documentType: 'SSM_PROFILE', fileName: 'placeholder-ssm-profile.pdf', mimeType: 'application/pdf', fileSize: content.length, fileContent: content, sha256: integrity.sha256, integrity: integrity as unknown as Prisma.InputJsonValue, uploadedBy: reviewer.id } }),
      prisma.organisation.update({ where: { id: organisation.id }, data: { registrationNumber: number, registeredAddress: address, kybStatus: 'APPROVED', kybSubmittedAt: now, kybReviewedBy: reviewer.id, kybReviewedAt: now, kybNote: note, kybHistory: history as unknown as Prisma.InputJsonValue } }),
    ]);
    console.log(`${organisation.id}  ${organisation.name}: KYB verified (placeholder), ${number}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
