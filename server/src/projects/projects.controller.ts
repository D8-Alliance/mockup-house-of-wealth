import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Roles, RequirePermission } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/identity.service';
import { IsString, MaxLength } from 'class-validator';
import { ProjectsService } from './projects.service';

// Declared before the controller: its decorators reference this class at load time.
export class ReopenProjectDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

// Reject unsupported files with a clear 400 instead of silently dropping them
// (which surfaced as a misleading 'file is required' error).
const uploadFilter = (allowed: string[]) => (_request: unknown, file: Express.Multer.File, callback: (error: Error | null, accept: boolean) => void) => {
  const extension = file.originalname.toLowerCase().split('.').pop() || '';
  if (allowed.includes(extension)) callback(null, true);
  else callback(new BadRequestException(`Unsupported file type .${extension}. Allowed: ${allowed.join(', ').toUpperCase()}.`), false);
};

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(
    'Super Admin',
    'Country Admin',
    'Organization Admin',
    'Project Sponsor',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'Corporate Investor',
    'Family Office',
    'Shariah Advisor',
    'Shariah Reviewer',
    'Shariah Committee',
  )
  @RequirePermission('marketplace', 'read')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.list(user);
  }

  @Get(':id/lifecycle')
  @RequirePermission('marketplace', 'read')
  lifecycle(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.lifecycle(id, user);
  }

  @Post(':id/status')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'update')
  updateStatus(@Param('id') id: string, @Body() body: UpdateProjectStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateStatus(id, body, user);
  }

  @Post(':id/reopen')
  @Roles('Super Admin', 'Country Admin')
  reopen(@Param('id') id: string, @Body() body: ReopenProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.reopenProject(id, body.reason, user);
  }

  @Post(':id/milestones')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'update')
  createMilestone(@Param('id') id: string, @Body() body: CreateProjectMilestoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createMilestone(id, body, user);
  }

  @Patch(':id/milestones/:milestoneId')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'update')
  updateMilestone(@Param('id') id: string, @Param('milestoneId') milestoneId: string, @Body() body: UpdateProjectMilestoneDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.updateMilestone(id, milestoneId, body, user);
  }

  @Get(':id/documents')
  @Roles(
    'Super Admin',
    'Country Admin',
    'Organization Admin',
    'Project Sponsor',
    'Project Manager',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'Corporate Investor',
    'Family Office',
    'Portfolio Manager',
    'Shariah Advisor',
    'Shariah Reviewer',
    'Shariah Committee',
  )
  @RequirePermission('marketplace', 'read')
  listDocuments(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listDocuments(id, user);
  }

  @Get(':id/evidence/requirements')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  @RequirePermission('marketplace', 'read')
  listEvidenceRequirements(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listEvidenceRequirements(id, user);
  }

  @Get(':id/team/candidates')
  @Roles(
    'Super Admin',
    'Country Admin',
    'Organization Admin',
    'Project Sponsor',
    'Project Manager',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'Corporate Investor',
    'Family Office',
    'Portfolio Manager',
    'Shariah Advisor',
    'Shariah Reviewer',
    'Shariah Committee',
  )
  @RequirePermission('marketplace', 'read')
  listTeamCandidates(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listTeamCandidates(id, user);
  }

  @Get(':id/team')
  @Roles(
    'Super Admin',
    'Country Admin',
    'Organization Admin',
    'Project Sponsor',
    'Project Manager',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'Corporate Investor',
    'Family Office',
    'Portfolio Manager',
    'Shariah Advisor',
    'Shariah Reviewer',
    'Shariah Committee',
  )
  @RequirePermission('marketplace', 'read')
  listTeam(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listTeam(id, user);
  }

  @Post(':id/team')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'create')
  addTeamMember(@Param('id') id: string, @Body() body: AddProjectTeamMemberDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.addTeamMember(id, body, user);
  }

  @Delete(':id/team/:memberId')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'create')
  removeTeamMember(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.removeTeamMember(id, memberId, user);
  }

  @Get(':id/announcements')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager', 'Finance Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee', 'Retail Investor', 'HNWI Investor', 'Institutional Investor', 'Corporate Investor', 'Family Office', 'Portfolio Manager')
  listAnnouncements(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listAnnouncements(id, user);
  }

  @Post(':id/announcements')
  @Roles('Project Sponsor', 'Project Manager', 'Finance Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  createAnnouncement(@Param('id') id: string, @Body() body: CreateProjectAnnouncementDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createAnnouncement(id, body, user);
  }

  @Get(':id/promotions/packages')
  @Roles('Project Sponsor')
  listPromotionPackages() {
    return this.projectsService.listPromotionPackages();
  }

  @Get(':id/promotions')
  @Roles('Project Sponsor')
  listPromotions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.listPromotions(id, user);
  }

  @Post(':id/promotions')
  @Roles('Project Sponsor')
  createPromotion(@Param('id') id: string, @Body() body: CreateProjectPromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.createPromotion(id, body, user);
  }

  @Post(':id/promotions/:campaignId/payment/confirm')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor')
  confirmPromotionPayment(@Param('id') id: string, @Param('campaignId') campaignId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.confirmPromotionPayment(id, campaignId, user);
  }

  @Get(':id/promotions/:campaignId/receipt')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor')
  async promotionReceipt(@Param('id') id: string, @Param('campaignId') campaignId: string, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const receipt = await this.projectsService.getPromotionReceipt(id, campaignId, user);
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.txt"`);
    response.send(receipt.content);
  }

  @Post(':id/documents')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'create')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: uploadFilter(['pdf', 'docx', 'xlsx', 'csv']),
  }))
  uploadDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.uploadDocument(id, file, user);
  }

  @Post(':id/evidence/:evidenceType/upload')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Sponsor', 'Project Manager')
  @RequirePermission('assets', 'create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 }, fileFilter: uploadFilter(['pdf', 'xlsx', 'csv']) }))
  uploadEvidence(@Param('id') id: string, @Param('evidenceType') evidenceType: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.uploadEvidence(id, evidenceType.toUpperCase(), file, user);
  }

  @Post(':id/evidence/:evidenceType/verify')
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Finance Officer', 'Risk Officer', 'Compliance Officer', 'Shariah Advisor', 'Shariah Reviewer', 'Shariah Committee')
  verifyEvidence(@Param('id') id: string, @Param('evidenceType') evidenceType: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.verifyEvidence(id, evidenceType.toUpperCase(), user);
  }

  @Get(':id/documents/:documentId/download')
  @Roles(
    'Super Admin',
    'Country Admin',
    'Organization Admin',
    'Project Sponsor',
    'Project Manager',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'Corporate Investor',
    'Family Office',
    'Portfolio Manager',
    'Shariah Advisor',
    'Shariah Reviewer',
    'Shariah Committee',
  )
  @RequirePermission('marketplace', 'read')
  async downloadDocument(@Param('id') id: string, @Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    const document = await this.projectsService.downloadDocument(id, documentId, user);
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${document.fileName.replace(/"/g, '')}"`);
    response.send(document.fileContent);
  }

  @Get(':id')
  @RequirePermission('marketplace', 'read')
  get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.get(id, user);
  }

  @Post()
  @Roles('Super Admin', 'Country Admin', 'Organization Admin', 'Project Manager', 'Project Sponsor')
  @RequirePermission('assets', 'create')
  create(@Body() body: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.create(body, user);
  }
}

export interface CreateProjectDto {
  projectCode: string;
  projectName: string;
  description: string;
  organisationId: string;
  countryNodeId: string;
  sector: string;
  totalProjectCost: number;
  sponsorContribution: number;
  fundingRequired: number;
  proposedShariahContract: string;
  projectSponsorId: string;
  sponsorEntityType?: string;
}

export interface UpdateProjectStatusDto { status: string; note?: string; }
export interface CreateProjectMilestoneDto { title: string; targetDate?: string; completionPct?: number; disbursementAmount?: number; status?: string; }
export interface UpdateProjectMilestoneDto { completionPct?: number; status?: string; shariahSignoff?: boolean; auditorSignoff?: boolean; }

export interface AddProjectTeamMemberDto {
  userId: string;
  projectRole: string;
}

export interface CreateProjectAnnouncementDto {
  title: string;
  body: string;
  announcementType: 'Quarterly Update' | 'Financial Statement' | 'Milestone Notice' | 'Dividends Announcement' | 'Compliance Notice';
}

export interface CreateProjectPromotionDto {
  packageId: string;
  startDate: string;
  paymentMethod: 'RM' | 'CREDITS';
}
