import { Project, ProjectStatus } from './projectTypes';
import { apiClient, BackendProject } from '../services/apiClient';

/**
 * Projects for the Wealth Pooling page, read from the server. The list is cached after
 * refresh() so the page's synchronous lookups (getProjectById and friends) keep working.
 * Status changes go through the server, which enforces who may move a project and when.
 */
function mapProject(raw: BackendProject): Project {
  const fundingRequired = Number(raw.fundingRequired);
  return {
    projectId: raw.projectId,
    projectCode: raw.projectCode,
    projectName: raw.projectName,
    description: raw.description,
    organisationId: raw.organisationId,
    organisationName: raw.organisation?.name || raw.organisationId,
    countryNodeId: raw.countryNodeId,
    projectSponsorId: raw.projectSponsorId || '',
    projectSponsorName: raw.projectSponsor?.name || '',
    projectManagerId: '',
    projectManagerName: '',
    sector: raw.sector as Project['sector'],
    category: raw.sector,
    location: raw.location || '',
    currency: raw.countryNode?.currency || 'MYR',
    totalProjectCost: Number(raw.totalProjectCost ?? fundingRequired),
    sponsorContribution: Number(raw.sponsorContribution ?? 0),
    fundingRequired,
    minimumFunding: fundingRequired,
    maximumFunding: fundingRequired,
    minimumInvestmentPerInvestor: 0,
    maximumInvestmentPerInvestor: 0,
    projectDurationMonths: raw.tenureMonths ?? 0,
    indicativeExpectedReturn: Number(raw.expectedYieldPct ?? 0),
    riskLevel: 'Medium',
    projectStartDate: '',
    projectEndDate: '',
    businessModelSummary: '',
    proposedShariahContract: raw.proposedShariahContract as Project['proposedShariahContract'],
    revenueModel: '',
    status: raw.status as ProjectStatus,
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    documents: [],
    reviewComments: [],
  };
}

class ProjectService {
  private projects: Project[] = [];

  public async refresh(): Promise<void> {
    this.projects = (await apiClient.getProjects()).map(mapProject);
  }

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

  private upsert(project: Project): void {
    const idx = this.projects.findIndex(p => p.projectId === project.projectId);
    if (idx >= 0) this.projects[idx] = project;
    else this.projects.unshift(project);
  }

  /** Registers a draft project for the signed-in sponsor's organisation. */
  public async createProject(projectData: Partial<Project>, userId: string, tenant: { organisationId: string; countryNodeId: string }): Promise<Project> {
    const fundingRequired = projectData.fundingRequired || 0;
    const created = await apiClient.createProject({
      projectName: projectData.projectName || '',
      description: projectData.description || '',
      organisationId: tenant.organisationId,
      countryNodeId: tenant.countryNodeId,
      sector: projectData.sector || '',
      totalProjectCost: projectData.totalProjectCost || fundingRequired,
      sponsorContribution: projectData.sponsorContribution || 0,
      fundingRequired,
      proposedShariahContract: projectData.proposedShariahContract || 'Mudarabah',
      projectSponsorId: userId,
      expectedYieldPct: projectData.indicativeExpectedReturn || undefined,
      tenureMonths: projectData.projectDurationMonths || undefined,
      location: projectData.location || undefined,
    });
    const project = mapProject(created);
    this.upsert(project);
    return project;
  }

  public async updateProjectStatus(projectId: string, newStatus: ProjectStatus, _userId: string, _userRole: string, comments?: string): Promise<Project> {
    const updated = await apiClient.updateProjectStatus(projectId, { status: newStatus, note: comments });
    const project = mapProject({ ...updated, ...(this.rawExtras(projectId)) });
    this.upsert(project);
    return project;
  }

  /** Names the status response leaves out, kept from the cached project. */
  private rawExtras(projectId: string): Partial<BackendProject> {
    const cached = this.getProjectById(projectId);
    if (!cached) return {};
    return { organisation: { name: cached.organisationName }, projectSponsor: { name: cached.projectSponsorName }, countryNode: { currency: cached.currency } };
  }
}

export const projectService = new ProjectService();
