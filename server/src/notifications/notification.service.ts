import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { tenantScopeFilter } from '../tenancy/tenant-scope';
import { NotificationDeliveryService } from './notification-delivery.service';

export interface NotificationInput {
  recipientUserId: string;
  organisationId: string;
  countryNodeId: string;
  type: string;
  title: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  dedupeKey: string;
  channels?: string;
}

/** "RM 5,000" (or "USD 5,000") for notification text. */
export const formatAmount = (amount: number | string | { toString(): string }, currency: string) =>
  `${currency === 'MYR' ? 'RM' : currency} ${Number(amount.toString()).toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;

/** One message for many recipients; each gets its own outbox row, keyed by dedupeKey plus the recipient. */
export type BroadcastInput = Pick<NotificationInput, 'type' | 'title' | 'message' | 'resourceType' | 'resourceId' | 'dedupeKey' | 'channels'>;

const CHANNEL_PREFERENCE: Record<string, 'email' | 'push' | 'sms'> = { EMAIL: 'email', PUSH: 'push', SMS: 'sms' };

/**
 * The in-app bell and email, for everyone unless they switch email off. Push (Firebase) and SMS (Twilio)
 * are not used; their delivery code stays, and NOTIFICATION_DEFAULT_CHANNELS can add them back.
 */
export const DEFAULT_CHANNELS = 'IN_APP,EMAIL';

/** Drops the channels the recipient switched off in their profile. In-app always stays; unset means on. */
export function channelsForRecipient(channels: string, profile: Record<string, unknown>): string {
  const preferences = profile.preferences && typeof profile.preferences === 'object' ? profile.preferences as { notifications?: Record<string, unknown> } : {};
  const choices = preferences.notifications ?? {};
  return channels.split(',').map((item) => item.trim()).filter((item) => {
    const key = CHANNEL_PREFERENCE[item.toUpperCase()];
    return item && (!key || choices[key] !== false);
  }).join(',');
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly delivery: NotificationDeliveryService) {}

  async enqueue(input: NotificationInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.notificationOutbox.upsert({ where: { dedupeKey: input.dedupeKey }, update: {}, create: { ...input, channels: input.channels || process.env.NOTIFICATION_DEFAULT_CHANNELS || DEFAULT_CHANNELS } });
  }

  /**
   * Notifies these people, filed under each person's own organisation so it appears in their bell
   * (an order or payout belongs to the pool's organisation, not the investor's). Never throws:
   * a notification that cannot be queued must not undo the action that caused it.
   */
  async notifyUsers(userIds: string[], message: BroadcastInput) {
    try {
      const assignments = await this.prisma.userRoleAssignment.findMany({ where: { userId: { in: [...new Set(userIds)] }, isActive: true }, orderBy: { createdAt: 'asc' }, select: { userId: true, organisationId: true, countryNodeId: true } });
      const first = new Map<string, (typeof assignments)[number]>();
      for (const assignment of assignments) if (!first.has(assignment.userId)) first.set(assignment.userId, assignment);
      await this.enqueueAll([...first.values()], message);
    } catch (error) {
      this.logger.warn(`Could not queue "${message.title}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Notifies everyone holding one of these roles in the country (and organisation, when given), e.g. the approvers of a queue. */
  async notifyRoles(roles: PrismaUserRole[], scope: { countryNodeId: string; organisationId?: string }, message: BroadcastInput, exceptUserId?: string) {
    try {
      const assignments = await this.prisma.userRoleAssignment.findMany({ where: { role: { in: roles }, isActive: true, countryNodeId: scope.countryNodeId, ...(scope.organisationId ? { organisationId: scope.organisationId } : {}), ...(exceptUserId ? { userId: { not: exceptUserId } } : {}) }, select: { userId: true, organisationId: true, countryNodeId: true } });
      await this.enqueueAll(assignments, message);
    } catch (error) {
      this.logger.warn(`Could not queue "${message.title}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async enqueueAll(recipients: Array<{ userId: string; organisationId: string; countryNodeId: string }>, message: BroadcastInput) {
    const unique = [...new Map(recipients.map((recipient) => [`${recipient.userId}|${recipient.organisationId}`, recipient])).values()];
    await Promise.all(unique.map((recipient) => this.enqueue({ ...message, recipientUserId: recipient.userId, organisationId: recipient.organisationId, countryNodeId: recipient.countryNodeId, dedupeKey: `${message.dedupeKey}:${recipient.userId}:${recipient.organisationId}` })));
  }

  list(actor: AuthenticatedUser) {
    return this.prisma.notification.findMany({ where: { ...tenantScopeFilter(actor), recipientUserId: actor.userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  unreadCount(actor: AuthenticatedUser) {
    return this.prisma.notification.count({ where: { ...tenantScopeFilter(actor), recipientUserId: actor.userId, readAt: null } });
  }

  async markRead(actor: AuthenticatedUser, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, recipientUserId: actor.userId, ...tenantScopeFilter(actor) } });
    if (!notification) throw new NotFoundException('Notification not found.');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  markAllRead(actor: AuthenticatedUser) {
    return this.prisma.notification.updateMany({ where: { recipientUserId: actor.userId, ...tenantScopeFilter(actor), readAt: null }, data: { readAt: new Date() } });
  }

  async processOutbox(limit = 100) {
    const rows = await this.prisma.notificationOutbox.findMany({ where: { status: 'PENDING', nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: Math.min(Math.max(limit, 1), 500) });
    let processed = 0;
    for (const row of rows) {
      const claimed = await this.prisma.notificationOutbox.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        const recipient = await this.prisma.user.findUnique({ where: { id: row.recipientUserId }, select: { email: true, profile: true } });
        const profile = recipient?.profile && typeof recipient.profile === 'object' && !Array.isArray(recipient.profile) ? recipient.profile as Record<string, unknown> : {};
        await this.prisma.notification.upsert({ where: { dedupeKey: row.dedupeKey }, update: {}, create: { recipientUserId: row.recipientUserId, organisationId: row.organisationId, countryNodeId: row.countryNodeId, type: row.type, title: row.title, message: row.message, resourceType: row.resourceType, resourceId: row.resourceId, dedupeKey: row.dedupeKey, createdAt: row.createdAt } });
        // Only the channels not yet done: a retry never repeats an email or push that already went out.
        const done = new Set(row.deliveredChannels.split(',').filter(Boolean));
        const pending = channelsForRecipient(row.channels, profile).split(',').filter((channel) => channel && !done.has(channel.trim().toUpperCase())).join(',');
        const results = await this.delivery.deliverEach({ channels: pending, title: row.title, message: row.message, recipientEmail: recipient?.email, recipientPhone: typeof profile.phone === 'string' ? profile.phone : undefined, pushToken: typeof profile.pushToken === 'string' ? profile.pushToken : undefined });
        for (const result of results) if (result.outcome !== 'FAILED') done.add(result.channel);
        const failed = results.filter((result) => result.outcome === 'FAILED');
        const skipped = results.filter((result) => result.outcome === 'SKIPPED');
        if (failed.length) {
          await this.prisma.notificationOutbox.update({ where: { id: row.id }, data: { deliveredChannels: [...done].join(',') } });
          throw new Error(failed.map((result) => `${result.channel}: ${result.reason}`).join('; '));
        }
        // Skipped channels are noted, so an operator can see why an email or SMS did not go out.
        await this.prisma.notificationOutbox.update({ where: { id: row.id }, data: { status: 'PROCESSED', processedAt: new Date(), deliveredChannels: [...done].join(','), lastError: skipped.length ? `Skipped ${skipped.map((result) => `${result.channel} (${result.reason})`).join(', ')}` : null } });
        processed += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        await this.prisma.notificationOutbox.update({ where: { id: row.id }, data: { status: attempts >= 5 ? 'DEAD_LETTER' : 'PENDING', lastError: error instanceof Error ? error.message : String(error), nextAttemptAt: new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** attempts * 1000)) } });
      }
    }
    return { inspected: rows.length, processed };
  }
}
