/**
 * STAGING ADMIN. Puts a project's details back to what they were before it was edited, taking the original
 * values from the audit log (each "project.update" records the values it replaced). For a project renamed into
 * a different venture after an asset partnership was agreed on it: the partnership and its agreement keep the
 * project they were made for, and the new venture is registered as a new project.
 *
 *   npx tsx scripts/restore-project-details.ts --agreement HOF-20261022091409-34E9A6DB --by USR-SYS-002 --allow-production
 *   ... the same with --apply to write the change (without it, it only shows what would change)
 *
 * Options:
 *   --agreement  find the project through an asset partnership agreement number; or
 *   --project    the project id
 *   --by         the Member ID recorded in the audit log as making the change
 */
import { Prisma, PrismaClient } from '@prisma/client';

const argv = process.argv.slice(2);
const args = Object.fromEntries(argv.reduce<[string, string][]>((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]?.startsWith('--') ? '' : (all[index + 1] ?? '')]] : pairs), []));

/** Restored from the first value the audit log recorded for them; the sponsor entity type stays as corrected. */
const FIELDS = ['projectName', 'description', 'sector', 'proposedShariahContract', 'location', 'totalProjectCost', 'fundingRequired', 'sponsorContribution', 'expectedYieldPct', 'tenureMonths'] as const;
const DECIMAL = ['totalProjectCost', 'fundingRequired', 'sponsorContribution', 'expectedYieldPct'];

function value(field: string, text: string): unknown {
  if (DECIMAL.includes(field)) return text === '' ? (field === 'expectedYieldPct' ? null : 0) : new Prisma.Decimal(text);
  if (field === 'tenureMonths') return text === '' ? null : Number(text);
  if (field === 'location') return text === '' ? null : text;
  return text;
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !('allow-production' in args)) throw new Error('NODE_ENV=production: add --allow-production to confirm this is the staging system.');
  if (!args.by || (!args.agreement && !args.project)) throw new Error('Usage: --agreement <HOF-...> | --project <id>, --by <Member ID>, then --apply to write.');
  const prisma = new PrismaClient();
  try {
    let projectId = args.project;
    if (!projectId) {
      const contract = await prisma.contract.findFirst({ where: { contractNumber: args.agreement }, select: { engagementId: true } });
      if (!contract?.engagementId) throw new Error(`No asset partnership agreement ${args.agreement}.`);
      const engagement = await prisma.assetEngagement.findUnique({ where: { id: contract.engagementId }, select: { projectId: true } });
      projectId = engagement!.projectId;
    }
    const project = await prisma.project.findUnique({ where: { projectId } });
    if (!project) throw new Error(`No project ${projectId}.`);
    const events = await prisma.auditEvent.findMany({ where: { action: 'project.update', resourceType: 'Project', resourceId: projectId }, orderBy: { createdAt: 'asc' }, select: { createdAt: true, metadata: true } });
    const original: Record<string, string> = {};
    for (const event of events) {
      const before = ((event.metadata ?? {}) as { before?: Record<string, string> }).before ?? {};
      for (const [field, text] of Object.entries(before)) if (!(field in original)) original[field] = text;
    }
    const changes = Object.fromEntries(FIELDS.filter((field) => field in original && String((project as Record<string, unknown>)[field] ?? '') !== original[field]).map((field) => [field, value(field, original[field])]));

    console.log(`Project ${project.projectId} (${project.projectCode}), status ${project.status}; ${events.length} edit(s) in the audit log.`);
    if (!Object.keys(changes).length) { console.log('Nothing to restore.'); return; }
    for (const field of Object.keys(changes)) console.log(`  ${field}:\n    now:      ${String((project as Record<string, unknown>)[field] ?? '').slice(0, 120)}\n    restored: ${original[field].slice(0, 120)}`);
    const [tranches, capital, policies, partnerships] = await Promise.all([
      prisma.projectMilestone.count({ where: { projectId, disbursementAmount: { gt: 0 } } }),
      prisma.projectCapitalCommitment.count({ where: { projectId } }),
      prisma.takafulPolicy.count({ where: { projectId } }),
      prisma.assetEngagement.findMany({ where: { projectId }, select: { id: true, status: true, asset: { select: { name: true } } } }),
    ]);
    console.log(`Stays with this project: ${partnerships.map((item) => `${item.id} ${item.asset.name} (${item.status})`).join('; ') || 'no partnerships'}; ${tranches} tranche(s), ${capital} capital pledge(s), ${policies} takaful policy(ies).`);
    if (!('apply' in args)) { console.log('Preview only. Run again with --apply to restore.'); return; }

    const actor = await prisma.user.findUnique({ where: { id: args.by }, select: { id: true, email: true } });
    if (!actor) throw new Error(`No user ${args.by}.`);
    await prisma.$transaction([
      prisma.project.update({ where: { projectId }, data: changes }),
      prisma.auditEvent.create({ data: { userId: actor.id, userEmail: actor.email, action: 'project.restore_details', resourceType: 'Project', resourceId: projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { fields: Object.keys(changes), from: Object.fromEntries(Object.keys(changes).map((field) => [field, String((project as Record<string, unknown>)[field] ?? '')])), to: Object.fromEntries(Object.keys(changes).map((field) => [field, original[field]])), reason: 'The project was renamed into another venture after an asset partnership was agreed on it; restored so the partnership keeps its project.' } as Prisma.InputJsonValue } }),
    ]);
    console.log('Restored. Register the other venture as a new project.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
