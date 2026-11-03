import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { LeasingService } from './leasing.service';
import { addMonths, leaseEndDate, leaseTermMonths, rentSchedule, shariahFlags } from './leasing-rules';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: () => null }));

const actor = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const owner = actor('Asset Owner', 'ORG-AHG', 'USR-AO');
const tenant = actor('Organization Admin', 'ORG-TENANT', 'USR-TN');
const legal = actor('Legal Officer', 'ORG-PUBLIC', 'USR-LEGAL');
const shariah = actor('Shariah Reviewer', 'ORG-PUBLIC', 'USR-SHARIAH');

const dec = (value: number) => new Prisma.Decimal(value);
const asset = { id: 'ASSET-MYS-TOWER001', name: 'Menara Hidayah', assetType: 'BUILDING', location: 'Jalan Teluk Sisek, Kuantan', details: { district: 'Kuantan', state: 'Pahang' }, status: 'VERIFIED', ownerUserId: 'USR-AO', organisationId: 'ORG-AHG', organisation: { name: 'Al Hidayah Group' } };
const unit = { id: 'UNIT-MYS-FLOOR007', assetId: asset.id, organisationId: 'ORG-AHG', countryNodeId: 'CN-MYS', label: 'Floor 7', description: '', floorArea: dec(8500), floorAreaUnit: 'SQFT', monthlyRent: dec(25500), currency: 'MYR', depositMonths: dec(2), utilityDepositMonths: dec(1), renovationDeposit: dec(10000), utilitiesPaidBy: 'TENANT_DIRECT', minTermMonths: 12, availableFrom: null, permittedUse: 'Office', status: 'LISTED', createdBy: 'USR-AO', createdAt: new Date(), updatedAt: new Date(), asset };
const nextYear = new Date().getUTCFullYear() + 1;
const start = `${nextYear}-01-01`;

