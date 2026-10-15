import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';

/**
 * Tamper-evident hash chains over the audit log (AUDIT) and the financial
 * ledger (LEDGER). Sealing appends one HashChainLink per record:
 *
 *   hash = sha256(previousHash + "\n" + canonical record content)
 *
 * so changing, deleting or reordering a sealed record breaks verification of
 * that link and every later one. The chain head is what gets published or
 * anchored externally (see PENDING_ACTIVITIES.md): without an outside copy of
 * the head, someone able to rewrite the database could also rebuild the chain.
 */

export const CHAINS = ['AUDIT', 'LEDGER'] as const;
export type ChainName = (typeof CHAINS)[number];

export const GENESIS_HASH = '0'.repeat(64);
const SEAL_BATCH = 500;
const VERIFY_BATCH = 1000;
// One advisory lock per chain so concurrent sealers (API and worker) never interleave.
const LOCK_KEYS: Record<ChainName, number> = { AUDIT: 71_000_001, LEDGER: 71_000_002 };

/** JSON with object keys sorted, so the same data always serialises the same way. */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Prisma.Decimal.isDecimal(value)) return JSON.stringify((value as Prisma.Decimal).toFixed());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function linkHash(previousHash: string, content: string) {
  return createHash('sha256').update(`${previousHash}\n${content}`).digest('hex');
}

type AuditRecord = Prisma.AuditEventGetPayload<object>;
type LedgerRecord = Prisma.LedgerTransactionGetPayload<{ include: { entries: true } }>;

export function auditContent(event: AuditRecord) {
  return canonicalJson({ id: event.id, createdAt: event.createdAt, userId: event.userId, userEmail: event.userEmail, action: event.action, resourceType: event.resourceType, resourceId: event.resourceId, organisationId: event.organisationId, countryNodeId: event.countryNodeId, result: event.result, metadata: event.metadata, ipAddress: event.ipAddress, userAgent: event.userAgent });
}

export function ledgerContent(transaction: LedgerRecord) {
  const entries = [...transaction.entries].sort((a, b) => a.id.localeCompare(b.id)).map((entry) => ({ id: entry.id, accountId: entry.accountId, direction: entry.direction, amount: entry.amount.toFixed(2), currency: entry.currency, description: entry.description, createdAt: entry.createdAt }));
  return canonicalJson({ id: transaction.id, transactionNumber: transaction.transactionNumber, transactionType: transaction.transactionType, referenceType: transaction.referenceType, referenceId: transaction.referenceId, organisationId: transaction.organisationId, countryNodeId: transaction.countryNodeId, currency: transaction.currency, description: transaction.description, idempotencyKey: transaction.idempotencyKey, status: transaction.status, createdBy: transaction.createdBy, createdAt: transaction.createdAt, entries });
}

export interface ChainBreak { sequence: number; recordId: string; reason: 'RECORD_MISSING' | 'CONTENT_CHANGED' | 'LINK_MISMATCH' | 'SEQUENCE_GAP' }

export interface ChainStatus {
  chain: ChainName;
  valid: boolean;
  sealedCount: number;
  unsealedCount: number;
  headSequence: number;
  headHash: string;
  firstBreak: ChainBreak | null;
}

@Injectable()
export class HashChainService {
  constructor(private readonly prisma: PrismaService) {}

  /** Seals every record that has no link yet, oldest first. Safe to run concurrently. */
  async sealAll() {
    const sealed: Record<ChainName, number> = { AUDIT: 0, LEDGER: 0 };
    for (const chain of CHAINS) {
      for (;;) {
        const count = await this.sealBatch(chain);
        sealed[chain] += count;
        if (count < SEAL_BATCH) break;
      }
    }
    return sealed;
  }

