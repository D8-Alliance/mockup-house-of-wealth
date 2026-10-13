import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { USER_ROLES, UserRole } from '../policy/permissions';

/** Super Admin must stay available so the switches can always be turned back on; Guest is the signed-out state. */
export const ALWAYS_ENABLED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['Super Admin', 'Guest']);


const CACHE_MS = 30_000;

export interface RoleAvailabilityEntry {
  role: UserRole;
  enabled: boolean;
  locked: boolean;
}

/**
 * Which roles are switched on for the whole platform. Read on every sign-in check, so the
 * disabled set is cached briefly and refreshed immediately when a Super Admin changes it.
 */
@Injectable()
export class RoleAvailabilityService {
  private cache: { disabled: Set<UserRole>; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async disabledRoles(): Promise<Set<UserRole>> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.disabled;
    const rows = await this.prisma.roleAvailability.findMany({ where: { enabled: false }, select: { role: true } });
    const disabled = new Set(rows.map((row) => row.role.replace(/_/g, ' ') as UserRole).filter((role) => !ALWAYS_ENABLED_ROLES.has(role)));
    this.cache = { disabled, expiresAt: Date.now() + CACHE_MS };
    return disabled;
  }

  async isEnabled(role: UserRole): Promise<boolean> {
    return !(await this.disabledRoles()).has(role);
  }

  async list(): Promise<RoleAvailabilityEntry[]> {
    const disabled = await this.disabledRoles();
    return USER_ROLES.map((role) => ({ role, enabled: !disabled.has(role), locked: ALWAYS_ENABLED_ROLES.has(role) }));
  }

  async update(role: string, enabled: boolean, actor: AuthenticatedUser): Promise<RoleAvailabilityEntry> {
    if (!USER_ROLES.includes(role as UserRole)) throw new BadRequestException(`Unknown role: ${role}`);
    const target = role as UserRole;
    if (!enabled && ALWAYS_ENABLED_ROLES.has(target)) throw new ForbiddenException(`The role "${target}" cannot be disabled.`);
    const previous = await this.isEnabled(target);
    const prismaRole = target.replace(/ /g, '_') as PrismaUserRole;
    await this.prisma.roleAvailability.upsert({
      where: { role: prismaRole },
      create: { role: prismaRole, enabled, updatedBy: actor.userId },
      update: { enabled, updatedBy: actor.userId },
    });
    this.cache = null;
    await this.audit.recordActor(actor, { action: enabled ? 'role.enable' : 'role.disable', resourceType: 'RoleAvailability', resourceId: target, metadata: { previousEnabled: previous, enabled } });
    return { role: target, enabled, locked: ALWAYS_ENABLED_ROLES.has(target) };
  }
}
