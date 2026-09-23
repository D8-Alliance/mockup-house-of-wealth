import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PolicyService } from '../policy/policy.service';
import { AddProjectTeamMemberDto, CreateProjectAnnouncementDto, CreateProjectPromotionDto, CreateProjectDto } from './projects.controller';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';
import { BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';

const PROJECT_PROMOTION_PACKAGES = [
  { id: 'pkg_free_listing', title: 'Free Project Listing', badgeType: 'Promoted', durationDays: 0, priceMYR: 0, creditsCost: 0 },
  { id: 'pkg_featured_7d', title: 'Featured Project (7 Days)', badgeType: 'Featured', durationDays: 7, priceMYR: 99, creditsCost: 50 },
  { id: 'pkg_featured_30d', title: 'Featured Project (30 Days)', badgeType: 'Featured', durationDays: 30, priceMYR: 299, creditsCost: 150 },
  { id: 'pkg_sponsored_30d', title: 'Sponsored Project Spotlight (30 Days)', badgeType: 'Sponsored', durationDays: 30, priceMYR: 499, creditsCost: 250 },
] as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async list(user: AuthenticatedUser) {
    // Enforce tenant scope: a caller can only list projects inside their tenant.
    const where = {
      ...tenantScopeFilter(user),
      ...(user.role === 'Project Sponsor' ? { projectSponsorId: user.userId } : {}),
    };

    if (user.role !== 'Super Admin' && !this.policy.can(user.role, 'marketplace', 'read')) {
      throw new ForbiddenException(this.policy.evaluate(user.role, 'marketplace', 'read').reason);
    }

    return this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { countryNode: { select: { currency: true } } },
    });
  }

  async get(id: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({ where: { projectId: id } });
    if (!project) throw new NotFoundException('Project not found');
    assertTenantScope(user, project, 'Project');
    this.assertProjectSponsorScope(user, project.projectSponsorId);
    return project;
  }

  private assertProjectSponsorScope(user: AuthenticatedUser, projectSponsorId: string) {
    if (user.role === 'Project Sponsor' && projectSponsorId !== user.userId) {
      throw new ForbiddenException('Project is not assigned to this sponsor');
    }
  }

  async listDocuments(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    return this.prisma.projectDocument.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      select: { id: true, projectId: true, fileName: true, mimeType: true, fileSize: true, extractionStatus: true, extractionError: true, extractedText: true, uploadedBy: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(projectId: string, file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    if (!file) throw new BadRequestException('A PDF file is required');

    let extractedText = '';
    let extractionStatus = 'NOT_APPLICABLE';
    let extractionError: string | null = null;
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      extractionStatus = 'EXTRACTED';
      try {
        const parsed = await pdfParse(file.buffer);
        extractedText = parsed.text.trim();
        if (extractedText.length < 20) {
          extractionStatus = 'FAILED';
          extractionError = 'The PDF contains no extractable text. Scanned PDFs require OCR.';
        }
      } catch (error) {
        extractionStatus = 'FAILED';
        extractionError = error instanceof Error ? error.message.slice(0, 500) : 'PDF text extraction failed';
      }
    }

    const document = await this.prisma.projectDocument.create({
      data: {
        projectId: project.projectId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        uploadedBy: user.userId,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileContent: file.buffer,
        extractedText,
        extractionStatus,
        extractionError,
      },
      select: { id: true, projectId: true, fileName: true, mimeType: true, fileSize: true, extractionStatus: true, extractionError: true, extractedText: true, uploadedBy: true, createdAt: true, updatedAt: true },
    });
    await this.audit.recordActor(user, {
      action: 'project.document.upload',
      resourceType: 'ProjectDocument',
      resourceId: document.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, fileName: document.fileName, extractionStatus },
    });
    return document;
  }

  async listTeam(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const members = await this.prisma.projectTeamMember.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      include: { user: { select: { id: true, name: true, email: true, profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((member) => this.toTeamMember(member));
  }

  async listTeamCandidates(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const candidates = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roleAssignments: { some: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } },
      },
      include: { roleAssignments: { where: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } } },
      orderBy: { name: 'asc' },
    });
    return candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      roles: candidate.roleAssignments.map((assignment) => assignment.role),
    }));
  }

  async addTeamMember(projectId: string, dto: AddProjectTeamMemberDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const projectRole = dto.projectRole?.trim();
    if (!dto.userId || !projectRole) throw new BadRequestException('A user and project role are required');

    const candidate = await this.prisma.user.findFirst({
      where: {
        id: dto.userId,
        isActive: true,
        roleAssignments: { some: { organisationId: project.organisationId, countryNodeId: project.countryNodeId, isActive: true } },
      },
    });
    if (!candidate) throw new ForbiddenException('The selected user is outside this project tenant or inactive');

    const member = await this.prisma.projectTeamMember.create({
      data: {
        projectId: project.projectId,
        userId: candidate.id,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        projectRole,
      },
      include: { user: { select: { id: true, name: true, email: true, profile: true } } },
    });
    await this.audit.recordActor(user, {
      action: 'project.team_member.add',
      resourceType: 'ProjectTeamMember',
      resourceId: member.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, userId: candidate.id, projectRole },
    });
    return this.toTeamMember(member);
  }

  async removeTeamMember(projectId: string, memberId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const member = await this.prisma.projectTeamMember.findFirst({ where: { id: memberId, projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId } });
    if (!member) throw new NotFoundException('Project team member not found');
    await this.prisma.projectTeamMember.delete({ where: { id: member.id } });
    await this.audit.recordActor(user, {
      action: 'project.team_member.remove',
      resourceType: 'ProjectTeamMember',
      resourceId: member.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, userId: member.userId },
    });
    return { success: true };
  }

  async listAnnouncements(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    return this.prisma.projectAnnouncement.findMany({
      where: { projectId: project.projectId, organisationId: project.organisationId, countryNodeId: project.countryNodeId },
      include: { author: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
    }).then((announcements) => announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      date: announcement.publishedAt.toISOString(),
      author: announcement.author.name,
      type: announcement.announcementType,
      readCount: announcement.readCount,
    })));
  }

  async createAnnouncement(projectId: string, dto: CreateProjectAnnouncementDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const title = dto.title?.trim();
    const body = dto.body?.trim();
    if (!title || !body || !dto.announcementType) throw new BadRequestException('Title, body, and announcement type are required.');

    const allowedTypes: Record<string, string[]> = {
      'Project Sponsor': ['Quarterly Update', 'Milestone Notice', 'Dividends Announcement'],
      'Project Manager': ['Milestone Notice'],
      'Finance Officer': ['Financial Statement', 'Dividends Announcement'],
      'Compliance Officer': ['Compliance Notice'],
      'Shariah Advisor': ['Compliance Notice'],
      'Shariah Reviewer': ['Compliance Notice'],
      'Shariah Committee': ['Compliance Notice'],
    };
    if (!allowedTypes[user.role]?.includes(dto.announcementType)) {
      throw new ForbiddenException(`Role ${user.role} cannot publish ${dto.announcementType} announcements.`);
    }

    const announcement = await this.prisma.projectAnnouncement.create({
      data: {
        projectId: project.projectId,
        organisationId: project.organisationId,
        countryNodeId: project.countryNodeId,
        authorId: user.userId,
        title,
        body,
        announcementType: dto.announcementType,
      },
      include: { author: { select: { name: true } } },
    });
    await this.audit.recordActor(user, {
      action: 'project.announcement.publish',
      resourceType: 'ProjectAnnouncement',
      resourceId: announcement.id,
      organisationId: project.organisationId,
      countryNodeId: project.countryNodeId,
      metadata: { projectId: project.projectId, announcementType: announcement.announcementType },
    });
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      date: announcement.publishedAt.toISOString(),
      author: announcement.author.name,
      type: announcement.announcementType,
      readCount: announcement.readCount,
    };
  }

  listPromotionPackages() {
    return PROJECT_PROMOTION_PACKAGES;
  }

  async listPromotions(projectId: string, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    return this.prisma.projectPromotionCampaign.findMany({ where: { projectId: project.projectId }, orderBy: { createdAt: 'desc' } });
  }

  async createPromotion(projectId: string, dto: CreateProjectPromotionDto, user: AuthenticatedUser) {
    const project = await this.get(projectId, user);
    const promotionPackage = PROJECT_PROMOTION_PACKAGES.find((item) => item.id === dto.packageId);
    if (!promotionPackage) throw new BadRequestException('Promotion package is not available.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.startDate)) throw new BadRequestException('Start date must use YYYY-MM-DD format.');
    if (!['RM', 'CREDITS'].includes(dto.paymentMethod)) throw new BadRequestException('Unsupported payment method.');

    const startDate = new Date(`${dto.startDate}T00:00:00.000Z`);
    if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Start date is invalid.');
    const endDate = promotionPackage.durationDays ? new Date(startDate.getTime() + promotionPackage.durationDays * 86400000) : null;

    return this.prisma.$transaction(async (tx) => {
      let paymentStatus = 'PAID';
      let campaignStatus = 'ACTIVE';
      if (dto.paymentMethod === 'CREDITS' && promotionPackage.creditsCost > 0) {
        const subscription = await tx.membershipSubscription.findUnique({ where: { userId: user.userId } });
        if (!subscription || subscription.aiCreditsRemaining < promotionPackage.creditsCost) {
          throw new BadRequestException('Insufficient Wealth Pooling Credits for this promotion.');
        }
        await tx.membershipSubscription.update({ where: { userId: user.userId }, data: { aiCreditsRemaining: { decrement: promotionPackage.creditsCost } } });
      } else if (dto.paymentMethod === 'RM' && promotionPackage.priceMYR > 0) {
        paymentStatus = 'PENDING';
        campaignStatus = 'PENDING_PAYMENT';
      }

      await tx.projectPromotionCampaign.updateMany({ where: { projectId: project.projectId, status: { in: ['ACTIVE', 'PENDING_PAYMENT'] } }, data: { status: 'EXPIRED' } });
      const campaign = await tx.projectPromotionCampaign.create({
        data: {
          projectId: project.projectId,
          organisationId: project.organisationId,
          countryNodeId: project.countryNodeId,
          ownerId: user.userId,
          packageId: promotionPackage.id,
          packageName: promotionPackage.title,
          badgeType: promotionPackage.badgeType,
          status: campaignStatus,
          startDate,
          endDate,
          priceMYR: promotionPackage.priceMYR,
          creditsCost: promotionPackage.creditsCost,
          paymentMethod: dto.paymentMethod,
          paymentStatus,
        },
      });
      await tx.promotionPayment.create({ data: { campaignId: campaign.id, userId: user.userId, amountMYR: promotionPackage.priceMYR, creditsCost: promotionPackage.creditsCost, method: dto.paymentMethod, status: paymentStatus } });
      await this.audit.recordActor(user, { action: 'project.promotion.create', resourceType: 'ProjectPromotionCampaign', resourceId: campaign.id, organisationId: project.organisationId, countryNodeId: project.countryNodeId, metadata: { packageId: promotionPackage.id, paymentStatus } });
      return campaign;
    });
  }

  private toTeamMember(member: { id: string; projectRole: string; user: { id: string; name: string; email: string; profile: unknown } }) {
    const profile = member.user.profile && typeof member.user.profile === 'object' ? member.user.profile as Record<string, unknown> : {};
    return {
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.projectRole,
      qualification: typeof profile.qualification === 'string' ? profile.qualification : 'Tenant user',
      avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : '',
    };
  }

  async downloadDocument(projectId: string, documentId: string, user: AuthenticatedUser) {
    const document = await this.prisma.projectDocument.findFirst({ where: { id: documentId, projectId }, include: { project: true } });
    if (!document) throw new NotFoundException('Project document not found');
    assertTenantScope(user, document.project, 'Project document');
    this.assertProjectSponsorScope(user, document.project.projectSponsorId);
    return document;
  }

  async create(dto: CreateProjectDto, user: AuthenticatedUser) {
    assertTenantScope(user, { countryNodeId: dto.countryNodeId, organisationId: dto.organisationId }, 'Target tenant');

    const organisation = await this.prisma.organisation.findFirst({
      where: { id: dto.organisationId, countryNodeId: dto.countryNodeId },
      select: { id: true },
    });
    if (!organisation) {
      throw new ForbiddenException('Organisation is outside the requested country node scope');
    }

    const project = await this.prisma.project.create({
      data: {
        projectCode: dto.projectCode,
        projectName: dto.projectName,
        description: dto.description,
        organisationId: dto.organisationId,
        countryNodeId: dto.countryNodeId,
        sector: dto.sector,
        totalProjectCost: dto.totalProjectCost,
        sponsorContribution: dto.sponsorContribution,
        fundingRequired: dto.fundingRequired,
        proposedShariahContract: dto.proposedShariahContract,
        sponsorEntityType: dto.sponsorEntityType?.trim() || null,
        status: 'DRAFT',
        // Sponsors may only create drafts assigned to themselves.
        projectSponsorId: user.role === 'Project Sponsor' ? user.userId : dto.projectSponsorId,
      },
    });

    await this.audit.recordActor(user, {
      action: 'project.create',
      resourceType: 'Project',
      resourceId: project.projectId,
      organisationId: dto.organisationId,
      countryNodeId: dto.countryNodeId,
      metadata: { projectCode: project.projectCode },
    });

    return project;
  }
}
