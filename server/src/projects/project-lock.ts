import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Once a project has a final decision, anything that changes that decision (feasibility
 * re-runs, evidence changes, contract structuring) is locked. Changes go through a formal
 * reopen, which returns the project to DUE_DILIGENCE and pauses funding.
 */
export const LOCKED_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED', 'REJECTED'];

/** Statuses in which an approved project can take funding requests and pools. */
export const FUNDABLE_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED'];

/** A project can be reopened only before investor money is committed to it. */
export const REOPENABLE_PROJECT_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'REJECTED'];

export function isProjectLocked(status: string) {
  return LOCKED_PROJECT_STATUSES.includes(status);
}

export function assertProjectUnlocked(project: { status: string }, action: string) {
  if (isProjectLocked(project.status)) {
    throw new ConflictException(`${action} is locked because the project is ${project.status.replaceAll('_', ' ')}. A Country Admin must reopen the project first.`);
  }
}

/** True when the latest feasibility revision carries an approved final committee decision. */
export async function hasCurrentFinalApproval(prisma: PrismaService, project: { projectId: string; organisationId: string; countryNodeId: string }) {
  const currentRevision = await prisma.projectFeasibilityRevision.findFirst({ where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId }, orderBy: { revisionNumber: 'desc' }, select: { id: true } });
  if (!currentRevision) return false;
  const approval = await prisma.projectApproval.findFirst({ where: { projectId: project.projectId, revisionId: currentRevision.id, stage: 'FINAL_DECISION', status: 'APPROVED' }, select: { id: true } });
  return Boolean(approval);
}
