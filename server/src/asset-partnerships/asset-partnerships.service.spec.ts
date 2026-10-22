import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AssetPartnershipsService } from './asset-partnerships.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: () => null }));

const actor = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const owner = actor('Asset Owner', 'ORG-AO', 'USR-AO');
const sponsor = actor('Project Sponsor', 'ORG-FELDA', 'USR-PS');
const legal = actor('Legal Officer', 'ORG-PUBLIC', 'USR-LEGAL');
const shariah = actor('Shariah Reviewer', 'ORG-PUBLIC', 'USR-SHARIAH');

const ijarah = { akad: 'IJARAH' as const, terms: { rentAmount: 9000, rentFrequency: 'MONTHLY' as const, upkeepBy: 'LESSEE' as const, currency: 'MYR' }, startDate: '2027-01-01', endDate: '2027-07-01' };
const machine = { id: 'ASSET-MYS-EXCAV001', organisationId: 'ORG-AO', countryNodeId: 'CN-MYS', assetType: 'MACHINERY', status: 'VERIFIED', offeredToPdp: true };
const need = { id: 'NEED-MYS-0000001', organisationId: 'ORG-FELDA', countryNodeId: 'CN-MYS', assetType: 'MACHINERY', status: 'OPEN', project: { projectId: 'PRJ-1', organisationId: 'ORG-FELDA', status: 'APPROVED' } };

/** An engagement as read back with its asset, project and need. */
const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'ENG-MYS-0000001', assetId: machine.id, projectId: 'PRJ-1', needId: need.id, countryNodeId: 'CN-MYS', ownerOrganisationId: 'ORG-AO', pdpOrganisationId: 'ORG-FELDA',
  direction: 'OFFER', status: 'PROPOSED', awaiting: 'PDP', akad: 'IJARAH', terms: ijarah.terms, startDate: new Date('2027-01-01'), endDate: new Date('2027-07-01'), history: [],
  legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, createdBy: 'USR-AO', createdAt: new Date(), updatedAt: new Date(),
  asset: { id: machine.id, assetType: 'MACHINERY', name: 'Excavator Komatsu PC200-8', location: 'Bangi', titleReference: 'S/N KMT123', details: { manufacturer: 'Komatsu', model: 'PC200-8', serialNumber: 'KMT123' }, estimatedValue: 280000, currency: 'MYR', isEncumbered: false, encumbranceNote: null, intendedUse: 'IJARAH', status: 'VERIFIED', ownerUserId: 'USR-AO', organisation: { name: 'Al Hidayah Group Sdn Bhd' } },
  project: { projectId: 'PRJ-1', projectCode: 'MYS-AGRI-2026', projectName: 'FELDA replanting', sector: 'Agriculture', status: 'APPROVED', projectSponsorId: 'USR-PS', organisation: { name: 'FELDA' } },
  need: { id: need.id, title: 'Excavators for replanting', quantity: 1, createdBy: 'USR-PS' },
  ...overrides,
});

