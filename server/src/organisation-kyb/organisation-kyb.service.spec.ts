import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { OrganisationKybService } from './organisation-kyb.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: (buffer: Buffer) => (buffer.subarray(0, 4).toString() === '%PDF' ? 'application/pdf' : null) }));

const person = (role: AuthenticatedUser['role'], organisationId: string, userId: string, countryNodeId = 'CN-MYS'): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId, organisationId, assignedRoles: [role] });
const amran = person('Asset Owner', 'ORG-AHG', 'USR-AMRAN');
const kybOfficer = person('KYB Officer', 'ORG-ADMIN', 'USR-KYB');

function memory() {
  const organisation = { id: 'ORG-AHG', name: 'Al Hidayah Group Sdn Bhd', countryNodeId: 'CN-MYS', registrationNumber: null as string | null, registeredAddress: null as string | null, kybStatus: 'NOT_SUBMITTED', kybSubmittedAt: null as Date | null, kybReviewedBy: null as string | null, kybReviewedAt: null as Date | null, kybNote: null as string | null, kybHistory: [] as unknown[], kybDocuments: [] as Array<{ id: string; documentType: string; fileName: string; mimeType: string; fileSize: number; sha256: string; integrity: unknown; uploadedBy: string; createdAt: Date }> };
  const prisma = {
    organisation: {
      findUnique: jest.fn(async () => ({ ...organisation, kybDocuments: [...organisation.kybDocuments] })),
      update: jest.fn(async ({ data }) => Object.assign(organisation, data)),
      updateMany: jest.fn(async ({ where, data }) => (where.kybStatus === organisation.kybStatus ? (Object.assign(organisation, data), { count: 1 }) : { count: 0 })),
      findMany: jest.fn(async () => [organisation]),
    },
    organisationKybDocument: { create: jest.fn(async ({ data }) => { const document = { id: `DOC-${organisation.kybDocuments.length + 1}`, ...data, createdAt: new Date() }; organisation.kybDocuments.push(document); return { id: document.id }; }), deleteMany: jest.fn() },
    userRoleAssignment: { findMany: jest.fn(async () => [{ userId: 'USR-KYB', organisationId: 'ORG-ADMIN' }]) },
  };
  return { prisma, organisation };
}

describe('organisation business verification (KYB)', () => {
  const audit = { recordActor: jest.fn() };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };

  it('needs the registration number, the registered address and the SSM company profile before submitting', async () => {
    const { prisma } = memory();
    const service = new OrganisationKybService(prisma as never, audit as never, notifications as never);
    await expect(service.submit(amran)).rejects.toThrow(/registration number.*registered address.*SSM company profile/);
    await service.saveDetails(amran, { registrationNumber: '201901012345 (1234567-A)', registeredAddress: 'Jalan Sungai Lalang, 43500 Semenyih, Selangor' });
    await expect(service.upload(amran, 'SSM_PROFILE', { buffer: Buffer.from('not a pdf'), size: 9, originalname: 'x.txt' } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);
    await service.upload(amran, 'SSM_PROFILE', { buffer: Buffer.from('%PDF-1.4 company profile'), size: 24, originalname: 'ssm.pdf' } as Express.Multer.File);
    const submitted = await service.submit(amran);
    expect(submitted.kybStatus).toBe('SUBMITTED');
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-KYB', title: 'Organisation to verify (KYB)' }));
    await expect(service.saveDetails(amran, { registrationNumber: '1', registeredAddress: 'x' })).rejects.toThrow('with a reviewer');
  });

  it('lets a KYB reviewer of the same country decide, never for their own organisation or another country', async () => {
    const { prisma, organisation } = memory();
    Object.assign(organisation, { kybStatus: 'SUBMITTED', registrationNumber: '201901012345 (1234567-A)', registeredAddress: 'Semenyih' });
    const service = new OrganisationKybService(prisma as never, audit as never, notifications as never);
    await expect(service.review(person('KYB Officer', 'ORG-AHG', 'USR-INSIDE'), 'ORG-AHG', 'APPROVE', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.review(person('KYB Officer', 'ORG-ADMIN', 'USR-ID', 'CN-IDN'), 'ORG-AHG', 'APPROVE', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.review(amran, 'ORG-AHG', 'APPROVE', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    const decided = await service.review(kybOfficer, 'ORG-AHG', 'APPROVE', 'SSM profile matches the registration number.');
    expect(decided).toMatchObject({ kybStatus: 'APPROVED', kybNote: 'SSM profile matches the registration number.' });
    expect((organisation.kybHistory as Array<{ action: string }>).at(-1)).toMatchObject({ action: 'APPROVE' });
  });
});
