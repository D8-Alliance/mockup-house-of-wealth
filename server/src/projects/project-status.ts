import { Prisma } from '@prisma/client';

/**
 * Moves a project on when money moves (the pool fills, the first tranche is released), with the same
 * lifecycle record a manual status change leaves. Only from the listed statuses, so a repeat does nothing.
 */
export async function advanceProjectStatus(
  tx: Prisma.TransactionClient,
  project: { projectId: string; organisationId: string; countryNodeId: string },
  from: string[],
  to: string,
  actorId: string,
  note: string,
): Promise<boolean> {
  const current = await tx.project.findUnique({ where: { projectId: project.projectId }, select: { status: true } });
  if (!current || !from.includes(current.status)) return false;
  const moved = await tx.project.updateMany({ where: { projectId: project.projectId, status: current.status }, data: { status: to, lifecycleVersion: { increment: 1 } } });
  if (!moved.count) return false;
  await tx.projectLifecycleEvent.create({ data: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId, fromStatus: current.status, toStatus: to, note, actorId } });
  return true;
}

/** Approved projects still raising money; the pool filling moves them to FUNDED. */
export const RAISING_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING'];
/** Projects whose pool has raised the funding: their tranches can be released. */
export const RELEASABLE_PROJECT_STATUSES = ['FUNDED', 'EXECUTION'];
