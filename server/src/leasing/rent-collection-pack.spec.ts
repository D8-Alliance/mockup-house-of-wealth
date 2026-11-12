import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { crc32, inflateRawSync } from 'zlib';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { buildZip } from '../documents/zip-archive';
import { PrismaService } from '../prisma.service';
import { RentCollectionService } from './rent-collection.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../contract-intelligence/agreement-generation.service', () => ({ AgreementGenerationService: class {} }));
jest.mock('./leasing.service', () => ({ LeasingService: class {} }));

/** Reads a zip back through its central directory, as an unzip tool would. */
function readZip(zip: Buffer) {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const files: Array<{ name: string; data: Buffer; method: number }> = [];
  for (let index = 0; index < count; index += 1) {
    expect(zip.readUInt32LE(at)).toBe(0x02014b50);
    const method = zip.readUInt16LE(at + 10);
    const crc = zip.readUInt32LE(at + 16);
    const compressed = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const offset = zip.readUInt32LE(at + 42);
    const name = zip.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
    const body = zip.subarray(start, start + compressed);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    expect(crc32(data) >>> 0).toBe(crc);
    files.push({ name, data, method });
    at += 46 + nameLength;
  }
  return files;
}

describe('zip archive', () => {
  it('holds each file byte for byte, deflating only what gets smaller', () => {
    const text = Buffer.from('Susulan '.repeat(200));
    const random = Buffer.from(Array.from({ length: 300 }, (_, index) => (index * 7919) % 251));
    const files = readZip(buildZip([{ name: 'nota.txt', data: text }, { name: 'perjanjian-signed.pdf', data: random }, { name: 'folder/ringkasan é.txt', data: Buffer.from('ok') }]));
    expect(files.map((file) => file.name)).toEqual(['nota.txt', 'perjanjian-signed.pdf', 'folder/ringkasan é.txt']);
    expect(files[0].data.equals(text)).toBe(true);
    expect(files[0].method).toBe(8);
    expect(files[1].data.equals(random)).toBe(true);
    expect(files[2].data.toString()).toBe('ok');
  });
});

