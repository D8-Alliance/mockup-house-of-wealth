import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PRIVILEGED_ROLES } from '../policy/permissions';
import { PrismaService } from '../prisma.service';
import { CreateCountryNodeDto, CreateOrganisationDto, MoveUserDto, SetStatusDto } from './tenant-admin.dto';

const toPrisma = (role: string) => role.replace(/ /g, '_') as PrismaUserRole;
/** Roles only the Super Admin may move between organisations: the admins themselves. */
const ADMIN_ROLES = new Set<PrismaUserRole>([...[...PRIVILEGED_ROLES].map(toPrisma), 'Country_Admin' as PrismaUserRole]);
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Eight characters without look-alikes (no 0/O, 1/I). */
function shortCode() {
  return [...randomBytes(8)].map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

/**
 * Tenant administration: creating and suspending organisations and country nodes, and moving a person to another
 * organisation in their country. Users, their status and their roles are managed in UsersService. A suspended
 * organisation or country stops its members signing in (IdentityService) and refuses new role assignments.
 */
@Injectable()
export class TenantAdminService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private requireAdmin(actor: AuthenticatedUser) {
    if (actor.role !== 'Super Admin' && actor.role !== 'Country Admin') throw new ForbiddenException('Only Super Admin or Country Admin manages organisations.');
  }

  /** Where the Super Admin's own access lives, which must never be switched off. */
  private async superAdminTenants() {
    const rows = await this.prisma.userRoleAssignment.findMany({ where: { role: 'Super_Admin', isActive: true }, select: { organisationId: true, countryNodeId: true } });
    return { organisations: new Set(rows.map((row) => row.organisationId)), countries: new Set(rows.map((row) => row.countryNodeId)) };
  }

  // Country nodes (Super Admin)

  async listCountryNodes(actor: AuthenticatedUser) {
    this.requireAdmin(actor);
    return this.prisma.countryNode.findMany({ where: actor.role === 'Super Admin' ? {} : { code: actor.countryNodeId }, orderBy: { name: 'asc' }, select: { code: true, name: true, currency: true, timezone: true, regulatoryProfile: true, status: true } });
  }

  async createCountryNode(actor: AuthenticatedUser, input: CreateCountryNodeDto) {
    if (actor.role !== 'Super Admin') throw new ForbiddenException('Only the Super Admin adds a country node.');
    if (await this.prisma.countryNode.findUnique({ where: { code: input.code } })) throw new ConflictException(`${input.code} already exists.`);
    const node = await this.prisma.countryNode.create({
      data: { code: input.code, name: input.name, currency: input.currency, timezone: input.timezone, regulatoryProfile: input.regulatoryProfile, status: 'ACTIVE', verificationStatus: 'PENDING', flagUrl: '' },
      select: { code: true, name: true, currency: true, timezone: true, regulatoryProfile: true, status: true },
    });
    await this.audit.recordActor(actor, { action: 'country_node.create', resourceType: 'CountryNode', resourceId: node.code, countryNodeId: node.code, metadata: { ...node } });
    return node;
  }

  async setCountryNodeStatus(actor: AuthenticatedUser, code: string, input: SetStatusDto) {
    if (actor.role !== 'Super Admin') throw new ForbiddenException('Only the Super Admin activates or deactivates a country node.');
    const node = await this.prisma.countryNode.findUnique({ where: { code } });
    if (!node) throw new NotFoundException('Country node not found.');
    if (input.status === 'SUSPENDED' && (await this.superAdminTenants()).countries.has(code)) throw new ForbiddenException('The Super Admin works from this country node, so it cannot be deactivated.');
    if (node.status === input.status) return node;
    const updated = await this.prisma.countryNode.update({ where: { code }, data: { status: input.status } });
    const people = await this.prisma.userRoleAssignment.findMany({ where: { countryNodeId: code, isActive: true }, select: { userId: true }, distinct: ['userId'] });
    await this.audit.recordActor(actor, { action: input.status === 'ACTIVE' ? 'country_node.activate' : 'country_node.suspend', resourceType: 'CountryNode', resourceId: code, countryNodeId: code, metadata: { from: node.status, to: input.status, reason: input.reason, peopleAffected: people.length } });
    return { ...updated, peopleAffected: people.length };
  }

  // Organisations

  async createOrganisation(actor: AuthenticatedUser, input: CreateOrganisationDto) {
    this.requireAdmin(actor);
    const countryNodeId = actor.role === 'Super Admin' ? input.countryNodeId : actor.countryNodeId;
    if (!countryNodeId) throw new BadRequestException('Choose the country of the organisation.');
    const node = await this.prisma.countryNode.findUnique({ where: { code: countryNodeId } });
    if (!node) throw new NotFoundException('Country node not found.');
    if (node.status !== 'ACTIVE') throw new BadRequestException('Organisations can only be added to an active country node.');
    const duplicate = await this.prisma.organisation.findFirst({ where: { countryNodeId, name: { equals: input.name, mode: 'insensitive' } }, select: { id: true } });
    if (duplicate) throw new ConflictException(`An organisation named "${input.name}" already exists in this country (${duplicate.id}).`);
    const id = `ORG-${countryNodeId.replace(/^CN-/, '')}-${shortCode()}`;
    const organisation = await this.prisma.organisation.create({
      data: { id, name: input.name, countryNodeId, status: 'ACTIVE', entityType: input.entityType ?? null, registrationNumber: input.registrationNumber || null },
      select: { id: true, name: true, countryNodeId: true, status: true, entityType: true, registrationNumber: true, kybStatus: true, createdAt: true },
    });
    await this.audit.recordActor(actor, { action: 'organisation.create', resourceType: 'Organisation', resourceId: id, organisationId: id, countryNodeId, metadata: { name: input.name, entityType: input.entityType ?? null } });
    return organisation;
  }

  async setOrganisationStatus(actor: AuthenticatedUser, organisationId: string, input: SetStatusDto) {
    this.requireAdmin(actor);
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!organisation) throw new NotFoundException('Organisation not found.');
    if (actor.role === 'Country Admin' && organisation.countryNodeId !== actor.countryNodeId) throw new ForbiddenException('This organisation is outside your country.');
    if (input.status === 'SUSPENDED') {
      if (organisation.id === actor.organisationId) throw new ForbiddenException('You cannot suspend your own organisation.');
      if ((await this.superAdminTenants()).organisations.has(organisation.id)) throw new ForbiddenException('The Super Admin belongs to this organisation, so it cannot be suspended.');
      // A Country Admin may not cut off another administrator's organisation; only the Super Admin can.
      if (actor.role !== 'Super Admin' && await this.prisma.userRoleAssignment.findFirst({ where: { organisationId, isActive: true, role: { in: [...ADMIN_ROLES] } }, select: { id: true } })) {
        throw new ForbiddenException('An administrator belongs to this organisation; only the Super Admin can suspend it.');
      }
    }
    if (organisation.status === input.status) return organisation;
    const updated = await this.prisma.organisation.update({ where: { id: organisationId }, data: { status: input.status } });
    const people = await this.prisma.userRoleAssignment.findMany({ where: { organisationId, isActive: true }, select: { userId: true }, distinct: ['userId'] });
    await this.audit.recordActor(actor, { action: input.status === 'ACTIVE' ? 'organisation.activate' : 'organisation.suspend', resourceType: 'Organisation', resourceId: organisationId, organisationId, countryNodeId: organisation.countryNodeId, metadata: { from: organisation.status, to: input.status, reason: input.reason, peopleAffected: people.length } });
    return { ...updated, peopleAffected: people.length };
  }

  // Moving a person

  /**
   * Moves a person's active roles to another active organisation of the same country (the account's country never
   * changes). The old assignments are revoked, not deleted, so the history of who held what stays.
   */
  async moveUser(actor: AuthenticatedUser, userId: string, input: MoveUserDto) {
    this.requireAdmin(actor);
    if (userId === actor.userId) throw new ForbiddenException('You cannot move yourself. Ask another administrator.');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, homeCountryNodeId: true, roleAssignments: { where: { isActive: true }, select: { id: true, role: true, organisationId: true, countryNodeId: true } } } });
    if (!user) throw new NotFoundException('User not found.');
    const assignments = user.roleAssignments;
    if (!assignments.length) throw new BadRequestException('This person has no active role to move. Assign a role in the new organisation instead.');
    if (assignments.some((assignment) => assignment.role === 'Super_Admin')) throw new ForbiddenException('The Super Admin cannot be moved.');
    const countries = new Set(assignments.map((assignment) => assignment.countryNodeId));
    const country = user.homeCountryNodeId ?? [...countries][0];
    if (countries.size > 1 || !countries.has(country)) throw new BadRequestException('This person holds roles in more than one country; move them role by role in Role Management.');
    if (actor.role === 'Country Admin') {
      if (country !== actor.countryNodeId) throw new ForbiddenException('This person is outside your country.');
      if (assignments.some((assignment) => ADMIN_ROLES.has(assignment.role))) throw new ForbiddenException('Only the Super Admin can move an administrator.');
    }
    const target = await this.prisma.organisation.findUnique({ where: { id: input.organisationId }, include: { countryNode: { select: { status: true } } } });
    if (!target) throw new NotFoundException('Organisation not found.');
    if (target.countryNodeId !== country) throw new BadRequestException('A person can only move to an organisation in their own country.');
    if (target.status !== 'ACTIVE' || target.countryNode.status !== 'ACTIVE') throw new BadRequestException('The new organisation, or its country, is not active.');
    const moving = assignments.filter((assignment) => assignment.organisationId !== target.id);
    if (!moving.length) throw new BadRequestException('This person is already in that organisation.');

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      for (const assignment of moving) {
        await tx.userRoleAssignment.update({ where: { id: assignment.id }, data: { isActive: false, revokedBy: actor.userId, revokedAt: now } });
        await tx.userRoleAssignment.upsert({
          where: { userId_role_organisationId_countryNodeId: { userId, role: assignment.role, organisationId: target.id, countryNodeId: country } },
          update: { isActive: true, revokedBy: null, revokedAt: null, assignedBy: actor.userId, assignedAt: now },
          create: { userId, role: assignment.role, organisationId: target.id, countryNodeId: country, assignedBy: actor.userId },
        });
      }
    });
    const from = [...new Set(moving.map((assignment) => assignment.organisationId))];
    await this.audit.recordActor(actor, { action: 'user.organisation_move', resourceType: 'User', resourceId: userId, organisationId: target.id, countryNodeId: country, metadata: { targetUser: user.email, from, to: target.id, roles: moving.map((assignment) => assignment.role), reason: input.reason } });
    return { userId, organisationId: target.id, organisationName: target.name, rolesMoved: moving.length };
  }
}
