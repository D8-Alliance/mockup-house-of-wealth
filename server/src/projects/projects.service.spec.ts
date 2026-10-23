import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { PolicyService } from '../policy/policy.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const auditMock = {
  recordActor: jest.fn().mockResolvedValue(undefined),
};

const policy = new PolicyService();

function actor(
  role: AuthenticatedUser['role'],
  countryNodeId: string,
  organisationId = 'ORG-A',
): AuthenticatedUser {
  return {
    userId: 'USR-A',
    idpSubjectId: 'USR-A',
    email: 'a@example.test',
    name: 'A',
    role,
    countryNodeId,
    organisationId,
    assignedRoles: [role],
  };
}

const prismaMock = {
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    update: jest.fn(),
  },
  projectDocument: {
    findFirst: jest.fn(),
  },
  organisation: { findFirst: jest.fn().mockResolvedValue({ id: 'ORG-A' }) },
};

describe('ProjectsService list tenant scoping (country admin sees only its own country)', () => {
  const service = new ProjectsService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy);

  beforeEach(() => jest.clearAllMocks());

  it('lets a Super Admin list across all countries (unfiltered)', async () => {
    await service.list(actor('Super Admin', 'CN-MYS'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('restricts a Country Admin to rows in its own country node only', async () => {
    await service.list(actor('Country Admin', 'CN-MYS'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-MYS' } }),
    );
  });

  it('uses a different country node for a different Country Admin', async () => {
    await service.list(actor('Country Admin', 'CN-IDN'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-IDN' } }),
    );
  });

  it('restricts an org-scoped role to its organisation AND country', async () => {
    await service.list(actor('Organization Admin', 'CN-MYS', 'ORG-A'));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-MYS', organisationId: 'ORG-A' } }),
    );
  });

  it('restricts a Project Sponsor to projects assigned to that sponsor', async () => {
    await service.list({ ...actor('Project Sponsor', 'CN-TUR', 'ORG-TURK-LOG'), userId: 'USR-TUR-003' });

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { countryNodeId: 'CN-TUR', organisationId: 'ORG-TURK-LOG', projectSponsorId: 'USR-TUR-003' } }),
    );
  });

  it('rejects reading projects when the role has no marketplace.read permission', async () => {
    await expect(service.list(actor('Project Manager', 'CN-MYS'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });

  it('rejects a sponsor downloading a document from another sponsor project', async () => {
    prismaMock.projectDocument.findFirst.mockResolvedValue({
      id: 'DOC-B',
      projectId: 'PROJECT-B',
      fileName: 'private.pdf',
      project: {
        projectSponsorId: 'USR-B',
        organisationId: 'ORG-A',
        countryNodeId: 'CN-MYS',
      },
    });

    await expect(service.downloadDocument(
      'PROJECT-B',
      'DOC-B',
      actor('Project Sponsor', 'CN-MYS', 'ORG-A'),
    )).rejects.toThrow('Project is not assigned to this sponsor');
  });

  it('creates a sponsor draft owned by the authenticated sponsor', async () => {
    prismaMock.project.create.mockResolvedValue({ projectId: 'PROJECT-NEW' });

    await service.create({
      projectCode: 'PDP-NEW',
      projectName: 'Sponsor Draft',
      description: 'A sponsor-owned draft project',
      organisationId: 'ORG-A',
      countryNodeId: 'CN-MYS',
      sector: 'Green Energy',
      totalProjectCost: 100000,
      sponsorContribution: 0,
      fundingRequired: 100000,
      proposedShariahContract: 'Ijarah',
      projectSponsorId: 'ATTACKER-ID',
    }, actor('Project Sponsor', 'CN-MYS', 'ORG-A'));

    expect(prismaMock.project.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'DRAFT',
        projectSponsorId: 'USR-A',
      }),
    }));
  });
});