  private sealBatch(chain: ChainName): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEYS[chain]})`;
      const pending = chain === 'AUDIT'
        ? await tx.$queryRaw<Array<{ id: string }>>`SELECT e."id" FROM "AuditEvent" e WHERE NOT EXISTS (SELECT 1 FROM "HashChainLink" l WHERE l."chain" = 'AUDIT' AND l."recordId" = e."id") ORDER BY e."createdAt", e."id" LIMIT ${SEAL_BATCH}`
        : await tx.$queryRaw<Array<{ id: string }>>`SELECT t."id" FROM "LedgerTransaction" t WHERE NOT EXISTS (SELECT 1 FROM "HashChainLink" l WHERE l."chain" = 'LEDGER' AND l."recordId" = t."id") ORDER BY t."createdAt", t."id" LIMIT ${SEAL_BATCH}`;
      if (!pending.length) return 0;
      const contents = await this.contents(tx, chain, pending.map((row) => row.id));
      const head = await tx.hashChainLink.findFirst({ where: { chain }, orderBy: { sequence: 'desc' }, select: { sequence: true, hash: true } });
      let sequence = head?.sequence ?? 0;
      let previousHash = head?.hash ?? GENESIS_HASH;
      const links: Prisma.HashChainLinkCreateManyInput[] = [];
      for (const { id } of pending) {
        const hash = linkHash(previousHash, contents.get(id)!);
        sequence += 1;
        links.push({ chain, sequence, recordId: id, previousHash, hash });
        previousHash = hash;
      }
      await tx.hashChainLink.createMany({ data: links });
      return links.length;
    }, { timeout: 60_000 });
  }

  /** Recomputes every sealed link from the current records. */
  async verify(chain: ChainName): Promise<ChainStatus> {
    let expectedPrevious = GENESIS_HASH;
    let expectedSequence = 1;
    let sealedCount = 0;
    let firstBreak: ChainBreak | null = null;
    let headHash = GENESIS_HASH;
    let headSequence = 0;
    for (let after = 0; ; ) {
      const links = await this.prisma.hashChainLink.findMany({ where: { chain, sequence: { gt: after } }, orderBy: { sequence: 'asc' }, take: VERIFY_BATCH });
      if (!links.length) break;
      const contents = await this.contents(this.prisma, chain, links.map((link) => link.recordId));
      for (const link of links) {
        sealedCount += 1;
        headHash = link.hash;
        headSequence = link.sequence;
        if (firstBreak) continue;
        const content = contents.get(link.recordId);
        if (link.sequence !== expectedSequence) firstBreak = { sequence: link.sequence, recordId: link.recordId, reason: 'SEQUENCE_GAP' };
        else if (link.previousHash !== expectedPrevious) firstBreak = { sequence: link.sequence, recordId: link.recordId, reason: 'LINK_MISMATCH' };
        else if (content === undefined) firstBreak = { sequence: link.sequence, recordId: link.recordId, reason: 'RECORD_MISSING' };
        else if (linkHash(link.previousHash, content) !== link.hash) firstBreak = { sequence: link.sequence, recordId: link.recordId, reason: 'CONTENT_CHANGED' };
        expectedPrevious = link.hash;
        expectedSequence = link.sequence + 1;
      }
      after = links[links.length - 1].sequence;
    }
    const total = chain === 'AUDIT' ? await this.prisma.auditEvent.count() : await this.prisma.ledgerTransaction.count();
    return { chain, valid: !firstBreak, sealedCount, unsealedCount: Math.max(0, total - sealedCount), headSequence, headHash, firstBreak };
  }

  async verifyAll() {
    return { checkedAt: new Date().toISOString(), chains: await Promise.all(CHAINS.map((chain) => this.verify(chain))) };
  }

  private async contents(client: Prisma.TransactionClient | PrismaService, chain: ChainName, ids: string[]) {
    const map = new Map<string, string>();
    if (chain === 'AUDIT') {
      for (const event of await client.auditEvent.findMany({ where: { id: { in: ids } } })) map.set(event.id, auditContent(event));
    } else {
      for (const transaction of await client.ledgerTransaction.findMany({ where: { id: { in: ids } }, include: { entries: true } })) map.set(transaction.id, ledgerContent(transaction));
    }
    return map;
  }
}
