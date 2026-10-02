import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly delivery: NotificationDeliveryService) {}

  async enqueue(input: NotificationInput, tx?: Prisma.TransactionClient) {
    const client = tx || this.prisma;
    return client.notificationOutbox.upsert({ where: { dedupeKey: input.dedupeKey }, update: {}, create: { ...input, channels: input.channels || process.env.NOTIFICATION_DEFAULT_CHANNELS || 'IN_APP' } });
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
        await this.prisma.notification.upsert({ where: { dedupeKey: row.dedupeKey }, update: {}, create: { recipientUserId: row.recipientUserId, organisationId: row.organisationId, countryNodeId: row.countryNodeId, type: row.type, title: row.title, message: row.message, resourceType: row.resourceType, resourceId: row.resourceId, dedupeKey: row.dedupeKey } });
        await this.delivery.deliver({ channels: row.channels, title: row.title, message: row.message, recipientEmail: recipient?.email, recipientPhone: typeof profile.phone === 'string' ? profile.phone : undefined, pushToken: typeof profile.pushToken === 'string' ? profile.pushToken : undefined });
        await this.prisma.notificationOutbox.update({ where: { id: row.id }, data: { status: 'PROCESSED', processedAt: new Date(), lastError: null } });
        processed += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        await this.prisma.notificationOutbox.update({ where: { id: row.id }, data: { status: attempts >= 5 ? 'DEAD_LETTER' : 'PENDING', lastError: error instanceof Error ? error.message : String(error), nextAttemptAt: new Date(Date.now() + Math.min(60 * 60 * 1000, 2 ** attempts * 1000)) } });
      }
    }
    return { inspected: rows.length, processed };
  }
}
