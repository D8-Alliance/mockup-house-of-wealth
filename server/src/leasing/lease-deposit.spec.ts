import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { LeasingService } from './leasing.service';
import { depositRefund, depositRefundDueBy, endingReminder, rentReminder } from './leasing-rules';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: () => null }));

const at = (date: string) => new Date(`${date}T08:00:00Z`);

describe('lease reminders and deposit rules', () => {
  it('reminds three days before rent is due, on the day, then 1, 7, 14 and 30 days late', () => {
    const due = at('2027-01-01');
    expect(rentReminder(due, at('2026-12-27'))).toBeNull();
    expect(rentReminder(due, at('2026-12-29'))).toEqual({ stage: 'UPCOMING', days: 3 });
    expect(rentReminder(due, at('2027-01-01'))).toEqual({ stage: 'DUE_TODAY', days: 0 });
    expect(rentReminder(due, at('2027-01-02'))).toEqual({ stage: 'OVERDUE', days: 1 });
    // A missed day only delays the reminder: ten days late still sends the 7-day one.
    expect(rentReminder(due, at('2027-01-11'))).toEqual({ stage: 'OVERDUE', days: 7 });
    expect(rentReminder(due, at('2027-03-01'))).toEqual({ stage: 'OVERDUE', days: 30 });
  });

  it('reminds of a lease ending 60 and 30 days before', () => {
    const end = at('2027-12-31');
    expect(endingReminder(end, at('2027-10-01'))).toBeNull();
    expect(endingReminder(end, at('2027-11-01'))).toBe(60);
    expect(endingReminder(end, at('2027-12-15'))).toBe(30);
    expect(endingReminder(end, at('2028-01-02'))).toBeNull();
  });

  it('gives the owner 30 days after the lease ends, early or on time, to refund the deposit', () => {
    expect(depositRefundDueBy({ endDate: at('2027-12-31'), endedAt: null }).toISOString().slice(0, 10)).toBe('2028-01-30');
    expect(depositRefundDueBy({ endDate: at('2027-12-31'), endedAt: at('2027-06-15') }).toISOString().slice(0, 10)).toBe('2027-07-15');
  });

  it('refunds the deposit less reasoned deductions, never more than the deposit', () => {
    expect(depositRefund(51000, [{ reason: 'Unpaid rent for December 2027', amount: 25500 }, { reason: 'Broken glass door', amount: 1200 }])).toEqual({ amount: 24300, problem: null });
    expect(depositRefund(51000, [])).toEqual({ amount: 51000, problem: null });
    expect(depositRefund(51000, [{ reason: 'x', amount: 10 }]).problem).toMatch(/reason/);
    expect(depositRefund(51000, [{ reason: 'Major damage', amount: 60000 }]).problem).toMatch(/more than the deposit/);
  });
});

