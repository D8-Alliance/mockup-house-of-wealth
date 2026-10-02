import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Roles a member of the public may give themselves when signing up. Staff roles
 * (Finance Officer, Pool Manager, reviewers, admins) are assigned by an administrator.
 */
export const SELF_REGISTRATION_ROLES = ['Retail Investor', 'Institutional Investor', 'Project Sponsor', 'Asset Owner'] as const;

export class DemoRegisterDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsEmail() @MaxLength(200) email!: string;
  @IsString() @MinLength(2) @MaxLength(200) organisation!: string;
  @IsString() @MaxLength(20) countryNodeId!: string;
  @IsIn(SELF_REGISTRATION_ROLES) role!: (typeof SELF_REGISTRATION_ROLES)[number];
}

/**
 * Sign-up for local/demo use (AUTH_MODE=mock). Real deployments register users in
 * Keycloak, so this is refused in any other mode. No password is stored: mock mode
 * has no passwords, and the frontend keeps the demo session in the browser.
 */
@Injectable()
export class DemoRegistrationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async register(input: DemoRegisterDto) {
    if (process.env.AUTH_MODE !== 'mock') {
      throw new ForbiddenException('Self-registration here is only available in demo mode. Use the identity provider sign-up.');
    }
    const email = input.email.trim().toLowerCase();
    const country = await this.prisma.countryNode.findUnique({ where: { code: input.countryNodeId } });
    if (!country) throw new NotFoundException('Unknown country node.');
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email address already exists. Sign in instead.');
    }

    const suffix = randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
    const userId = `USR-REG-${suffix}`;
    const organisationId = `ORG-REG-${suffix}`;
    const role = input.role.replace(/ /g, '_') as PrismaUserRole;

    await this.prisma.$transaction(async (tx) => {
      // Each sign-up gets its own organisation, so new users never join an existing tenant.
      await tx.organisation.create({ data: { id: organisationId, name: input.organisation.trim(), countryNodeId: country.code } });
      await tx.user.create({ data: { id: userId, idpProvider: 'mock', idpSubjectId: userId, email, name: input.name.trim(), isActive: true } });
      await tx.userRoleAssignment.create({ data: { userId, role, organisationId, countryNodeId: country.code, assignedBy: 'SELF_REGISTRATION' } });
    });
    await this.audit.record({ userId, userEmail: email, action: 'auth.self_register', resourceType: 'User', resourceId: userId, organisationId, countryNodeId: country.code, metadata: { role: input.role, mode: 'demo' } });

    return { userId, organisationId, organisationName: input.organisation.trim(), countryNodeId: country.code, role: input.role, email, name: input.name.trim() };
  }
}