describe('legal pack', () => {
  const actor = (role: AuthenticatedUser['role'], userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId: 'ORG-AHG', assignedRoles: [role] });
  const d = (value: string) => new Date(`${value}T00:00:00Z`);
  const row = {
    id: 'COLL-MYS-1', leaseId: 'LEASE-MYS-1', paymentId: 'PAY-1', itemKind: 'RENT', period: '2026-11', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', countryNodeId: 'CN-MYS',
    amount: new Prisma.Decimal(25500), currency: 'MYR', stage: 'LEGAL', assignedUserId: 'USR-AZIMAH', actionDueAt: d('2026-12-08'), closedAt: null, closedReason: null, createdAt: new Date(), updatedAt: new Date(),
    history: [
      { at: '2026-11-08T00:00:00.000Z', by: 'SYSTEM', byName: 'System', action: 'OPENED', stage: 'OPEN' },
      { at: '2026-11-10T00:00:00.000Z', by: 'USR-AZIMAH', byName: 'Azimah', action: 'REMINDER_SENT', stage: 'REMINDER_1' },
      { at: '2026-11-24T00:00:00.000Z', by: 'USR-AZIMAH', byName: 'Azimah', action: 'REMINDER_SENT', stage: 'REMINDER_2' },
      { at: '2026-12-08T00:00:00.000Z', by: 'USR-AZIMAH', byName: 'Azimah', action: 'TO_LEGAL', stage: 'LEGAL', note: 'No answer after three reminders.' },
    ],
    followUps: [{ at: '2026-11-12T00:00:00.000Z', byName: 'Azimah', channel: 'CALL', note: 'Tenant asked for two weeks.', promiseDate: '2026-11-26' }],
  };
  const signed = Buffer.from('%PDF-1.7 sealed agreement bytes');
  const statement = Buffer.from('%PDF-1.7 statement');
  let prisma: Record<string, Record<string, jest.Mock>>;
  let agreements: { signedPdf: jest.Mock; render: jest.Mock };
  let leasing: { statement: jest.Mock };
  let audit: { recordActor: jest.Mock };
  let service: RentCollectionService;

  beforeEach(() => {
    prisma = {
      rentCollectionCase: { findFirst: jest.fn(async () => row), findUnique: jest.fn(async () => row) },
      organisationDuty: { findMany: jest.fn(async ({ where }) => (where.duty === 'COLLECTION' ? [{ userId: 'USR-AZIMAH' }] : where.duty === 'LEGAL' ? [{ userId: 'USR-LEGAL' }] : [])) },
      rentCollectionSettings: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []) },
      assetLease: { findUniqueOrThrow: jest.fn(async () => ({ id: 'LEASE-MYS-1', startDate: d('2026-08-01'), createdBy: 'USR-TN', unit: { label: 'Tingkat 7', asset: { name: 'Menara Hidayah', ownerUserId: 'USR-AO' } } })) },
      organisation: { findMany: jest.fn(async () => [{ id: 'ORG-AHG', name: 'Al Hidayah Group' }, { id: 'ORG-TENANT', name: 'Teras Engineering' }]) },
      leaseRentPayment: { findMany: jest.fn(async () => [{ amount: new Prisma.Decimal(25500), dueDate: d('2026-11-01') }]), findUnique: jest.fn(async () => ({ dueDate: d('2026-11-01') })) },
      leaseUtilityCharge: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
      contract: { findUnique: jest.fn(async () => ({ id: 'CTR-1', contractNumber: 'IJR-MYS-0001', status: 'EXECUTION' })) },
      user: { findUnique: jest.fn(async () => ({ name: 'Azimah' })) },
    };
    agreements = { signedPdf: jest.fn(async () => ({ filename: 'IJR-MYS-0001-signed.pdf', buffer: signed })), render: jest.fn() };
    leasing = { statement: jest.fn(async () => ({ filename: 'LEASE-MYS-1-statement-2026-12.pdf', buffer: statement })) };
    audit = { recordActor: jest.fn(async () => undefined) };
    service = new RentCollectionService(prisma as unknown as PrismaService, audit as unknown as AuditService, undefined, leasing as never, agreements as never);
  });

  it('is for the Asset Owner, Legal and the collection team only', async () => {
    await expect(service.legalPack(actor('Asset Manager', 'USR-CLERK'), 'COLL-MYS-1', 'ms')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.legalPack(actor('Asset Manager', 'USR-LEGAL'), 'COLL-MYS-1', 'ms')).resolves.toBeDefined();
  });

  it('holds the cover, the sealed agreement unchanged, the statement and every reminder letter', async () => {
    const result = await service.legalPack(actor('Asset Owner', 'USR-AO'), 'COLL-MYS-1', 'ms');
    expect(result.filename).toBe('COLL-MYS-1-legal-pack.zip');
    const files = readZip(result.buffer);
    expect(files.map((file) => file.name)).toEqual([
      '00-COLL-MYS-1-ringkasan-kes.pdf', '01-IJR-MYS-0001-signed.pdf', '02-LEASE-MYS-1-statement-2026-12.pdf', '03-COLL-MYS-1-reminder-1.pdf', '03-COLL-MYS-1-reminder-2.pdf',
    ]);
    expect(files[1].data.equals(signed)).toBe(true);
    for (const file of [files[0], files[3], files[4]]) expect(file.data.subarray(0, 5).toString()).toBe('%PDF-');
    expect(leasing.statement).toHaveBeenCalledWith(expect.objectContaining({ userId: 'USR-AO' }), 'LEASE-MYS-1', 'ms', expect.any(Date));
    expect(audit.recordActor).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'rent_collection.legal_pack_downloaded' }));
  });

  it('includes the unsigned agreement, and says so, when it is not signed yet', async () => {
    prisma.contract.findUnique.mockResolvedValueOnce({ id: 'CTR-1', contractNumber: 'IJR-MYS-0001', status: 'APPROVED' });
    agreements.render.mockResolvedValueOnce({ filename: 'IJR-MYS-0001.pdf', buffer: Buffer.from('%PDF-1.7 draft') });
    const files = readZip((await service.legalPack(actor('Asset Owner', 'USR-AO'), 'COLL-MYS-1', 'en')).buffer);
    expect(files.map((file) => file.name)).toContain('01-IJR-MYS-0001-unsigned.pdf');
    expect(files[0].name).toBe('00-COLL-MYS-1-case-summary.pdf');
    expect(agreements.signedPdf).not.toHaveBeenCalled();
  });
});
