import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { KycService } from './kyc.service';
import { KycChecksService } from './checks/kyc-checks.service';
import { kycSubmissionGaps, maskIdNumber, requiredKycDocuments } from './kyc-workflow';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

function actor(role: AuthenticatedUser['role'], userId = 'USR-REVIEWER', countryNodeId = 'CN-MYS'): AuthenticatedUser {
  return { userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId, organisationId: 'ORG-A', assignedRoles: [role] };
}

const completeDetails = { fullName: 'Applicant One', dateOfBirth: new Date('1990-05-01'), nationality: 'Malaysian', idDocumentType: 'NATIONAL_ID', idDocumentNumber: '900501145678', idDocumentExpiry: new Date('2031-05-01'), residentialAddress: '1 Jalan Contoh, Kuala Lumpur' };

describe('KYC workflow rules', () => {
  it('requires front and back for a national ID, or the passport page for a passport', () => {
    expect(requiredKycDocuments('NATIONAL_ID')).toEqual(['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS']);
    expect(requiredKycDocuments('PASSPORT')).toEqual(['PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS']);
  });

  it('reports nothing missing for a complete application', () => {
    expect(kycSubmissionGaps(completeDetails, ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'])).toEqual([]);
  });

  it('lists missing fields and documents', () => {
    const gaps = kycSubmissionGaps({ ...completeDetails, nationality: ' ' }, ['ID_FRONT']);
    expect(gaps).toEqual(['Nationality', 'Document: ID_BACK', 'Document: SELFIE', 'Document: PROOF_OF_ADDRESS']);
  });

  it('rejects applicants under 18, counting the birthday exactly', () => {
    const now = new Date('2026-10-01T00:00:00Z');
    expect(kycSubmissionGaps({ ...completeDetails, dateOfBirth: new Date('2008-10-02') }, ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'], now)).toEqual(['Applicant must be at least 18 years old']);
    expect(kycSubmissionGaps({ ...completeDetails, dateOfBirth: new Date('2008-10-01') }, ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'], now)).toEqual([]);
  });

  it('masks all but the last four characters of an ID number', () => {
    expect(maskIdNumber('900501145678')).toBe('********5678');
    expect(maskIdNumber('123')).toBe('***');
  });
});

describe('KycService', () => {
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const tx = { kycApplication: { updateMany: jest.fn() }, kycReview: { create: jest.fn() } };
  const prisma = {
    kycApplication: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    kycDocument: { findMany: jest.fn(), upsert: jest.fn() },
    kycCheckResult: { aggregate: jest.fn().mockResolvedValue({ _max: { round: 1 } }), findMany: jest.fn().mockResolvedValue([{ checkType: 'DOCUMENT_CONSISTENCY', status: 'PASS' }]) },
    // assertApprovable: no other account is already verified with the same ID number.
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  const checks = { run: jest.fn().mockResolvedValue(undefined), assertCanRerun: jest.fn() };
  const service = new KycService(prisma as unknown as PrismaService, audit as unknown as AuditService, checks as unknown as KycChecksService);
  const submitted = { id: 'KYC-1', applicationNumber: 'KYC-2026-AAAA', userId: 'USR-APPLICANT', organisationId: 'ORG-PUBLIC', countryNodeId: 'CN-MYS', status: 'SUBMITTED', checkRecommendation: 'CLEAR', ...completeDetails };
  // A real PNG signature; uploads are checked against the file's actual bytes.
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

  beforeEach(() => jest.clearAllMocks());

  it('scopes the review queue to the reviewer country, but not for Super Admin', async () => {
    await service.listForReview(actor('KYC Officer'));
    expect(prisma.kycApplication.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { status: 'SUBMITTED', countryNodeId: 'CN-MYS' } }));
    await service.listForReview(actor('Super Admin'));
    expect(prisma.kycApplication.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { status: 'SUBMITTED' } }));
  });

  it('hides applications from other countries as not found', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(null);
    await expect(service.review(actor('KYC Officer', 'USR-REVIEWER', 'CN-IDN'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match' })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.kycApplication.findFirst).toHaveBeenCalledWith({ where: { id: 'KYC-1', countryNodeId: 'CN-IDN' } });
  });

  it('lets a Super Admin decide on another country', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, countryNodeId: 'CN-IDN' }).mockResolvedValueOnce({ ...submitted, countryNodeId: 'CN-IDN', documents: [], reviews: [] });
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.review(actor('Super Admin', 'USR-REVIEWER', 'CN-MYS'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match' });
    expect(prisma.kycApplication.findFirst).toHaveBeenCalledWith({ where: { id: 'KYC-1' } });
    expect(tx.kycApplication.updateMany).toHaveBeenCalled();
  });

  it('forbids reviewing your own application', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted);
    await expect(service.review(actor('KYC Officer', 'USR-APPLICANT'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.kycApplication.updateMany).not.toHaveBeenCalled();
  });

  it('only reviews submitted applications', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, status: 'APPROVED' });
    await expect(service.review(actor('KYC Officer'), 'KYC-1', { decision: 'REJECTED', comment: 'Mismatched name' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records the decision and history row, guarding on SUBMITTED status', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted).mockResolvedValueOnce({ ...submitted, status: 'APPROVED', documents: [], reviews: [] });
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.review(actor('KYC Officer'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_2', comment: '  Documents match  ' });
    expect(tx.kycApplication.updateMany).toHaveBeenCalledWith({ where: { id: 'KYC-1', status: 'SUBMITTED' }, data: expect.objectContaining({ status: 'APPROVED', kycLevel: 'LEVEL_2', reviewedBy: 'USR-REVIEWER', reviewComment: 'Documents match' }) });
    expect(tx.kycReview.create).toHaveBeenCalledWith({ data: expect.objectContaining({ decision: 'APPROVED', kycLevel: 'LEVEL_2', reviewerRole: 'KYC Officer' }) });
    expect(audit.recordActor).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: 'kyc.application.approved' }));
  });

  it('drops the KYC level when the decision is not an approval', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted).mockResolvedValueOnce({ ...submitted, documents: [], reviews: [] });
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.review(actor('KYC Officer'), 'KYC-1', { decision: 'RESUBMISSION_REQUIRED', kycLevel: 'LEVEL_3', comment: 'Selfie is blurred' });
    expect(tx.kycApplication.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kycLevel: null }) }));
  });

  it('reports a conflict when another reviewer decided first', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted);
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.review(actor('KYC Officer'), 'KYC-1', { decision: 'REJECTED', comment: 'Mismatched name' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.kycReview.create).not.toHaveBeenCalled();
  });

  it('refuses to submit an incomplete application', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, status: 'DRAFT' });
    prisma.kycDocument.findMany.mockResolvedValueOnce([{ documentType: 'ID_FRONT' }]);
    await expect(service.submit(actor('Retail Investor', 'USR-APPLICANT'))).rejects.toThrow(/ID_BACK/);
    expect(prisma.kycApplication.update).not.toHaveBeenCalled();
  });

  it('blocks document changes once the application is submitted', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted);
    const file = { originalname: 'selfie.png', mimetype: 'image/png', size: 9, buffer: png } as Express.Multer.File;
    await expect(service.uploadDocument(actor('Retail Investor', 'USR-APPLICANT'), 'SELFIE', file)).rejects.toThrow(/under review/);
    expect(prisma.kycDocument.upsert).not.toHaveBeenCalled();
  });

  it('stores a SHA-256 of each uploaded document', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, status: 'DRAFT' });
    prisma.kycDocument.upsert.mockResolvedValueOnce({ id: 'DOC-1', sha256: 'h', fileSize: 1 });
    const file = { originalname: 'selfie.png', mimetype: 'image/png', size: 9, buffer: png } as Express.Multer.File;
    await service.uploadDocument(actor('Retail Investor', 'USR-APPLICANT'), 'SELFIE', file);
    expect(prisma.kycDocument.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ sha256: createHash('sha256').update(png).digest('hex') }) }));
  });

  it('does not open a second application once verified', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'APPROVED' });
    await expect(service.saveDraft(actor('Retail Investor', 'USR-APPLICANT'), { fullName: 'Applicant One' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.kycApplication.create).not.toHaveBeenCalled();
  });

  it('stops new applications after three rejections', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'REJECTED' });
    prisma.kycApplication.count.mockResolvedValueOnce(3);
    await expect(service.saveDraft(actor('Retail Investor', 'USR-APPLICANT'), {})).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.kycApplication.create).not.toHaveBeenCalled();
  });

  it('refuses an expired identity document on submit', () => {
    const gaps = kycSubmissionGaps({ ...completeDetails, idDocumentExpiry: new Date('2026-09-30') }, ['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'], new Date('2026-10-01'));
    expect(gaps).toEqual(['Identity document has expired']);
  });

  it('starts the automated checks after a successful submit, without waiting for them', async () => {
    const draft = { ...submitted, status: 'DRAFT' };
    prisma.kycApplication.findFirst.mockResolvedValueOnce(draft).mockResolvedValueOnce({ ...draft, status: 'SUBMITTED', documents: [] });
    prisma.kycDocument.findMany.mockResolvedValueOnce(['ID_FRONT', 'ID_BACK', 'SELFIE', 'PROOF_OF_ADDRESS'].map((documentType) => ({ documentType })));
    await service.submit(actor('Retail Investor', 'USR-APPLICANT'));
    expect(checks.run).toHaveBeenCalledWith('KYC-1', { reason: 'SUBMITTED' });
  });

  it('hides automated-check signals from the applicant', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, checkRecommendation: 'ADVERSE', checkReasons: ['DUPLICATE_IDENTITY: failed'], checksUpdatedAt: new Date(), documents: [] });
    const mine = await service.getMine(actor('Retail Investor', 'USR-APPLICANT'));
    expect(mine).not.toHaveProperty('checkRecommendation');
    expect(mine).not.toHaveProperty('checkReasons');
  });

  it('rejects a file whose bytes are not really a JPG, PNG or PDF', async () => {
    const file = { originalname: 'selfie.png', mimetype: 'image/png', size: 11, buffer: Buffer.from('<html></html>') } as Express.Multer.File;
    await expect(service.uploadDocument(actor('Retail Investor', 'USR-APPLICANT'), 'SELFIE', file)).rejects.toThrow(/not a valid JPG, PNG or PDF/);
    expect(prisma.kycDocument.upsert).not.toHaveBeenCalled();
  });

  it('never approves an identity already verified for another account', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce(submitted);
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'KYC-OTHER' }]);
    await expect(service.review(actor('KYC Officer'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match', overrideReason: 'Officer insists on approving this' })).rejects.toThrow(/already verified for another account/);
    expect(tx.kycApplication.updateMany).not.toHaveBeenCalled();
  });

  it('requires an override reason to approve past a failed check, and records it', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, checkRecommendation: 'ADVERSE' });
    prisma.kycCheckResult.findMany.mockResolvedValueOnce([{ checkType: 'DUPLICATE_IDENTITY', status: 'FAIL' }]);
    await expect(service.review(actor('KYC Officer'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match' })).rejects.toBeInstanceOf(ConflictException);

    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, checkRecommendation: 'ADVERSE' }).mockResolvedValueOnce({ ...submitted, status: 'APPROVED', documents: [], reviews: [] });
    prisma.kycCheckResult.findMany.mockResolvedValueOnce([{ checkType: 'DUPLICATE_IDENTITY', status: 'FAIL' }]);
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.review(actor('KYC Officer'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match', overrideReason: 'Verified in person at the branch' });
    expect(tx.kycApplication.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reviewComment: expect.stringContaining('Override of failed automated checks (DUPLICATE_IDENTITY): Verified in person at the branch') }) }));
  });

  it('requires an explicit acknowledgement to approve while checks show warnings', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, checkRecommendation: 'ATTENTION' });
    prisma.kycCheckResult.findMany.mockResolvedValueOnce([{ checkType: 'DOCUMENT_CONTENT', status: 'REVIEW' }]);
    await expect(service.review(actor('KYC Officer'), 'KYC-1', { decision: 'APPROVED', kycLevel: 'LEVEL_1', comment: 'Documents match' })).rejects.toThrow(/warnings/);
    expect(tx.kycApplication.updateMany).not.toHaveBeenCalled();
  });

  it('lets a reviewer reject or request changes regardless of check warnings', async () => {
    prisma.kycApplication.findFirst.mockResolvedValueOnce({ ...submitted, checkRecommendation: 'ADVERSE' }).mockResolvedValueOnce({ ...submitted, documents: [], reviews: [] });
    tx.kycApplication.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.review(actor('KYC Officer'), 'KYC-1', { decision: 'REJECTED', comment: 'Name on ID does not match' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