describe('LeasingService deposit and reminders', () => {
  const user = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@x`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
  const owner = user('Asset Owner', 'ORG-AHG', 'USR-AO');
  const tenant = user('Organization Admin', 'ORG-TENANT', 'USR-TN');
  const dec = (value: number) => new Prisma.Decimal(value);
  const unit = { id: 'UNIT-1', label: 'Tingkat 7', floorArea: dec(8500), floorAreaUnit: 'SQFT', permittedUse: 'Office', minTermMonths: 12, asset: { id: 'A1', name: 'Menara Hidayah', assetType: 'BUILDING', location: 'Kuantan', details: {}, status: 'VERIFIED', ownerUserId: 'USR-AO', organisationId: 'ORG-AHG', organisation: { name: 'Al Hidayah Group' } } };
  const lease = (overrides: Record<string, unknown> = {}) => ({
    id: 'LEASE-1', unitId: 'UNIT-1', assetId: 'A1', countryNodeId: 'CN-MYS', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', status: 'APPROVED', awaiting: 'NONE',
    monthlyRent: dec(25500), currency: 'MYR', depositAmount: dec(51000), startDate: at('2027-01-01'), endDate: at('2027-12-31'), intendedUse: 'Office', tenantActivity: 'Engineering',
    history: [], legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, endedAt: null,
    depositReceivedAt: null, depositReference: null, depositReturnedAt: null, depositRefund: null, createdBy: 'USR-TN', createdAt: new Date(), updatedAt: new Date(), unit, payments: [],
    ...overrides,
  });
  const prisma = {
    assetLease: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    leaseRentPayment: { findMany: jest.fn().mockResolvedValue([]) },
    organisation: { findMany: jest.fn().mockResolvedValue([{ id: 'ORG-TENANT', name: 'Teras Engineering' }]) },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'USR-TN', name: 'Hafiz Teras', email: 'hafiz@teras.my', profile: { phone: '+60123456789' } }, { id: 'USR-AO', name: 'Amran Zain', email: 'amran@ahg.my', profile: null }]) },
  };
  const audit = { recordActor: jest.fn() };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new LeasingService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.assetLease.findMany.mockResolvedValue([]);
    prisma.leaseRentPayment.findMany.mockResolvedValue([]);
  });

  it('lets only the owner record the deposit, once', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    await expect(service.recordDeposit(tenant, 'LEASE-1', { reference: 'IBG-DEP-1' })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.recordDeposit(owner, 'LEASE-1', { reference: 'IBG-DEP-1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('refunds only after the lease and only a received deposit', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ endDate: at('2099-12-31'), depositReceivedAt: at('2027-01-01') }));
    await expect(service.returnDeposit(owner, 'LEASE-1', { deductions: [], reference: 'IBG-REF-1' })).rejects.toThrow(/after the lease ends/);
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'ENDED' }));
    await expect(service.returnDeposit(owner, 'LEASE-1', { deductions: [], reference: 'IBG-REF-1' })).rejects.toThrow(/received first/);
  });

  it('records the refund with its deductions and tells the tenant what was kept and why', async () => {
    const ended = lease({ status: 'ENDED', endedAt: at('2027-06-15'), depositReceivedAt: at('2027-01-01') });
    prisma.assetLease.findFirst.mockResolvedValueOnce(ended).mockResolvedValueOnce(ended);
    prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.returnDeposit(owner, 'LEASE-1', { deductions: [{ reason: 'Broken glass door', amount: 1200 }], reference: 'IBG-REF-1' });
    expect(prisma.assetLease.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ depositRefund: { amount: 49800, reference: 'IBG-REF-1', deductions: [{ reason: 'Broken glass door', amount: 1200 }] } }) }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Deposit refunded', message: expect.stringContaining('Broken glass door') }));
  });

  it('refuses deductions larger than the deposit', async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'ENDED', depositReceivedAt: at('2027-01-01') }));
    await expect(service.returnDeposit(owner, 'LEASE-1', { deductions: [{ reason: 'Major damage', amount: 60000 }], reference: 'IBG-REF-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sends the overdue reminder to the tenant and the owner, each stage once', async () => {
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce([{ id: 'PAY-1', period: '2027-01', dueDate: at('2027-01-01'), amount: dec(25500), currency: 'MYR', status: 'DUE', lease: lease() }]);
    await service.remindDue(at('2027-01-09'));
    const sent = notifications.enqueue.mock.calls.map(([call]) => [call.recipientUserId, call.title, call.dedupeKey]);
    expect(sent).toEqual([
      ['USR-TN', 'Rent overdue', 'lease-rent:PAY-1:overdue-7:USR-TN'],
      ['USR-AO', 'Rent not received', 'lease-rent-owner:PAY-1:overdue-7:USR-AO'],
    ]);
  });

  it('reminds the owner to refund a deposit as its 30 days run out', async () => {
    prisma.assetLease.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([lease({ status: 'ENDED', endedAt: at('2027-06-15'), depositReceivedAt: at('2027-01-01') })]);
    await service.remindDue(at('2027-07-10'));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', title: 'Deposit refund due', message: expect.stringContaining('by 2027-07-15') }));
  });

  it("shows each side the other side's contact only once the lease is approved", async () => {
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    const forOwner = await service.getLease(owner, 'LEASE-1');
    expect(forOwner.counterparty).toEqual({ name: 'Hafiz Teras', email: 'hafiz@teras.my', phone: '+60123456789' });
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
    expect((await service.getLease(tenant, 'LEASE-1')).counterparty).toEqual({ name: 'Amran Zain', email: 'amran@ahg.my', phone: null });
    prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'PROPOSED' }));
    expect((await service.getLease(owner, 'LEASE-1')).counterparty).toBeNull();
  });
});
