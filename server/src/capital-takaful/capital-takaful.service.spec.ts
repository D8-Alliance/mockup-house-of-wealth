import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/identity.service';
import { CapitalTakafulService } from './capital-takaful.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: (buffer: Buffer) => (buffer.subarray(0, 4).toString() === '%PDF' ? 'application/pdf' : null) }));

const person = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const umar = person('Project Sponsor', 'ORG-FELCRA', 'USR-UMAR');
const finance = person('Finance Officer', 'ORG-ADMIN', 'USR-FIN');
const risk = person('Risk Officer', 'ORG-ADMIN', 'USR-RISK');
const pdf = (name: string) => ({ buffer: Buffer.from('%PDF-1.4 document'), size: 17, originalname: name }) as Express.Multer.File;

function memory() {
  const project = { projectId: 'PRJ-1', projectName: 'Durian Jengka', status: 'DRAFT', organisationId: 'ORG-FELCRA', countryNodeId: 'CN-MYS', countryNode: { currency: 'MYR' }, totalProjectCost: 2050000, fundingRequired: 1200000, hasSiteWork: true, hasWorkers: false };
  const commitments: Array<Record<string, unknown>> = [];
  const policies: Array<Record<string, unknown>> = [];
  const claim = (list: Array<Record<string, unknown>>) => jest.fn(async ({ where, data }) => { const item = list.find((row) => row.id === where.id && (!where.status || row.status === where.status)); if (!item) return { count: 0 }; Object.assign(item, data); return { count: 1 }; });
  const prisma = {
    project: { findUnique: jest.fn(async () => project), update: jest.fn(async ({ data }) => Object.assign(project, data)) },
    assetEngagement: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []), findFirst: jest.fn(async () => null) },
    projectCapitalCommitment: { create: jest.fn(async ({ data }) => { commitments.push({ status: 'PLEDGED', ...data }); return data; }), findMany: jest.fn(async () => commitments), findFirst: jest.fn(async ({ where }) => commitments.find((row) => row.id === where.id) ?? null), updateMany: claim(commitments), delete: jest.fn() },
    takafulPolicy: { create: jest.fn(async ({ data }) => { policies.push({ ...data, status: 'SUBMITTED' }); return data; }), findMany: jest.fn(async () => policies), findFirst: jest.fn(async ({ where }) => policies.find((row) => row.id === where.id) ?? null), updateMany: claim(policies) },
    projectMilestone: { aggregate: jest.fn(async () => ({ _sum: { disbursementAmount: 0 } })) },
    userRoleAssignment: { findMany: jest.fn(async () => []), count: jest.fn(async () => 1) },
  };
  return { prisma, commitments, policies };
}

describe('sponsor capital and takaful cover', () => {
  const audit = { recordActor: jest.fn() };

  it('takes the sponsor capital from pledge to deposit, decided by Finance of another organisation', async () => {
    const { prisma, commitments } = memory();
    const service = new CapitalTakafulService(prisma as never, audit as never);
    let view = await service.pledge(umar, 'PRJ-1', { source: 'SPONSOR_CASH', partyName: 'FELCRA', amount: 205000 });
    expect(view.facts!.capital).toMatchObject({ required: 205000, pledged: 205000, evidenced: 0 });
    const id = String(commitments[0].id);
    expect(id).toMatch(/^CAP-MYS-[0-9A-F]{8}$/);
    await expect(service.uploadEvidence(umar, 'PRJ-1', id, { ...pdf('x'), buffer: Buffer.from('not a pdf') } as Express.Multer.File)).rejects.toBeInstanceOf(BadRequestException);
    await service.uploadEvidence(umar, 'PRJ-1', id, pdf('bank-statement.pdf'));
    await expect(service.reviewCapital(person('Finance Officer', 'ORG-FELCRA', 'USR-INSIDE'), 'PRJ-1', id, 'VERIFY', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.reviewCapital(umar, 'PRJ-1', id, 'VERIFY', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    await service.reviewCapital(finance, 'PRJ-1', id, 'VERIFY', 'Statement shows RM 205,000 available.');
    view = await service.recordDeposit(finance, 'PRJ-1', id, 'MBB-20261101-0042');
    expect(view.facts!.capital).toMatchObject({ evidenced: 205000, deposited: 205000 });
    expect((commitments[0].history as Array<{ action: string }>).map((entry) => entry.action)).toEqual(['PLEDGED', 'EVIDENCE_SUBMITTED', 'EVIDENCED', 'DEPOSITED']);
  });

  it('accepts conventional insurance only with the Shariah adviser approval, and lets Risk verify cover', async () => {
    const { prisma, policies } = memory();
    const service = new CapitalTakafulService(prisma as never, audit as never);
    const base = { coverType: 'PUBLIC_LIABILITY' as const, provider: 'Takaful Contoh Berhad', policyNumber: 'PL-2026-001', sumCovered: 1000000, startDate: '2026-10-01', endDate: '2027-09-30', lossPayee: 'Project account', conventional: false };
    let view = await service.view(umar, 'PRJ-1');
    expect(view.facts!.cover.map((item) => item.state)).toEqual(['MISSING', 'MISSING']);
    await expect(service.addPolicy(umar, 'PRJ-1', { ...base, conventional: true }, pdf('policy.pdf'))).rejects.toThrow('Shariah adviser');
    await expect(service.addPolicy(umar, 'PRJ-1', { ...base, endDate: '2026-09-01' }, pdf('policy.pdf'))).rejects.toThrow('end after it starts');
    await service.addPolicy(umar, 'PRJ-1', base, pdf('policy.pdf'));
    await expect(service.reviewPolicy(finance, 'PRJ-1', String(policies[0].id), 'VERIFY', 'Fine')).rejects.toBeInstanceOf(ForbiddenException);
    view = await service.reviewPolicy(risk, 'PRJ-1', String(policies[0].id), 'VERIFY', 'Policy schedule checked.');
    expect(view.facts!.cover.find((item) => item.coverType === 'PUBLIC_LIABILITY')).toMatchObject({ state: 'COVERED' });
  });
});
