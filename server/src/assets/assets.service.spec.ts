import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AssetsService } from './assets.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: (content: Buffer) => (content.subarray(0, 4).toString() === '%PDF' ? 'application/pdf' : null) }));

const actor = (role: AuthenticatedUser['role'], organisationId = 'ORG-AO', userId = 'USR-AO'): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const owner = actor('Asset Owner');
const reviewer = actor('Country Admin', 'ORG-PUBLIC', 'USR-CA');
const draft = { id: 'ASSET-MYS-AAAA1111', organisationId: 'ORG-AO', countryNodeId: 'CN-MYS', ownerUserId: 'USR-AO', status: 'DRAFT', estimatedValue: 250000, documents: [] as Array<{ documentType: string }> };
const input = { assetType: 'LAND' as const, name: 'Lot 1234, Mukim Semenyih', estimatedValue: 250000, currency: 'MYR' };
const declarations = { ownership: true, halalUse: true, accuracy: true };

describe('AssetsService', () => {
  const prisma = {
    asset: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    organisation: { findUnique: jest.fn().mockResolvedValue({ name: 'Al Hidayah Group Sdn Bhd' }) },
    assetDocument: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'DOC-1', sha256: 'x' }), deleteMany: jest.fn(), findFirst: jest.fn() },
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const service = new AssetsService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('registers a draft asset for the owner\'s organisation with an ASSET-<country> id', async () => {
    prisma.asset.create.mockImplementation(async ({ data }) => ({ ...data, documents: [] }));
    const asset = await service.create(owner, input);
    expect(asset.id).toMatch(/^ASSET-MYS-[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(prisma.asset.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organisationId: 'ORG-AO', countryNodeId: 'CN-MYS', ownerUserId: 'USR-AO', assetType: 'LAND' }) }));
  });

  it('lets only asset owners register assets', async () => {
    await expect(service.create(actor('Retail Investor'), input)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('needs proof of ownership before an asset can be submitted, then runs the document checks', async () => {
    const building = { ...draft, assetType: 'OTHER' };
    prisma.asset.findFirst.mockResolvedValueOnce(building);
    await expect(service.submit(owner, draft.id, declarations)).rejects.toThrow('proof of ownership');
    prisma.asset.findFirst.mockResolvedValueOnce({ ...building, documents: [{ documentType: 'OWNERSHIP' }] });
    prisma.asset.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.asset.findUniqueOrThrow
      .mockResolvedValueOnce({ ...building, status: 'SUBMITTED' })
      .mockResolvedValueOnce({ ...building, status: 'SUBMITTED', isEncumbered: false, latitude: null, longitude: null, details: null, documents: [] });
    prisma.asset.update.mockResolvedValueOnce({ ...building, status: 'SUBMITTED', checkFindings: [] });
    await expect(service.submit(owner, draft.id, declarations)).resolves.toMatchObject({ status: 'SUBMITTED' });
    expect(prisma.asset.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ checkFindings: [] }) }));
  });

  it('needs the official land search and complete title details before land is submitted', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, assetType: 'LAND', documents: [{ documentType: 'OWNERSHIP' }] });
    await expect(service.submit(owner, draft.id, declarations)).rejects.toThrow('Carian Rasmi');
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, assetType: 'LAND', details: { titleType: 'GRN', titleNumber: '56789' }, documents: [{ documentType: 'OWNERSHIP' }, { documentType: 'OFFICIAL_SEARCH' }] });
    await expect(service.submit(owner, draft.id, declarations)).rejects.toThrow('lot number');
  });

  it('refuses the same land twice in one organisation', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ id: 'ASSET-MYS-OLD00001' });
    await expect(service.create(owner, { ...input, land: { lotNumber: '1234', mukim: 'Semenyih', district: 'Hulu Langat', state: 'Selangor' } })).rejects.toThrow('already registered as ASSET-MYS-OLD00001');
  });

  it('refuses to change a submitted asset', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' });
    await expect(service.update(owner, draft.id, input)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses files that are not really PDF, JPG or PNG', async () => {
    const fake = { originalname: 'title.pdf', size: 10, buffer: Buffer.from('MZ not a pdf') } as Express.Multer.File;
    await expect(service.uploadDocument(owner, draft.id, 'OWNERSHIP', fake)).rejects.toThrow('not a valid PDF');
  });

  it('flags a document already attached to another owner\'s asset', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce(draft);
    prisma.assetDocument.count.mockResolvedValueOnce(1);
    await service.uploadDocument(owner, draft.id, 'OWNERSHIP', { originalname: 'geran.pdf', size: 20, buffer: Buffer.from('%PDF-1.4 sample') } as Express.Multer.File);
    const saved = prisma.assetDocument.create.mock.calls[0][0].data;
    expect(saved.integrity.flags).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'REUSED_ELSEWHERE' })]));
  });

  it('lets a Country Admin verify a submitted asset of another organisation', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' });
    prisma.asset.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.asset.findUniqueOrThrow.mockResolvedValueOnce({ ...draft, status: 'VERIFIED' });
    await expect(service.review(reviewer, draft.id, { decision: 'VERIFIED', note: 'Title search matches.' })).resolves.toMatchObject({ status: 'VERIFIED' });
    expect(prisma.asset.updateMany).toHaveBeenCalledWith({ where: { id: draft.id, status: 'SUBMITTED' }, data: expect.objectContaining({ status: 'VERIFIED', reviewedBy: 'USR-CA' }) });
  });

  it('never lets a reviewer verify their own organisation\'s asset, or an owner review at all', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' });
    await expect(service.review(actor('Country Admin', 'ORG-AO', 'USR-OTHER'), draft.id, { decision: 'VERIFIED', note: 'Looks fine.' })).rejects.toThrow('your own organisation');
    await expect(service.review(owner, draft.id, { decision: 'VERIFIED', note: 'Looks fine.' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reports a conflict when someone else decided first', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...draft, status: 'SUBMITTED' });
    prisma.asset.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.review(reviewer, draft.id, { decision: 'REJECTED', note: 'Title not in owner name.' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('shows reviewers their country\'s submitted assets but not drafts; owners only their organisation\'s', async () => {
    await service.list(reviewer);
    expect(prisma.asset.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { countryNodeId: 'CN-MYS', status: { not: 'DRAFT' } } }));
    await service.list(owner);
    expect(prisma.asset.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { organisationId: 'ORG-AO', countryNodeId: 'CN-MYS' } }));
  });
});
