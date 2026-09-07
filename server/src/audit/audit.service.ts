import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';

export interface AuditEntry {
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  organisationId?: string;
  countryNodeId?: string;
  result?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Appends events to the audit log.
 *
 * Rows are INSERT-only: a trigger (see the audit migration.sql) rejects UPDATE
 * and DELETE at the database layer, so the log is tamper-evident and append-only
 * even if the application or a client is compromised.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          userId: entry.userId,
          userEmail: entry.userEmail,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          organisationId: entry.organisationId,
          countryNodeId: entry.countryNodeId,
          result: entry.result ?? 'Success',
          metadata: (entry.metadata ?? {}) as object,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
        },
      });
    } catch (err) {
      // Audit failures must never break the primary operation.
      this.logger.error(`Failed to write audit event: ${String(err)}`);
    }
  }

  public recordActor(actor: AuthenticatedUser, entry: Omit<AuditEntry, 'userId' | 'userEmail'>): Promise<void> {
    return this.record({ ...entry, userId: actor.userId, userEmail: actor.email });
  }
}