describe('AssetPartnershipsService', () => {
  const prisma = {
    asset: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    project: { findFirst: jest.fn() },
    projectAssetNeed: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    assetEngagement: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn(), count: jest.fn() },
    userRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new AssetPartnershipsService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.assetEngagement.findMany.mockResolvedValue([]);
  });

  it('lets an asset owner offer a verified machine to a project need, then waits for the delivery partner', async () => {
    prisma.projectAssetNeed.findFirst.mockResolvedValueOnce(need);
    prisma.asset.findFirst.mockResolvedValueOnce(machine);
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(null);
    prisma.assetEngagement.create.mockImplementationOnce(async ({ data }) => row(data));
    const created = await service.createEngagement(owner, { assetId: machine.id, needId: need.id, ...ijarah });
    expect(prisma.assetEngagement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ direction: 'OFFER', awaiting: 'PDP', ownerOrganisationId: 'ORG-AO', pdpOrganisationId: 'ORG-FELDA' }) }));
    expect(created.myParty).toBe('OWNER');
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-PS', type: 'ASSET_PARTNERSHIP' }));
  });

  it('refuses an offer of the wrong asset type, an unverified asset, or incomplete Ijarah terms', async () => {
    prisma.projectAssetNeed.findFirst.mockResolvedValueOnce({ ...need, assetType: 'LAND' });
    prisma.asset.findFirst.mockResolvedValueOnce(machine);
    await expect(service.createEngagement(owner, { assetId: machine.id, needId: need.id, ...ijarah })).rejects.toThrow('not the type of asset');
    prisma.projectAssetNeed.findFirst.mockResolvedValueOnce(need);
    prisma.asset.findFirst.mockResolvedValueOnce({ ...machine, status: 'SUBMITTED' });
    await expect(service.createEngagement(owner, { assetId: machine.id, needId: need.id, ...ijarah })).rejects.toThrow('verified asset');
    await expect(service.createEngagement(owner, { assetId: machine.id, needId: need.id, ...ijarah, terms: { currency: 'MYR' } })).rejects.toThrow('rent (ujrah)');
  });

  it('lets a delivery partner ask only for an asset its owner chose to offer, and hides its identifiers until approval', async () => {
    prisma.project.findFirst.mockResolvedValue({ projectId: 'PRJ-1', organisationId: 'ORG-FELDA', status: 'APPROVED' });
    prisma.asset.findFirst.mockResolvedValueOnce(null);
    await expect(service.createEngagement(sponsor, { assetId: machine.id, projectId: 'PRJ-1', ...ijarah })).rejects.toThrow('not offered');
    prisma.asset.findFirst.mockResolvedValueOnce(machine);
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(null);
    prisma.assetEngagement.create.mockImplementationOnce(async ({ data }) => row({ ...data, needId: null, need: null }));
    const created = await service.createEngagement(sponsor, { assetId: machine.id, projectId: 'PRJ-1', ...ijarah });
    expect(created.awaiting).toBe('OWNER');
    expect(created.asset.details).toEqual({ manufacturer: 'Komatsu', model: 'PC200-8' });
    expect(created.asset).not.toHaveProperty('titleReference');
    expect(created.ownerOrganisationName).toBeNull();
  });

  it('lets only the side whose turn it is respond; a counter-offer passes the turn back', async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    await expect(service.respond(owner, 'ENG-MYS-0000001', { action: 'ACCEPT' })).rejects.toThrow('other side');
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    prisma.assetEngagement.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ awaiting: 'OWNER', terms: { ...ijarah.terms, rentAmount: 8000 } }));
    await service.respond(sponsor, 'ENG-MYS-0000001', { action: 'COUNTER', terms: { rentAmount: 8000, rentFrequency: undefined, upkeepBy: undefined, currency: undefined }, note: 'Within budget at RM 8,000.' });
    expect(prisma.assetEngagement.updateMany).toHaveBeenCalledWith({ where: { id: 'ENG-MYS-0000001', status: 'PROPOSED', awaiting: 'PDP' }, data: expect.objectContaining({ awaiting: 'OWNER', terms: expect.objectContaining({ rentAmount: 8000, upkeepBy: 'LESSEE' }) }) });
  });

  it('lets the proposer withdraw, but the side whose turn it is must decline instead', async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    await expect(service.withdraw(sponsor, 'ENG-MYS-0000001', {})).rejects.toThrow('decline it instead');
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    prisma.assetEngagement.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ status: 'WITHDRAWN', awaiting: 'NONE' }));
    await expect(service.withdraw(owner, 'ENG-MYS-0000001', { note: 'Sold the machine.' })).resolves.toMatchObject({ status: 'WITHDRAWN', canWithdraw: false });
  });

  it('refuses to accept more assets than the need asked for', async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    prisma.projectAssetNeed.findUnique.mockResolvedValueOnce({ quantity: 1, status: 'OPEN' });
    prisma.assetEngagement.count.mockResolvedValueOnce(1);
    await expect(service.respond(sponsor, 'ENG-MYS-0000001', { action: 'ACCEPT' })).rejects.toThrow('already has 1 of 1 asset accepted or approved');
  });

  it('closes the other open offers, and tells their owners, once the need is filled', async () => {
    const accepted = row({ status: 'ACCEPTED', awaiting: 'REVIEW', legalApprovedBy: legal.userId });
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(accepted);
    prisma.assetEngagement.updateMany.mockResolvedValue({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ status: 'APPROVED', legalApprovedBy: legal.userId, shariahApprovedBy: shariah.userId }));
    prisma.projectAssetNeed.findUnique.mockResolvedValueOnce({ quantity: 1, status: 'OPEN' });
    prisma.assetEngagement.count.mockResolvedValueOnce(1);
    prisma.assetEngagement.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([row({ id: 'ENG-MYS-OTHER001', asset: { ...row().asset, ownerUserId: 'USR-AO2' } })]);
    await service.review(shariah, accepted.id, { decision: 'APPROVE', note: 'Akad sound.' });
    expect(prisma.assetEngagement.updateMany).toHaveBeenLastCalledWith({ where: { id: 'ENG-MYS-OTHER001', status: 'PROPOSED' }, data: expect.objectContaining({ status: 'DECLINED', awaiting: 'NONE' }) });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO2', title: 'Offer closed' }));
    prisma.assetEngagement.updateMany.mockReset();
  });

  it('sends an accepted offer back to the side that wrote its terms when a reviewer asks for changes', async () => {
    const proposed = { at: '2026-10-21T09:08:00Z', by: 'USR-AO', byName: 'Amran', party: 'OWNER', action: 'PROPOSED' };
    const acceptedEntry = { at: '2026-10-21T09:17:00Z', by: 'USR-PS', byName: 'Umar', party: 'PDP', action: 'ACCEPTED' };
    const accepted = row({ status: 'ACCEPTED', awaiting: 'REVIEW', history: [proposed, acceptedEntry] });
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(accepted);
    prisma.assetEngagement.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ status: 'PROPOSED', awaiting: 'OWNER' }));
    await service.review(legal, accepted.id, { decision: 'REQUEST_CHANGES', note: 'Confirm the profit share: 6% looks like a typo.' });
    const data = prisma.assetEngagement.updateMany.mock.calls[0][0].data;
    expect(data).toMatchObject({ status: 'PROPOSED', awaiting: 'OWNER', legalApprovedBy: null, shariahApprovedBy: null });
    expect(data.history[2]).toMatchObject({ party: 'REVIEW', action: 'LEGAL_CHANGES_REQUESTED' });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', title: 'Legal review: changes requested' }));

    // The owner must correct the terms; accepting them unchanged is refused.
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row({ status: 'PROPOSED', awaiting: 'OWNER', history: [...data.history] }));
    await expect(service.respond(owner, accepted.id, { action: 'ACCEPT' })).rejects.toThrow('counter-offer');
  });

  it('refuses a counter-offer that changes nothing', async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    await expect(service.respond(sponsor, 'ENG-MYS-0000001', { action: 'COUNTER', terms: { rentAmount: 9000 } })).rejects.toThrow('changes nothing');
    expect(prisma.assetEngagement.updateMany).not.toHaveBeenCalled();
  });

  it("needs the delivery partner's capital before a Musharakah is accepted", async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row({ akad: 'MUSHARAKAH', terms: { contributionValue: 500000, profitSharePct: 60, currency: 'MYR' } }));
    await expect(service.respond(sponsor, 'ENG-MYS-0000001', { action: 'ACCEPT' })).rejects.toThrow('capital contribution');
  });

  it('refuses to accept when the asset is already committed for an overlapping period', async () => {
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row());
    prisma.assetEngagement.findMany.mockResolvedValueOnce([{ id: 'ENG-MYS-OTHER001', startDate: new Date('2027-03-01'), endDate: new Date('2027-09-01') }]);
    await expect(service.respond(sponsor, 'ENG-MYS-0000001', { action: 'ACCEPT' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('needs Legal and Shariah approval from different people outside both parties, then fills the need', async () => {
    const accepted = row({ status: 'ACCEPTED', awaiting: 'REVIEW' });
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(accepted);
    await expect(service.review(actor('Legal Officer', 'ORG-FELDA', 'USR-L2'), accepted.id, { decision: 'APPROVE', note: 'Terms fine.' })).rejects.toBeInstanceOf(ForbiddenException);

    prisma.assetEngagement.findFirst.mockResolvedValueOnce(accepted);
    prisma.assetEngagement.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ status: 'ACCEPTED', legalApprovedBy: legal.userId }));
    await service.review(legal, accepted.id, { decision: 'APPROVE', note: 'Owner may lease; terms clear.' });
    expect(prisma.assetEngagement.updateMany).toHaveBeenLastCalledWith({ where: { id: accepted.id, status: 'ACCEPTED', legalApprovedBy: null }, data: expect.not.objectContaining({ status: 'APPROVED' }) });

    const superAdmin = actor('Super Admin', 'ORG-D8', legal.userId);
    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row({ status: 'ACCEPTED', legalApprovedBy: legal.userId }));
    await expect(service.review(superAdmin, accepted.id, { decision: 'APPROVE', track: 'SHARIAH', note: 'Akad sound.' })).rejects.toThrow('different people');

    prisma.assetEngagement.findFirst.mockResolvedValueOnce(row({ status: 'ACCEPTED', legalApprovedBy: legal.userId }));
    prisma.assetEngagement.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetEngagement.findUniqueOrThrow.mockResolvedValueOnce(row({ status: 'APPROVED', legalApprovedBy: legal.userId, shariahApprovedBy: shariah.userId }));
    prisma.projectAssetNeed.findUnique.mockResolvedValueOnce({ quantity: 1, status: 'OPEN' });
    prisma.assetEngagement.count.mockResolvedValueOnce(1);
    const approved = await service.review(shariah, accepted.id, { decision: 'APPROVE', note: 'Ijarah with known rent and period; major maintenance stays with the owner.' });
    expect(prisma.assetEngagement.updateMany).toHaveBeenLastCalledWith({ where: { id: accepted.id, status: 'ACCEPTED', shariahApprovedBy: null }, data: expect.objectContaining({ status: 'APPROVED', shariahApprovedBy: shariah.userId }) });
    expect(prisma.projectAssetNeed.update).toHaveBeenCalledWith({ where: { id: need.id }, data: { status: 'FILLED' } });
    expect(approved.asset).toHaveProperty('titleReference', 'S/N KMT123');
  });

  it('shows asset owners only open needs of other organisations, and refuses roles outside partnerships', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    (prisma as unknown as { projectAssetNeed: { findMany: jest.Mock } }).projectAssetNeed.findMany = findMany;
    await service.listNeeds(owner);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { countryNodeId: 'CN-MYS', status: 'OPEN', organisationId: { not: 'ORG-AO' } } }));
    await expect(service.listNeeds(actor('Retail Investor', 'ORG-INV', 'USR-INV'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tells every asset owner in the country, outside the delivery partner, about a new need', async () => {
    const needs = prisma.projectAssetNeed as unknown as { create: jest.Mock };
    needs.create = jest.fn().mockImplementation(async ({ data }) => data);
    prisma.project.findFirst.mockResolvedValueOnce({ projectId: 'PRJ-1', organisationId: 'ORG-FELDA', status: 'DRAFT' });
    (prisma.project as unknown as { findUnique: jest.Mock }).findUnique = jest.fn().mockResolvedValue({ projectName: 'FELDA replanting', organisation: { name: 'FELDA' } });
    prisma.userRoleAssignment.findMany.mockResolvedValueOnce([{ userId: 'USR-AO', organisationId: 'ORG-AO' }, { userId: 'USR-AO', organisationId: 'ORG-AO-2' }, { userId: 'USR-AM', organisationId: 'ORG-AO' }]);
    prisma.asset.findMany.mockResolvedValueOnce([]);
    await service.createNeed(sponsor, { projectId: 'PRJ-1', assetType: 'MACHINERY', title: 'Excavators for land clearing', quantity: 3 });
    expect(prisma.userRoleAssignment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ countryNodeId: 'CN-MYS', organisationId: { not: 'ORG-FELDA' } }) }));
    expect(notifications.enqueue).toHaveBeenCalledTimes(3);
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', type: 'ASSET_NEED', resourceType: 'ProjectAssetNeed', message: expect.stringContaining('FELDA needs 3 × machinery for FELDA replanting') }));
  });

  it('tells owners of matching assets not yet verified to act, and asks verifiers to look at submitted ones first', async () => {
    const needs = prisma.projectAssetNeed as unknown as { create: jest.Mock };
    needs.create = jest.fn().mockImplementation(async ({ data }) => data);
    prisma.project.findFirst.mockResolvedValueOnce({ projectId: 'PRJ-1', organisationId: 'ORG-FELDA', status: 'DRAFT' });
    (prisma.project as unknown as { findUnique: jest.Mock }).findUnique = jest.fn().mockResolvedValue({ projectName: 'FELDA replanting', organisation: { name: 'FELDA' } });
    prisma.userRoleAssignment.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ userId: 'USR-CA', organisationId: 'ORG-REGULATOR' }, { userId: 'USR-LO', organisationId: 'ORG-AO' }]);
    prisma.asset.findMany.mockResolvedValueOnce([{ id: 'AST-1', name: 'Excavator Hitachi', status: 'SUBMITTED', ownerUserId: 'USR-AO', organisationId: 'ORG-AO' }, { id: 'AST-2', name: 'Bulldozer', status: 'DRAFT', ownerUserId: 'USR-AO2', organisationId: 'ORG-AO2' }]);
    await service.createNeed(sponsor, { projectId: 'PRJ-1', assetType: 'MACHINERY', title: 'Excavators for land clearing', quantity: 3 });
    expect(prisma.asset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assetType: { in: ['MACHINERY', 'EQUIPMENT'] }, status: { in: ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'] } }) }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO2', title: 'Verify your asset to take part', message: expect.stringContaining('upload its documents') }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-CA', title: 'Asset to verify first', resourceId: 'AST-1' }));
    // A verifier never gets an asset from their own organisation.
    expect(notifications.enqueue).not.toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-LO' }));
  });

  it('lets an owner offer only a verified asset to delivery partners', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...machine, status: 'SUBMITTED' });
    await expect(service.setListing(owner, machine.id, { offered: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setListing(sponsor, machine.id, { offered: true })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
