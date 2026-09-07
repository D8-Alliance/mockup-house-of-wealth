import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
            userEmail: input.userEmail,
            countryCode: input.countryCode,
            countryName: input.countryName,
            organisationName: input.organisationName,
            pdpType: input.pdpType,
            payload: input.payload as Prisma.InputJsonValue,
            kybStatus: 'IN_PROGRESS',
          },
        })
      : await this.prisma.pdpApplication.create({
          data: {
            applicationNumber: await this.nextApplicationNumber(),
            userId: actor.userId,
            userEmail: input.userEmail,
            countryCode: input.countryCode,
            countryName: input.countryName,
            organisationName: input.organisationName,
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

    const submitted = await this.prisma.pdpApplication.update({
      where: { id },
      data: { status: 'SUBMITTED', kybStatus: 'SUBMITTED', submittedAt: new Date() },
    });

    await this.audit.recordActor(actor, {
      action: 'pdp.application.submit',
      resourceType: 'PdpApplication',
      resourceId: submitted.id,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { applicationNumber: submitted.applicationNumber, pdpType: submitted.pdpType },
    });

    return this.toResponse(submitted);
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
