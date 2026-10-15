import { Prisma } from '@prisma/client';
import { auditContent, canonicalJson, GENESIS_HASH, HashChainService, ledgerContent, linkHash } from './hash-chain.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

type Link = { chain: string; sequence: number; recordId: string; previousHash: string; hash: string };

function auditEvent(id: string, action: string) {
  return { id, createdAt: new Date(`2026-10-0${id.slice(-1)}T00:00:00Z`), userId: 'USR-1', userEmail: null, action, resourceType: 'Project', resourceId: 'P1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', result: 'Success', metadata: { b: 2, a: 1 }, ipAddress: null, userAgent: null };
}

/** In-memory stand-in for the parts of Prisma the service uses. */
function setup(events: ReturnType<typeof auditEvent>[]) {
  const links: Link[] = [];
  const auditEvent = {
    findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => events.filter((event) => where.id.in.includes(event.id))),
    count: jest.fn(async () => events.length),
  };
  const hashChainLink = {
    findFirst: jest.fn(async ({ where }: { where: { chain: string } }) => [...links].filter((link) => link.chain === where.chain).sort((a, b) => b.sequence - a.sequence)[0] ?? null),
    findMany: jest.fn(async ({ where, take }: { where: { chain: string; sequence: { gt: number } }; take: number }) => links.filter((link) => link.chain === where.chain && link.sequence > where.sequence.gt).sort((a, b) => a.sequence - b.sequence).slice(0, take)),
    createMany: jest.fn(async ({ data }: { data: Link[] }) => { links.push(...data); return { count: data.length }; }),
  };
  const ledgerTransaction = { findMany: jest.fn(async () => []), count: jest.fn(async () => 0) };
  const tx = {
    $queryRaw: jest.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('"AuditEvent"')) return events.filter((event) => !links.some((link) => link.chain === 'AUDIT' && link.recordId === event.id)).map((event) => ({ id: event.id }));
      return [];
    }),
    $executeRaw: jest.fn(async () => 0),
    auditEvent, hashChainLink, ledgerTransaction,
  };
  const prisma = { ...tx, $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)) };
  return { service: new HashChainService(prisma as never), links, events };
}

describe('canonicalJson', () => {
  it('sorts object keys at every level and renders dates and decimals stably', () => {
    expect(canonicalJson({ b: 1, a: { d: [new Date('2026-01-01T00:00:00Z')], c: new Prisma.Decimal('10.50') } })).toBe('{"a":{"c":"10.5","d":["2026-01-01T00:00:00.000Z"]},"b":1}');
  });
});

describe('ledgerContent', () => {
  it('covers the entries in a fixed order with two-decimal amounts', () => {
    const base = { id: 'LT1', transactionNumber: 'N1', transactionType: 'PAYMENT_RECEIPT', referenceType: 'PaymentTransaction', referenceId: 'PAY-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', description: 'd', idempotencyKey: 'k', status: 'POSTED', createdBy: 'USR-1', createdAt: new Date('2026-10-01T00:00:00Z') };
    const entry = (id: string, direction: string) => ({ id, transactionId: 'LT1', accountId: `ACC-${id}`, direction, amount: new Prisma.Decimal(100), currency: 'MYR', description: null, createdAt: new Date('2026-10-01T00:00:00Z') });
    const one = ledgerContent({ ...base, entries: [entry('E2', 'CREDIT'), entry('E1', 'DEBIT')] });
    expect(one).toBe(ledgerContent({ ...base, entries: [entry('E1', 'DEBIT'), entry('E2', 'CREDIT')] }));
    expect(one).toContain('"amount":"100.00"');
    expect(ledgerContent({ ...base, entries: [entry('E1', 'DEBIT'), { ...entry('E2', 'CREDIT'), amount: new Prisma.Decimal(99) }] })).not.toBe(one);
  });
});

describe('HashChainService', () => {
  it('seals records in order from the genesis hash and verifies a clean chain', async () => {
    const { service, links, events } = setup([auditEvent('A1', 'login'), auditEvent('A2', 'project.create')]);
    expect(await service.sealAll()).toEqual({ AUDIT: 2, LEDGER: 0 });
    expect(links.map((link) => link.sequence)).toEqual([1, 2]);
    expect(links[0]).toMatchObject({ previousHash: GENESIS_HASH, hash: linkHash(GENESIS_HASH, auditContent(events[0])) });
    expect(links[1].previousHash).toBe(links[0].hash);
    const status = await service.verify('AUDIT');
    expect(status).toMatchObject({ valid: true, sealedCount: 2, unsealedCount: 0, headSequence: 2, headHash: links[1].hash, firstBreak: null });
  });

  it('continues the chain on the next seal instead of restarting it', async () => {
    const { service, links, events } = setup([auditEvent('A1', 'login')]);
    await service.sealAll();
    events.push(auditEvent('A2', 'logout'));
    expect(await service.sealAll()).toEqual({ AUDIT: 1, LEDGER: 0 });
    expect(links[1]).toMatchObject({ sequence: 2, previousHash: links[0].hash });
    expect((await service.verify('AUDIT')).valid).toBe(true);
  });

  it('detects a sealed record whose content was changed', async () => {
    const { service, events } = setup([auditEvent('A1', 'login'), auditEvent('A2', 'payment.refund')]);
    await service.sealAll();
    events[1].metadata = { b: 2, a: 999 };
    expect(await service.verify('AUDIT')).toMatchObject({ valid: false, firstBreak: { sequence: 2, recordId: 'A2', reason: 'CONTENT_CHANGED' } });
  });

  it('detects a deleted record', async () => {
    const { service, events } = setup([auditEvent('A1', 'login'), auditEvent('A2', 'payment.refund')]);
    await service.sealAll();
    events.splice(0, 1);
    expect((await service.verify('AUDIT')).firstBreak).toEqual({ sequence: 1, recordId: 'A1', reason: 'RECORD_MISSING' });
  });

  it('detects a link rewritten to point elsewhere', async () => {
    const { service, links } = setup([auditEvent('A1', 'login'), auditEvent('A2', 'logout'), auditEvent('A3', 'login')]);
    await service.sealAll();
    links[2] = { ...links[2], previousHash: links[0].hash };
    expect((await service.verify('AUDIT')).firstBreak).toMatchObject({ sequence: 3, reason: 'LINK_MISMATCH' });
  });

  it('reports records that are not sealed yet', async () => {
    const { service, events } = setup([auditEvent('A1', 'login')]);
    await service.sealAll();
    events.push(auditEvent('A2', 'logout'));
    expect(await service.verify('AUDIT')).toMatchObject({ valid: true, sealedCount: 1, unsealedCount: 1 });
  });
});
