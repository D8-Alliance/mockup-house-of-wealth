import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { UserRole, PRIVILEGED_ROLES } from '../policy/permissions';
import { PolicyService } from '../policy/policy.service';
import { normalizePhone } from '../tenancy/country-phone';
import { tenantScopeFilter } from '../tenancy/tenant-scope';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly policy: PolicyService,
  ) {}

  async getCurrentUser(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { roleAssignments: { where: { ...tenantScopeFilter(actor), isActive: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toDirectoryUser(user);
  }

  /** Self-service profile fields. The phone is stored in E.164 using the user's country code. */
  async updateMyProfile(actor: AuthenticatedUser, input: { phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { profile: true } });
    if (!user) throw new NotFoundException('User not found');
    const current = user.profile && typeof user.profile === 'object' && !Array.isArray(user.profile) ? user.profile as Record<string, unknown> : {};
    const phone = input.phone === undefined ? current.phone : input.phone.trim() ? normalizePhone(input.phone, actor.countryNodeId) : undefined;
    await this.prisma.user.update({ where: { id: actor.userId }, data: { profile: { ...current, phone } as Prisma.InputJsonObject } });
    await this.audit.recordActor(actor, { action: 'user.profile.update', resourceType: 'User', resourceId: actor.userId, organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, metadata: { fields: Object.keys(input) } });
    return this.getCurrentUser(actor);
  }

  async listUsers(actor: AuthenticatedUser) {
    const where = actor.role === 'Super Admin'
      ? {}
      : actor.role === 'Country Admin'
        ? { roleAssignments: { some: { countryNodeId: actor.countryNodeId, isActive: true } } }
        : { roleAssignments: { some: { organisationId: actor.organisationId, countryNodeId: actor.countryNodeId, isActive: true } } };

    const users = await this.prisma.user.findMany({
      where,
      include: { roleAssignments: { where: { ...tenantScopeFilter(actor), isActive: true } } },
      orderBy: { name: 'asc' },
    });
    return users.map((user) => this.toDirectoryUser(user));
  }

  async getAccess(actor: AuthenticatedUser) {
    return {
      userId: actor.userId,
      role: actor.role,
      assignedRoles: actor.assignedRoles,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
    };
  }

  async updateStatus(userId: string, status: string, actor: AuthenticatedUser) {
    if (!['ACTIVE', 'PENDING', 'SUSPENDED', 'LOCKED', 'DEACTIVATED'].includes(status)) {
      throw new BadRequestException('Unsupported user status');
    }
    if (!this.policy.can(actor.role, 'users', 'update')) {
      throw new ForbiddenException(this.policy.evaluate(actor.role, 'users', 'update').reason);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (actor.role === 'Country Admin' && !(await this.hasTenantAssignment(userId, actor.countryNodeId))) {
      throw new ForbiddenException('User is outside your country node scope');
    }
    if (actor.role === 'Organization Admin' && !(await this.hasTenantAssignment(userId, actor.countryNodeId, actor.organisationId))) {
      throw new ForbiddenException('User is outside your organisation scope');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: status === 'ACTIVE',
        profile: { ...(user.profile as Record<string, unknown> | null), status },
      },
      include: { roleAssignments: { where: { isActive: true } } },
    });
    await this.audit.recordActor(actor, {
      action: 'user.status_update',
      resourceType: 'User',
      resourceId: userId,
      countryNodeId: actor.countryNodeId,
      organisationId: actor.organisationId,
      metadata: { status, targetUser: user.email },
    });
    return this.toDirectoryUser(updated);
  }

  /**
   * Assign a role to a user in a specific organisation and country node.
   * Only Country Admin or Super Admin can assign roles.
   */
  async assignRole(
    userId: string,
    role: UserRole,
    organisationId: string,
    countryNodeId: string,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    // Permission check: only Super Admin and Country Admin can assign roles
    if (actor.role !== 'Super Admin' && actor.role !== 'Country Admin') {
      throw new ForbiddenException('Only Super Admin or Country Admin can assign roles');
    }

    // Escalation guard: privileged roles can only be granted by a Super Admin.
    if (PRIVILEGED_ROLES.has(role) && actor.role !== 'Super Admin') {
      throw new ForbiddenException(`Only Super Admin can assign the privileged role "${role}"`);
    }

    // Tenant check: Country Admin can only assign roles in their own country node
    if (actor.role === 'Country Admin' && countryNodeId !== actor.countryNodeId) {
      throw new ForbiddenException('Country Admin can only assign roles in their own country node');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) throw new NotFoundException('Organisation not found');

    const countryNode = await this.prisma.countryNode.findUnique({ where: { code: countryNodeId } });
    if (!countryNode) throw new NotFoundException('Country node not found');
    if (org.countryNodeId !== countryNodeId) throw new BadRequestException('Organisation does not belong to the requested country node');
    if (org.status !== 'ACTIVE' || countryNode.status !== 'ACTIVE') throw new BadRequestException('Roles can only be assigned inside active tenants');

    // Check if assignment already exists
    const existing = await this.prisma.userRoleAssignment.findUnique({
      where: {
        userId_role_organisationId_countryNodeId: {
          userId,
          role: this.toPrismaRole(role),
          organisationId,
          countryNodeId,
        },
      },
    });

    if (existing && existing.isActive) {
      throw new BadRequestException(`User already has role ${role} in this organisation/country`);
    }

    if (existing && !existing.isActive) {
      // Reactivate the assignment
      await this.prisma.userRoleAssignment.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          revokedBy: null,
          revokedAt: null,
          assignedBy: actor.userId,
          assignedAt: new Date(),
        },
      });
    } else {
      // Create new assignment
      await this.prisma.userRoleAssignment.create({
        data: {
          userId,
          role: this.toPrismaRole(role),
          organisationId,
          countryNodeId,
          assignedBy: actor.userId,
        },
      });
    }

    await this.audit.recordActor(actor, {
      action: 'user.role_assignment',
      resourceType: 'User',
      resourceId: userId,
      organisationId,
      countryNodeId,
      metadata: { role, targetUser: user.email },
    });

    return { success: true, message: `Role ${role} assigned to user ${user.email}` };
  }

  /**
   * Revoke a role from a user in a specific organisation and country node.
   */
  async revokeRole(
    userId: string,
    role: UserRole,
    organisationId: string,
    countryNodeId: string,
    actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    // Permission check
    if (actor.role !== 'Super Admin' && actor.role !== 'Country Admin') {
      throw new ForbiddenException('Only Super Admin or Country Admin can revoke roles');
    }

    // Escalation guard: privileged roles can only be revoked by a Super Admin.
    if (PRIVILEGED_ROLES.has(role) && actor.role !== 'Super Admin') {
      throw new ForbiddenException(`Only Super Admin can revoke the privileged role "${role}"`);
    }

    // Tenant check
    if (actor.role === 'Country Admin' && countryNodeId !== actor.countryNodeId) {
      throw new ForbiddenException('Country Admin can only revoke roles in their own country node');
    }

    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: {
        userId_role_organisationId_countryNodeId: {
          userId,
          role: this.toPrismaRole(role),
          organisationId,
          countryNodeId,
        },
      },
    });

    if (!assignment || !assignment.isActive) {
      throw new NotFoundException('Role assignment not found');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.userRoleAssignment.update({
      where: { id: assignment.id },
      data: {
        isActive: false,
        revokedBy: actor.userId,
        revokedAt: new Date(),
      },
    });

    await this.audit.recordActor(actor, {
      action: 'user.role_revocation',
      resourceType: 'User',
      resourceId: userId,
      organisationId,
      countryNodeId,
      metadata: { role, targetUser: user?.email },
    });

    return { success: true, message: `Role ${role} revoked from user ${user?.email}` };
  }

  /**
   * List all active roles for a user.
   */
  async getUserRoles(userId: string, actor: AuthenticatedUser): Promise<Array<{ role: UserRole; organisationId: string; countryNodeId: string }>> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, isActive: true, ...tenantScopeFilter(actor) },
      select: { role: true, organisationId: true, countryNodeId: true },
    });

    return assignments.map((assignment) => ({
      ...assignment,
      role: this.fromPrismaRole(assignment.role),
    }));
  }

  /**
   * Get the primary (first) role for a user in a specific country node.
   * Used by IdentityService if OIDC provider doesn't include role in token.
   */
  async getPrimaryRoleInCountry(userId: string, countryNodeId: string): Promise<UserRole | null> {
    const assignment = await this.prisma.userRoleAssignment.findFirst({
      where: { userId, countryNodeId, isActive: true },
      select: { role: true },
      orderBy: { assignedAt: 'asc' },
    });

    return assignment ? this.fromPrismaRole(assignment.role) : null;
  }

  private toDirectoryUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      profile: user.profile,
      assignedRoles: user.roleAssignments.map((assignment: { role: PrismaUserRole; organisationId: string; countryNodeId: string }) => ({
        role: this.fromPrismaRole(assignment.role),
        organisationId: assignment.organisationId,
        countryNodeId: assignment.countryNodeId,
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async hasTenantAssignment(userId: string, countryNodeId: string, organisationId?: string) {
    return Boolean(await this.prisma.userRoleAssignment.findFirst({
      where: { userId, countryNodeId, ...(organisationId ? { organisationId } : {}), isActive: true },
      select: { id: true },
    }));
  }

  private toPrismaRole(role: UserRole): PrismaUserRole {
    return role.replace(/ /g, '_') as PrismaUserRole;
  }

  private fromPrismaRole(role: PrismaUserRole): UserRole {
    return role.replace(/_/g, ' ') as UserRole;
  }
}
