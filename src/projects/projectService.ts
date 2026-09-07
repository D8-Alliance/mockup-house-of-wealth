import { Project, ProjectStatus } from './projectTypes';
import { INITIAL_PROJECTS } from '../data/mockPoolingWorkflowData';
import { auditLogger } from '../audit/auditLogger';
import { notificationService } from '../notifications/notificationService';
import { dueDiligenceService } from '../dueDiligence/dueDiligenceService';
import { shariahService } from '../shariah/shariahService';
import { generateNumericId } from '../utils/id';
import { complianceService } from '../compliance/complianceService';
import { riskService } from '../risk/riskService';

const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'DRAFT', 'REJECTED'],
  UNDER_REVIEW: ['DUE_DILIGENCE', 'DRAFT', 'REJECTED'],
  DUE_DILIGENCE: ['SHARIAH_REVIEW', 'DRAFT', 'REJECTED'],
  SHARIAH_REVIEW: ['COMPLIANCE_REVIEW', 'DRAFT', 'REJECTED'],
  COMPLIANCE_REVIEW: ['RISK_REVIEW', 'DRAFT', 'REJECTED'],
  RISK_REVIEW: ['APPROVED', 'DRAFT', 'REJECTED'],
  APPROVED: ['POOLING', 'ACTIVE'],
  POOLING: ['FUNDING', 'ACTIVE'],
  FUNDING: ['ACTIVE'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['CANCELLED'],
  CANCELLED: [],
  REJECTED: []
};

class ProjectService {
  private projects: Project[] = [...INITIAL_PROJECTS];

  public getAllProjects(): Project[] {
    return [...this.projects];
  }

  public getProjectById(id: string): Project | undefined {
    return this.projects.find(p => p.projectId === id);
  }

  public getProjectsBySponsor(sponsorId: string): Project[] {
    return this.projects.filter(p => p.projectSponsorId === sponsorId);
  }

  public getProjectsByOrganisation(orgId: string): Project[] {
    return this.projects.filter(p => p.organisationId === orgId);
  }

  public createProject(projectData: Partial<Project>, userId: string, userRole: string): Project {
    const newId = `PROJ-${projectData.countryNodeId || 'MYS'}-${generateNumericId('P', 4)}`;
    const newCode = `${projectData.countryNodeId || 'MYS'}-PROJ-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProject: Project = {
      projectId: newId,
      projectCode: newCode,
      projectName: projectData.projectName || 'New Project Proposal',
      description: projectData.description || '',
      organisationId: projectData.organisationId || 'ORG-FELDA-MYS',
      organisationName: projectData.organisationName || 'FELDA Holdings Berhad',
      countryNodeId: projectData.countryNodeId || 'CN-MYS',
      projectSponsorId: userId,
      projectSponsorName: projectData.projectSponsorName || 'Project Sponsor',
      projectManagerId: projectData.projectManagerId || userId,
      projectManagerName: projectData.projectManagerName || 'Project Manager',
      sector: projectData.sector || 'Agriculture & Plantation',
      category: projectData.category || 'Agro-Industrial',
      location: projectData.location || 'Kuala Lumpur, Malaysia',
      currency: projectData.currency || 'USD',
      totalProjectCost: projectData.totalProjectCost || 10000000,
      sponsorContribution: projectData.sponsorContribution || 2000000,
      fundingRequired: projectData.fundingRequired || 8000000,
      minimumFunding: projectData.minimumFunding || 5000000,
      maximumFunding: projectData.maximumFunding || 10000000,
      minimumInvestmentPerInvestor: projectData.minimumInvestmentPerInvestor || 10000,
      maximumInvestmentPerInvestor: projectData.maximumInvestmentPerInvestor || 1000000,
      projectDurationMonths: projectData.projectDurationMonths || 60,
      indicativeExpectedReturn: projectData.indicativeExpectedReturn || 8.0,
      riskLevel: projectData.riskLevel || 'Medium',
      projectStartDate: projectData.projectStartDate || '2026-10-01',
      projectEndDate: projectData.projectEndDate || '2031-09-30',
      businessModelSummary: projectData.businessModelSummary || '',
      proposedShariahContract: projectData.proposedShariahContract || 'Mudarabah',
      revenueModel: projectData.revenueModel || '',
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: projectData.documents || [],
      reviewComments: []
    };

    this.projects.unshift(newProject);

    auditLogger.logEvent({
      userId,
      organisationId: projectData.organisationId || 'ORG-FELDA-MYS',
      countryNodeId: projectData.countryNodeId || 'CN-MYS',
      role: userRole,
      action: 'project_create',
      resourceType: 'project',
      resourceId: newId,
      result: 'Success',
      metadata: { projectName: newProject.projectName, fundingRequired: newProject.fundingRequired }
    });

    notificationService.notify(
      'Project Proposal Created',
      `Project draft "${newProject.projectName}" saved successfully.`,
      'info',
      'project',
      newId
    );

    return newProject;
  }

  public updateProjectStatus(projectId: string, newStatus: ProjectStatus, userId: string, userRole: string, comments?: string): Project {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const oldStatus = project.status;

    // 1. State Machine Transition Check
    if (oldStatus !== newStatus) {
      const allowedNext = VALID_TRANSITIONS[oldStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        throw new Error(`Invalid status transition: Cannot move project directly from ${oldStatus} to ${newStatus}.`);
      }
    }

    // 2. Segregation of Duties (SoD) Check
    if (newStatus === 'APPROVED' && (userId === project.projectSponsorId || userRole === 'Project Sponsor')) {
      throw new Error('Segregation of Duties Violation: Project Sponsor cannot approve their own project proposal.');
    }

    // 3. Approval Dependency Check
    if (newStatus === 'APPROVED') {
      const ddPassed = dueDiligenceService.getByProject(projectId)?.overallStatus === 'PASSED';
      const shariahApproved = shariahService.getByProject(projectId)?.status === 'APPROVED';
      const compliancePassed = complianceService.getByProject(projectId)?.status === 'PASSED';
      const riskApproved = riskService.getByProject(projectId)?.riskApprovalStatus === 'APPROVED';

      if (!ddPassed || !shariahApproved || !compliancePassed || !riskApproved) {
        throw new Error('Approval Dependency Error: Project cannot be APPROVED until Due Diligence, Shariah, Compliance, and Risk reviews are all completed.');
      }
    }

    project.status = newStatus;
    project.updatedAt = new Date().toISOString();

    if (comments) {
      if (!project.reviewComments) project.reviewComments = [];
      project.reviewComments.push({
        id: `COMM-${Date.now()}`,
        projectId,
        reviewerId: userId,
        reviewerName: userRole,
        reviewerRole: userRole,
        stage: newStatus,
        action: newStatus.includes('REJECT') ? 'REJECT' : 'APPROVE',
        comments,
        timestamp: new Date().toISOString()
      });
    }

    auditLogger.logEvent({
      userId,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      role: userRole,
      action: newStatus.includes('REJECT') ? 'project_reject' : 'project_approve',
      resourceType: 'project',
      resourceId: projectId,
      result: 'Success',
      metadata: { oldStatus, newStatus, comments }
    });

    notificationService.notify(
      `Project Status Updated to ${newStatus}`,
      `Project "${project.projectName}" transitioned from ${oldStatus} to ${newStatus}.`,
      'info',
      'project',
      projectId
    );

    return project;
  }
}

export const projectService = new ProjectService();

