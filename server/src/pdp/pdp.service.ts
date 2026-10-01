import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { SavePdpApplicationDto } from './pdp.dto';

@Injectable()
export class PdpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async saveDraft(actor: AuthenticatedUser, input: SavePdpApplicationDto) {
    const [countryNode, organisation] = await Promise.all([
      this.prisma.countryNode.findUnique({ where: { code: actor.countryNodeId } }),
      this.prisma.organisation.findUnique({ where: { id: actor.organisationId } }),
    ]);
    if (!countryNode || !organisation || organisation.countryNodeId !== countryNode.code) {
      throw new ForbiddenException('Authenticated tenant is not valid');
    }

    const existing = input.id
      ? await this.prisma.pdpApplication.findUnique({ where: { id: input.id } })
      : await this.prisma.pdpApplication.findFirst({
          where: { userId: actor.userId, status: 'DRAFT' },
          orderBy: { createdAt: 'desc' },
        });

    if (existing && existing.userId !== actor.userId) {
      throw new ForbiddenException('You cannot edit another user\'s PDP application');
    }
    if (existing && existing.status !== 'DRAFT') {
      throw new BadRequestException('Only draft PDP applications can be edited');
    }

    const application = existing
      ? await this.prisma.pdpApplication.update({
          where: { id: existing.id },
          data: {
            userEmail: actor.email,
            countryCode: countryNode.code.replace(/^CN-/, ''),
            countryName: countryNode.name,
            organisationName: organisation.name,
            pdpType: input.pdpType,
            payload: input.payload as Prisma.InputJsonValue,
            kybStatus: 'IN_PROGRESS',
          },
        })
      : await this.prisma.pdpApplication.create({
          data: {
            applicationNumber: await this.nextApplicationNumber(),
            userId: actor.userId,
            userEmail: actor.email,
            countryCode: countryNode.code.replace(/^CN-/, ''),
            countryName: countryNode.name,
            organisationName: organisation.name,
            pdpType: input.pdpType,
            payload: input.payload as Prisma.InputJsonValue,
          },
        });

    return this.toResponse(application);
  }

  async submit(actor: AuthenticatedUser, id: string) {
    const application = await this.prisma.pdpApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('PDP application not found');
    if (application.userId !== actor.userId) throw new ForbiddenException('You cannot submit another user\'s PDP application');
    if (application.status !== 'DRAFT') throw new BadRequestException('Only draft PDP applications can be submitted');

    const payload = application.payload as Record<string, unknown>;
    const compliance = payload.compliance as Record<string, unknown> | undefined;
    const requiredDeclarations = [
      'amlCftDeclaration',
      'sourceOfFundsDeclaration',
      'beneficialOwnershipAccurate',
      'sanctionsNonMatchDeclared',
      'regulatoryComplianceAgreed',
      'shariahComplianceAttested',
      'termsAndConditionsAccepted',
      'privacyConsentGranted',
    ];
    if (!compliance || requiredDeclarations.some((key) => compliance[key] !== true)) {
      throw new BadRequestException('All compliance declarations must be accepted before submission');
    }

    const kybModule = await this.prisma.featureModule.findUnique({ where: { moduleKey: 'KYB_VERIFICATION' } });
    const kybStatus = kybModule?.mode === 'MANUAL_REVIEW' ? 'PENDING_MANUAL_REVIEW' : 'SUBMITTED';
    const submitted = await this.prisma.pdpApplication.update({
      where: { id },
      data: { status: 'SUBMITTED', kybStatus, submittedAt: new Date() },
    });

    await this.audit.recordActor(actor, {
      action: 'pdp.application.submit',
      resourceType: 'PdpApplication',
      resourceId: submitted.id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { applicationNumber: submitted.applicationNumber, pdpType: submitted.pdpType, kybMode: kybModule?.mode ?? 'ACTIVE' },
    });

    return this.toResponse(submitted);
  }

  async reviewKyb(actor: AuthenticatedUser, id: string, decision: 'APPROVED' | 'REJECTED', justification: string) {
    if (!justification.trim()) throw new BadRequestException('A manual review justification is required');
    const application = await this.prisma.pdpApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('PDP application not found');
    // countryCode is stored without the CN- prefix (see saveDraft). Super Admin is global and may review any country.
    if (actor.role !== 'Super Admin' && application.countryCode !== actor.countryNodeId.replace(/^CN-/, '')) {
      throw new ForbiddenException('You can only review KYB applications from your own country');
    }
    if (application.userId === actor.userId) throw new ForbiddenException('You cannot review your own KYB application');
    const reviewable = ['PENDING_MANUAL_REVIEW', 'SUBMITTED', 'UNDER_REVIEW'];
    if (!reviewable.includes(application.kybStatus)) {
      throw new BadRequestException('This KYB application is not awaiting review');
    }

    // Conditional on status so two reviewers deciding at once cannot both win.
    const updated = await this.prisma.pdpApplication.updateMany({
      where: { id, kybStatus: { in: reviewable } },
      data: { kybStatus: decision === 'APPROVED' ? 'VERIFIED_MANUAL' : 'REJECTED' },
    });
    if (!updated.count) throw new ConflictException('This KYB application was already reviewed');
    const reviewed = await this.prisma.pdpApplication.findUniqueOrThrow({ where: { id } });
    await this.audit.recordActor(actor, {
      action: `pdp.kyb.${decision.toLowerCase()}`,
      resourceType: 'PdpApplication',
      resourceId: id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { justification, manualReview: true, applicationCountryCode: application.countryCode },
    });
    return this.toResponse(reviewed);
  }

  async getMine(actor: AuthenticatedUser) {
    const applications = await this.prisma.pdpApplication.findMany({
      where: { userId: actor.userId },
      orderBy: { updatedAt: 'desc' },
    });
    return applications.map((application) => this.toResponse(application));
  }

  private async nextApplicationNumber(): Promise<string> {
    const year = new Date().getUTCFullYear();
    const count = await this.prisma.pdpApplication.count({ where: { applicationNumber: { startsWith: `PDP-APP-${year}-` } } });
    return `PDP-APP-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  private toResponse(application: any) {
    return {
      ...application,
      payload: application.payload,
      submittedAt: application.submittedAt?.toISOString() ?? undefined,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }
}