describe('ProjectsService approval lock and reopen', () => {
  const service = new ProjectsService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy);
  const project = (status: string) => ({ projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status });
  const admin = actor('Country Admin', 'CN-MYS');

  beforeEach(() => jest.clearAllMocks());

  it('blocks evidence uploads once the project is approved', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('POOLING'));
    const file = { originalname: 'cashflow.pdf' } as Express.Multer.File;

    await expect(service.uploadEvidence('PRJ-1', 'CASHFLOW_FORECAST', file, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not let a plain status change move an approved project back to due diligence', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('APPROVED'));

    await expect(service.updateStatus('PRJ-1', { status: 'DUE_DILIGENCE' }, admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses to reopen a project once funds are committed', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('FUNDED'));

    await expect(service.reopenProject('PRJ-1', 'Valuation report replaced', admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires a reason to reopen', async () => {
    await expect(service.reopenProject('PRJ-1', '  ', admin)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ProjectsService: a sponsor corrects a draft and submits it', () => {
  const service = new ProjectsService(prismaMock as unknown as PrismaService, auditMock as unknown as AuditService, policy);
  const project = (status: string) => ({ projectId: 'PRJ-1', projectSponsorId: 'USR-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', status, sponsorEntityType: 'FELDA / Plantation & Agriculture' });
  const sponsor = actor('Project Sponsor', 'CN-MYS');

  beforeEach(() => jest.clearAllMocks());

  it('lets the sponsor correct a draft, and records what changed', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('DRAFT'));
    prismaMock.project.update.mockResolvedValue({ ...project('DRAFT'), sponsorEntityType: 'FELCRA / Agro-Land Development' });
    await service.updateDetails('PRJ-1', { sponsorEntityType: ' FELCRA / Agro-Land Development ' }, sponsor);
    expect(prismaMock.project.update).toHaveBeenCalledWith({ where: { projectId: 'PRJ-1' }, data: { sponsorEntityType: 'FELCRA / Agro-Land Development' } });
    expect(auditMock.recordActor).toHaveBeenCalledWith(sponsor, expect.objectContaining({ action: 'project.update', metadata: { fields: ['sponsorEntityType'], before: { sponsorEntityType: 'FELDA / Plantation & Agriculture' } } }));
  });

  it('refuses to edit a project under review', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('DUE_DILIGENCE'));
    await expect(service.updateDetails('PRJ-1', { projectName: 'Renamed' }, sponsor)).rejects.toThrow('Return it to draft first');
  });

  it('lets a sponsor only submit a draft or take it back; reviewers move it further', async () => {
    prismaMock.project.findUnique.mockResolvedValue(project('DRAFT'));
    await expect(service.updateStatus('PRJ-1', { status: 'FUNDING_OPEN' }, sponsor)).rejects.toBeInstanceOf(ForbiddenException);
    prismaMock.project.findUnique.mockResolvedValue(project('DUE_DILIGENCE'));
    await expect(service.updateStatus('PRJ-1', { status: 'REJECTED' }, sponsor)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fixes the name, sector, akad and location once an asset partnership was agreed on them', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ ...project('DRAFT'), projectName: 'Oil palm replanting', location: 'Semenyih' });
    (prismaMock as Record<string, unknown>).assetEngagement = { findMany: jest.fn().mockResolvedValue([{ id: 'ENG-MYS-1' }]) };
    await expect(service.updateDetails('PRJ-1', { projectName: 'Durian Jengka' }, sponsor)).rejects.toThrow('asset partnership ENG-MYS-1 was agreed on them');
    prismaMock.project.update.mockResolvedValue(project('DRAFT'));
    await expect(service.updateDetails('PRJ-1', { description: 'More detail on the planting plan.' }, sponsor)).resolves.toBeDefined();
  });

  it('saves a tranche only with a purpose, a date and an amount within the funding left', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ ...project('DRAFT'), fundingRequired: 1200000 });
    const milestones = { aggregate: jest.fn().mockResolvedValue({ _sum: { disbursementAmount: 750000 } }), create: jest.fn().mockResolvedValue({ id: 'MS-1' }) };
    (prismaMock as Record<string, unknown>).projectMilestone = milestones;
    await expect(service.createMilestone('PRJ-1', { title: 'Seedlings', disbursementAmount: 100000 }, sponsor)).rejects.toThrow('target date');
    await expect(service.createMilestone('PRJ-1', { title: 'Seedlings', targetDate: '2027-04-01', disbursementAmount: 500000 }, sponsor)).rejects.toThrow('450000.00 of 1200000.00 is left');
    await service.createMilestone('PRJ-1', { title: 'Seedlings and irrigation', targetDate: '2027-04-01', disbursementAmount: 450000 }, sponsor);
    expect(milestones.create).toHaveBeenCalledWith({ data: expect.objectContaining({ title: 'Seedlings and irrigation', disbursementAmount: 450000, status: 'UPCOMING' }) });
    prismaMock.project.findUnique.mockResolvedValue({ ...project('APPROVED'), fundingRequired: 1200000 });
    await expect(service.createMilestone('PRJ-1', { title: 'More', targetDate: '2027-04-01', disbursementAmount: 1 }, sponsor)).rejects.toThrow('locked');
  });
});