const lease = (overrides: Record<string, unknown> = {}) => ({
  id: 'LEASE-MYS-0000001', unitId: unit.id, assetId: asset.id, countryNodeId: 'CN-MYS', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT',
  status: 'PROPOSED', awaiting: 'OWNER', monthlyRent: dec(25500), currency: 'MYR', depositAmount: dec(51000), utilityDepositAmount: dec(25500), renovationDepositAmount: dec(10000), utilitiesPaidBy: 'TENANT_DIRECT', depositRefunds: null, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${nextYear}-12-31T00:00:00Z`),
  intendedUse: 'Head office', tenantActivity: 'Engineering consultancy', history: [], legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, endedAt: null,
  createdBy: 'USR-TN', createdAt: new Date(), updatedAt: new Date(), unit, payments: [],
  ...overrides,
});

describe('leasing rules', () => {
  it('keeps the month end when a month is shorter', () => {
    expect(addMonths(new Date('2027-01-31T00:00:00Z'), 1).toISOString().slice(0, 10)).toBe('2027-02-28');
  });

  it('ends a 12-month lease the day before its anniversary and counts it back to 12 months', () => {
    const begin = new Date('2026-12-01T00:00:00Z');
    const end = leaseEndDate(begin, 12);
    expect(end.toISOString().slice(0, 10)).toBe('2027-11-30');
    expect(leaseTermMonths(begin, end)).toBe(12);
  });

  it('schedules one month of rent per month, due in advance', () => {
    const schedule = rentSchedule(new Date('2026-12-15T00:00:00Z'), 3, 25500);
    expect(schedule).toEqual([
      { period: '2026-12', dueDate: '2026-12-15', amount: 25500 },
      { period: '2027-01', dueDate: '2027-01-15', amount: 25500 },
      { period: '2027-02', dueDate: '2027-02-15', amount: 25500 },
    ]);
  });

  it('flags activities an Ijarah may not serve, and not an ordinary office', () => {
    expect(shariahFlags('Office', 'Engineering consultancy')).toEqual([]);
    expect(shariahFlags('Office and karaoke lounge', 'Licensed moneylender')).toEqual(['conventional finance (riba)', 'adult entertainment']);
  });
});

describe('LeasingService', () => {
  const prisma = {
    asset: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    organisation: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 'ORG-TENANT', name: 'Teras Engineering Sdn Bhd' }]) },
    leasableUnit: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    assetLease: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    leaseRentPayment: { createMany: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
    userRoleAssignment: { findMany: jest.fn().mockResolvedValue([{ userId: 'USR-LEGAL', organisationId: 'ORG-PUBLIC' }]) },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'USR-TN', name: 'Hafiz Teras', email: 'hafiz@teras.my', profile: { phone: '+60123456789' } }, { id: 'USR-AO', name: 'Amran Zain', email: 'amran@ahg.my', profile: null }]) },
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new LeasingService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);
  const request = { unitId: unit.id, startDate: start, termMonths: 12, intendedUse: 'Head office', tenantActivity: 'Engineering consultancy', shariahDeclaration: true };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organisation.findMany.mockResolvedValue([{ id: 'ORG-TENANT', name: 'Teras Engineering Sdn Bhd' }]);
  });

  it('lists a unit only on a verified asset of the owner', async () => {
    prisma.asset.findFirst.mockResolvedValueOnce({ ...asset, countryNodeId: 'CN-MYS', status: 'SUBMITTED' });
    await expect(service.createUnit(owner, { assetId: asset.id, label: 'Floor 7', monthlyRent: 25500, currency: 'MYR' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.leasableUnit.create).not.toHaveBeenCalled();
  });

  it('turns away a company that has not passed KYB', async () => {
    prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'SUBMITTED' });
    await expect(service.createLease(tenant, request)).rejects.toThrow(/business verification/);
  });

  it('records a verified company\'s request at the asking rent with a two-month deposit and tells the owner', async () => {
    prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
    prisma.leasableUnit.findFirst.mockResolvedValueOnce(unit);
    prisma.assetLease.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(lease());
    prisma.assetLease.create.mockImplementationOnce(async ({ data }) => lease(data));
    await service.createLease(tenant, request);
    expect(prisma.assetLease.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ awaiting: 'OWNER', monthlyRent: 25500, depositAmount: 51000, ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT' }) }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', title: 'A company asks to rent your space' }));
  });

  it('refuses a term shorter than the owner\'s minimum', async () => {
    prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
    prisma.leasableUnit.findFirst.mockResolvedValueOnce(unit);
    await expect(service.createLease(tenant, { ...request, termMonths: 6 })).rejects.toThrow(/at least 12 months/);
  });

  it('refuses a request for dates another lease already holds', async () => {
    prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
    prisma.leasableUnit.findFirst.mockResolvedValueOnce(unit);
    prisma.assetLease.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'LEASE-MYS-OTHER', startDate: new Date('2020-01-01'), endDate: new Date(`${nextYear + 2}-01-01`) });
    await expect(service.createLease(tenant, request)).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets only the side whose turn it is respond, and accepting needs confirmation', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    await expect(service.respond(tenant, 'LEASE-MYS-0000001', { action: 'ACCEPT', confirmed: true })).rejects.toThrow(/other side/);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    await expect(service.respond(owner, 'LEASE-MYS-0000001', { action: 'ACCEPT' })).rejects.toThrow(/Confirm/);
  });

  it('passes the turn to the tenant on a counter-offer with a new rent and its deposit', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease()).mockResolvedValueOnce(lease({ awaiting: 'TENANT' }));
    prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetLease.findUniqueOrThrow.mockResolvedValueOnce(lease({ awaiting: 'TENANT', monthlyRent: dec(27000) }));
    await service.respond(owner, 'LEASE-MYS-0000001', { action: 'COUNTER', monthlyRent: 27000 });
    expect(prisma.assetLease.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'LEASE-MYS-0000001', status: 'PROPOSED', awaiting: 'OWNER' }, data: expect.objectContaining({ monthlyRent: 27000, depositAmount: 54000, awaiting: 'TENANT' }) }));
  });

  it('keeps reviewers from the parties out, and needs a reason to approve a flagged activity', async () => {
    const insider = actor('Legal Officer', 'ORG-AHG', 'USR-INSIDE');
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'ACCEPTED', awaiting: 'REVIEW' }));
    await expect(service.review(insider, 'LEASE-MYS-0000001', { decision: 'APPROVE', note: 'Terms in order.' })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'ACCEPTED', awaiting: 'REVIEW', tenantActivity: 'Licensed moneylender' }));
    await expect(service.review(shariah, 'LEASE-MYS-0000001', { decision: 'APPROVE', note: 'OK.' })).rejects.toThrow(/permissible/);
  });

  it('sets the monthly rent schedule when the second approval is given', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'ACCEPTED', awaiting: 'REVIEW', shariahApprovedBy: 'USR-SHARIAH' })).mockResolvedValueOnce(null).mockResolvedValueOnce(lease({ status: 'APPROVED' }));
    prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.assetLease.findUniqueOrThrow.mockResolvedValueOnce(lease({ status: 'APPROVED', awaiting: 'NONE' }));
    await service.review(legal, 'LEASE-MYS-0000001', { decision: 'APPROVE', note: 'Owner holds title; terms in order.' });
    expect(prisma.assetLease.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED', legalApprovedBy: 'USR-LEGAL' }) }));
    const rows = prisma.leaseRentPayment.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(12);
    expect(rows[0]).toEqual(expect.objectContaining({ period: `${nextYear}-01`, amount: 25500 }));
  });

  it('lets only the owner record rent, once per month, and shows a past-due month as overdue', async () => {
    const payments = [{ period: '2020-01', dueDate: new Date('2020-01-01'), amount: dec(25500), currency: 'MYR', status: 'DUE', paidAt: null, reference: null }];
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'APPROVED', payments }));
    await expect(service.recordPayment(tenant, 'LEASE-MYS-0000001', '2020-01', { reference: 'IBG-1' })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'APPROVED', payments }));
    prisma.leaseRentPayment.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.recordPayment(owner, 'LEASE-MYS-0000001', '2020-01', { reference: 'IBG-1' })).rejects.toBeInstanceOf(ConflictException);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'APPROVED', payments }));
    const view = await service.getLease(tenant, 'LEASE-MYS-0000001');
    expect(view.payments[0].status).toBe('OVERDUE');
    expect(view.rent.overdue).toBe(25500);
  });
});
