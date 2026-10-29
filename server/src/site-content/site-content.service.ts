import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';

/** Keys the public pages use: how.page.<page>.<part> and how.shariah.<part>. */
const KEY = /^how\.(page\.[a-z0-9-]+|shariah)\.[a-z0-9-]+$/;
/** Drafts and revision history are for editors only. */
const EDITOR_ONLY = /\.(draft|revisions)$/;
const MAX_VALUE_CHARS = 200_000;
const MAX_ENTRIES = 20;

@Injectable()
export class SiteContentService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /** What visitors see: published content and status, never drafts or revision history. */
  async published() {
    const rows = await this.prisma.siteContentEntry.findMany({ select: { key: true, value: true } });
    return Object.fromEntries(rows.filter((row) => !EDITOR_ONLY.test(row.key)).map((row) => [row.key, row.value]));
  }

  /** Everything, for the editors in the Admin Center. */
  async all() {
    const rows = await this.prisma.siteContentEntry.findMany({ select: { key: true, value: true } });
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  /** Saves the keys a save, publish or reset touched; null removes a key (e.g. a discarded draft). */
  async save(actor: AuthenticatedUser, entries: Record<string, unknown>) {
    const keys = Object.keys(entries ?? {});
    if (!keys.length || keys.length > MAX_ENTRIES) throw new BadRequestException(`Send between 1 and ${MAX_ENTRIES} content entries.`);
    for (const key of keys) {
      if (!KEY.test(key)) throw new BadRequestException(`Unknown content key "${key}".`);
      if (entries[key] !== null && JSON.stringify(entries[key]).length > MAX_VALUE_CHARS) throw new BadRequestException(`Content "${key}" is too large.`);
    }
    await this.prisma.$transaction(keys.map((key) => entries[key] === null
      ? this.prisma.siteContentEntry.deleteMany({ where: { key } })
      : this.prisma.siteContentEntry.upsert({ where: { key }, create: { key, value: entries[key] as Prisma.InputJsonValue, updatedBy: actor.userId }, update: { value: entries[key] as Prisma.InputJsonValue, updatedBy: actor.userId } })));
    await this.audit.recordActor(actor, { action: 'site_content.save', resourceType: 'SiteContent', resourceId: keys[0], countryNodeId: actor.countryNodeId, organisationId: actor.organisationId, metadata: { keys } });
    return this.all();
  }
}
