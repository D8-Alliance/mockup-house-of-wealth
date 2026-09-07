import { ProjectMilestoneItem, ProjectProgressUpdate } from './monitoringTypes';
import { INITIAL_MILESTONES, INITIAL_PROGRESS_UPDATES } from '../data/mockPoolingWorkflowDataPart3';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';
import { generateNumericId } from '../utils/id';

class MonitoringService {
  private milestones: ProjectMilestoneItem[] = [...INITIAL_MILESTONES];
  private updates: ProjectProgressUpdate[] = [...INITIAL_PROGRESS_UPDATES];

  public getMilestonesByProject(projectId: string, isInvestorView: boolean = false): ProjectMilestoneItem[] {
    return this.milestones.filter(m => m.projectId === projectId && (!isInvestorView || m.isPublicToInvestors));
  }

  public getUpdatesByProject(projectId: string, isInvestorView: boolean = false): ProjectProgressUpdate[] {
    return this.updates.filter(u => u.projectId === projectId && (!isInvestorView || u.isPublicToInvestors));
  }

  public addMilestone(milestone: Partial<ProjectMilestoneItem>, userId: string, userRole: string): ProjectMilestoneItem {
    const newM: ProjectMilestoneItem = {
      id: generateNumericId('MILE', 6),
      projectId: milestone.projectId || 'PROJ-MYS-001',
      title: milestone.title || 'New Project Milestone',
      targetDate: milestone.targetDate || '2026-12-31',
      completionPercentage: milestone.completionPercentage || 0,
      budgetAllocated: milestone.budgetAllocated || 1000000,
      actualSpent: milestone.actualSpent || 0,
      status: milestone.status || 'Pending',
      isPublicToInvestors: milestone.isPublicToInvestors ?? true,
      shariahSignoff: milestone.shariahSignoff ?? false,
      auditorSignoff: milestone.auditorSignoff ?? false
    };

    this.milestones.push(newM);

    auditLogger.logEvent({
      userId,
      organisationId: 'ORG-FELDA-MYS',
      countryNodeId: 'CN-MYS',
      role: userRole,
      action: 'project_submit',
      resourceType: 'project',
      resourceId: newM.id,
      result: 'Success',
      metadata: { title: newM.title, status: newM.status }
    });

    notificationService.notify(
      'Project Milestone Added',
      `New milestone "${newM.title}" logged for Project ${newM.projectId}.`,
      'info',
      'project',
      newM.id
    );

    return newM;
  }

  public addProgressUpdate(update: Partial<ProjectProgressUpdate>, userId: string, userRole: string): ProjectProgressUpdate {
    const newU: ProjectProgressUpdate = {
      id: generateNumericId('UPD', 6),
      projectId: update.projectId || 'PROJ-MYS-001',
      title: update.title || 'Project Progress Report',
      description: update.description || '',
      updateDate: new Date().toISOString().split('T')[0],
      completionPercentage: update.completionPercentage || 0,
      isPublicToInvestors: update.isPublicToInvestors ?? true,
      authorName: userRole,
      authorRole: userRole
    };

    this.updates.unshift(newU);

    notificationService.notify(
      'Project Progress Update Published',
      `New update "${newU.title}" published for Project ${newU.projectId}.`,
      'info',
      'project',
      newU.id
    );

    return newU;
  }
}

export const monitoringService = new MonitoringService();
