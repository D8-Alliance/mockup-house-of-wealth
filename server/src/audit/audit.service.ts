import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { tenantScopeFilter } from '../tenancy/tenant-scope';
import { AuditQueryDto } from './audit.dto';

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

  public async record(entry: AuditEntry, client: PrismaService | Prisma.TransactionClient = this.prisma): Promise<void> {
    try {
      await client.auditEvent.create({
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
      this.logger.error(`Failed to write audit event: ${String(err)}`);
      // A successful mutation without an audit record is not an acceptable
      // result for this system. Callers can surface the failure and retry.
      throw err;
    }
  }

  public recordActor(actor: AuthenticatedUser, entry: Omit<AuditEntry, 'userId' | 'userEmail'>, client?: PrismaService | Prisma.TransactionClient): Promise<void> {
    return this.record({ ...entry, userId: actor.userId, userEmail: actor.email }, client);
  }

  public async list(actor: AuthenticatedUser, query: AuditQueryDto) {
    const where = this.buildWhere(actor, query);
    const [events, total] = await Promise.all([
      this.prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { data: events, page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  }

  public async exportCsv(actor: AuthenticatedUser, query: AuditQueryDto) {
    const where = this.buildWhere(actor, query);
    const events = await this.prisma.auditEvent.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10000 });
    const header = ['id', 'createdAt', 'userId', 'userEmail', 'action', 'resourceType', 'resourceId', 'organisationId', 'countryNodeId', 'result', 'metadata'];
    const rows = events.map((event) => [event.id, event.createdAt.toISOString(), event.userId, event.userEmail, event.action, event.resourceType, event.resourceId, event.organisationId, event.countryNodeId, event.result, JSON.stringify(event.metadata)]);
    return { fileName: `house-of-wealth-audit-${new Date().toISOString().slice(0, 10)}.csv`, content: [header, ...rows].map((row) => row.map((value) => this.csvCell(value)).join(',')).join('\r\n') + '\r\n' };
  }

  private buildWhere(actor: AuthenticatedUser, query: AuditQueryDto): Prisma.AuditEventWhereInput {
    return {
      ...tenantScopeFilter(actor),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
      ...(query.resourceType ? { resourceType: { equals: query.resourceType } } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...((query.from || query.to) ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lt: new Date(query.to) } : {}) } } : {}),
    };
  }

  private csvCell(value: unknown) {
    let text = value === null || value === undefined ? '' : String(value);
    // A leading quote stops spreadsheets from running user-supplied text as a formula.
    if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }
}
