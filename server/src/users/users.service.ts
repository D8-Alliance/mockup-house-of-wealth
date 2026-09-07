import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { UserRole } from '../policy/permissions';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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
  async getUserRoles(userId: string): Promise<Array<{ role: UserRole; organisationId: string; countryNodeId: string }>> {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId, isActive: true },
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

  private toPrismaRole(role: UserRole): PrismaUserRole {
    return role.replace(/ /g, '_') as PrismaUserRole;
  }

  private fromPrismaRole(role: PrismaUserRole): UserRole {
    return role.replace(/_/g, ' ') as UserRole;
  }
}
