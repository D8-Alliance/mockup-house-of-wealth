import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { LeasingService } from './leasing.service';
import { depositCarryOver, heldDeposits, utilityChargeDueDate, utilityDepositMonthsFor } from './leasing-rules';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: () => null }));

const at = (date: string) => new Date(`${date}T00:00:00Z`);
const dec = (value: number) => new Prisma.Decimal(value);
const all = (SECURITY: number, UTILITY: number, RENOVATION: number) => ({ SECURITY, UTILITY, RENOVATION });

describe('deposit carry-over and utility rules', () => {
  it('passes each deposit up to what the renewal needs, and leaves the rest refundable', () => {
    expect(depositCarryOver(all(51000, 25500, 10000), all(51000, 25500, 10000))).toEqual(all(51000, 25500, 10000));
    expect(depositCarryOver(all(51000, 25500, 0), all(60000, 20000, 0))).toEqual(all(51000, 20000, 0));
  });

  it('holds nothing of a deposit refunded, and only the remainder of one carried over', () => {
    const refund = { kind: 'RENOVATION' as const, amount: 9200, reference: 'R', paidAt: '2027-02-01', deductions: [] };
    expect(heldDeposits(all(51000, 25500, 10000), [refund], { leaseId: 'NEW', at: '', amounts: all(51000, 20000, 0) })).toEqual(all(0, 5500, 0));
  });

  it('starts a unit from its state, whatever the spelling, or from one month', () => {
    const rules = [{ state: 'Pulau Pinang', months: 2 }, { state: 'Sabah', months: 0.5 }];
    expect(utilityDepositMonthsFor('pulau  pinang ', rules)).toBe(2);
    expect(utilityDepositMonthsFor('Sabah', rules)).toBe(0.5);
    expect(utilityDepositMonthsFor('Johor', rules)).toBe(1);
    expect(utilityDepositMonthsFor(undefined, rules)).toBe(1);
  });

  it('gives the tenant 14 days to pay a bill', () => {
    expect(utilityChargeDueDate(new Date('2027-03-01T10:00:00Z')).toISOString().slice(0, 10)).toBe('2027-03-15');
  });
});

describe('LeasingService renewals and utilities', () => {
  const user = (role: AuthenticatedUser['role'], organisationId: string, userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@x`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
  const owner = user('Asset Owner', 'ORG-AHG', 'USR-AO');
  const tenant = user('Organization Admin', 'ORG-TENANT', 'USR-TN');
  const legal = user('Legal Officer', 'ORG-PUBLIC', 'USR-LEGAL');
  const asset = { id: 'A1', name: 'Menara Hidayah', assetType: 'BUILDING', location: 'Kuantan', details: { state: 'Pahang' }, status: 'VERIFIED', ownerUserId: 'USR-AO', organisationId: 'ORG-AHG', organisation: { name: 'Al Hidayah' } };
  const unit = { id: 'UNIT-1', label: 'Tingkat 7', floorArea: dec(8500), floorAreaUnit: 'SQFT', permittedUse: 'Office', minTermMonths: 12, asset };
  const nextYear = new Date().getUTCFullYear() + 1;
  const lease = (overrides: Record<string, unknown> = {}) => ({
    id: 'LEASE-OLD', unitId: 'UNIT-1', assetId: 'A1', countryNodeId: 'CN-MYS', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', status: 'APPROVED', awaiting: 'NONE',
    monthlyRent: dec(25500), currency: 'MYR', depositAmount: dec(51000), utilityDepositAmount: dec(25500), renovationDepositAmount: dec(10000), utilitiesPaidBy: 'TENANT_DIRECT',
    startDate: at(`${nextYear}-01-01`), endDate: at(`${nextYear}-12-31`), intendedUse: 'Office', tenantActivity: 'Engineering', history: [],
    legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, endedAt: null, renewsLeaseId: null,
    depositReceivedAt: null, depositReference: null, depositReturnedAt: null, depositRefunds: null, depositCarriedIn: null, depositCarriedOut: null,
    createdBy: 'USR-TN', createdAt: at('2026-01-01'), updatedAt: at('2026-01-02'), unit, payments: [], utilityCharges: [],
    ...overrides,
  });
  const tx = { assetLease: { updateMany: jest.fn(), update: jest.fn() } };
  const prisma = {
    assetLease: { findFirst: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), updateMany: jest.fn() },
    leaseRentPayment: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    leaseUtilityCharge: { create: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    utilityDepositRule: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn(), deleteMany: jest.fn() },
    organisation: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 'ORG-TENANT', name: 'Teras' }]) },
    userRoleAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (run: (client: typeof tx) => unknown) => run(tx)),
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new LeasingService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.assetLease.findMany.mockResolvedValue([]);
    prisma.leaseUtilityCharge.findMany.mockResolvedValue([]);
    prisma.utilityDepositRule.findMany.mockResolvedValue([]);
    tx.assetLease.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('the owner offers to renew', () => {
    const offered = lease({ id: 'LEASE-NEW', status: 'PROPOSED', awaiting: 'TENANT', renewsLeaseId: 'LEASE-OLD', history: [{ action: 'RENEWAL_OFFERED', party: 'OWNER', statement: 'Offered to renew LEASE-OLD.' }] });

    it('opens a request for the tenant to answer, addressed to the tenant contact', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease()).mockResolvedValueOnce(null).mockResolvedValueOnce(offered);
      prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
      prisma.assetLease.create.mockImplementationOnce(async ({ data }) => lease(data));
      await service.offerRenewal(owner, 'LEASE-OLD', { termMonths: 12, monthlyRent: 27000 });
      expect(prisma.assetLease.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PROPOSED', awaiting: 'TENANT', renewsLeaseId: 'LEASE-OLD', monthlyRent: 27000, createdBy: 'USR-TN', startDate: at(`${nextYear + 1}-01-01`) }) }));
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'The owner offers to renew' }));
    });

    it('is for the owner, once at a time, and for a tenant still verified', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
      await expect(service.offerRenewal(tenant, 'LEASE-OLD', { termMonths: 12 })).rejects.toBeInstanceOf(ForbiddenException);
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
      prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'SUSPENDED' });
      await expect(service.offerRenewal(owner, 'LEASE-OLD', { termMonths: 12 })).rejects.toThrow(/KYB/);
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
      prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
      prisma.assetLease.findMany.mockResolvedValueOnce([{ id: 'LEASE-NEW', status: 'PROPOSED', renewsLeaseId: 'LEASE-OLD' }]);
      await expect(service.offerRenewal(owner, 'LEASE-OLD', { termMonths: 12 })).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not ask again for a renovation deposit already refunded', async () => {
      const refunds = [{ kind: 'RENOVATION', amount: 10000, reference: 'R', paidAt: '2027-02-01', deductions: [] }];
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ depositRefunds: refunds })).mockResolvedValueOnce(null).mockResolvedValueOnce(offered);
      prisma.organisation.findUnique.mockResolvedValueOnce({ kybStatus: 'APPROVED' });
      prisma.assetLease.create.mockImplementationOnce(async ({ data }) => lease(data));
      await service.offerRenewal(owner, 'LEASE-OLD', { termMonths: 12 });
      expect(prisma.assetLease.create.mock.calls[0][0].data.renovationDepositAmount).toBe(0);
    });

    it('needs the tenant to declare Shariah compliance to accept or counter, not to decline', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(offered);
      await expect(service.respond(tenant, 'LEASE-NEW', { action: 'ACCEPT', confirmed: true })).rejects.toBeInstanceOf(BadRequestException);
      prisma.assetLease.findFirst.mockResolvedValueOnce(offered);
      await expect(service.respond(tenant, 'LEASE-NEW', { action: 'COUNTER', monthlyRent: 24000 })).rejects.toThrow(/Shariah-compliant/);

      prisma.assetLease.findFirst.mockResolvedValueOnce(offered).mockResolvedValueOnce(null).mockResolvedValueOnce(offered);
      prisma.assetLease.findUniqueOrThrow.mockResolvedValueOnce(offered);
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.respond(tenant, 'LEASE-NEW', { action: 'ACCEPT', confirmed: true, shariahDeclaration: true });
      const history = prisma.assetLease.updateMany.mock.calls[0][0].data.history;
      expect(history[history.length - 1].statement).toContain('Shariah-compliant');

      prisma.assetLease.findFirst.mockResolvedValueOnce(offered).mockResolvedValueOnce(offered);
      prisma.assetLease.findUniqueOrThrow.mockResolvedValueOnce(offered);
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      await expect(service.respond(tenant, 'LEASE-NEW', { action: 'DECLINE' })).resolves.toBeDefined();
    });

    it('tells the screens when the declaration is still owed', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(offered);
      expect((await service.getLease(tenant, 'LEASE-NEW')).needsShariahDeclaration).toBe(true);
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ ...offered, history: [...offered.history, { action: 'COUNTERED', party: 'TENANT', statement: 'Declared that its business and its use of the space are Shariah-compliant.' }] }));
      expect((await service.getLease(tenant, 'LEASE-NEW')).needsShariahDeclaration).toBe(false);
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ status: 'APPROVED' }));
      expect((await service.getLease(owner, 'LEASE-OLD')).canOfferRenewal).toBe(true);
    });
  });

  describe('deposits carry over when a renewal is approved', () => {
    const shariahDone = { status: 'ACCEPTED', awaiting: 'REVIEW', shariahApprovedBy: 'USR-S', shariahApprovedAt: at('2026-01-01') };
    const held = lease({ depositReceivedAt: at('2026-02-01'), depositReference: 'IBG-1' });
    const review = (renewal: ReturnType<typeof lease>, approved: ReturnType<typeof lease>) => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(renewal).mockResolvedValueOnce(null).mockResolvedValueOnce(approved);
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.assetLease.findUniqueOrThrow.mockResolvedValueOnce(approved);
      return service.review(legal, renewal.id, { decision: 'APPROVE', note: 'Terms are in order.' });
    };

    it('moves all of it when the renewal needs the same, closing the earlier lease and telling both sides', async () => {
      const renewal = lease({ id: 'LEASE-NEW', renewsLeaseId: 'LEASE-OLD', ...shariahDone });
      prisma.assetLease.findUnique.mockResolvedValueOnce(held);
      await review(renewal, lease({ ...renewal, status: 'APPROVED', awaiting: 'NONE' }));
      const out = tx.assetLease.updateMany.mock.calls[0][0];
      expect(out.where).toEqual({ id: 'LEASE-OLD', updatedAt: held.updatedAt });
      expect(out.data.depositCarriedOut).toEqual(expect.objectContaining({ leaseId: 'LEASE-NEW', amounts: all(51000, 25500, 10000) }));
      expect(out.data.depositReturnedAt).toBeInstanceOf(Date);
      expect(tx.assetLease.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'LEASE-NEW' }, data: expect.objectContaining({ depositCarriedIn: expect.objectContaining({ leaseId: 'LEASE-OLD' }), depositReference: 'Carried over from LEASE-OLD', depositReceivedAt: expect.any(Date) }) }));
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', title: 'Deposit carried over', message: expect.stringContaining('Nothing more is to be paid.') }));
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Deposit carried over' }));
      expect(audit.recordActor).toHaveBeenCalledWith(legal, expect.objectContaining({ action: 'asset_lease.deposit_carried_over' }));
    });

    it('leaves a top-up to collect when the renewal needs more, and the excess refundable when it needs less', async () => {
      const renewal = lease({ id: 'LEASE-NEW', renewsLeaseId: 'LEASE-OLD', depositAmount: dec(60000), utilityDepositAmount: dec(20000), renovationDepositAmount: dec(0), ...shariahDone });
      prisma.assetLease.findUnique.mockResolvedValueOnce(held);
      await review(renewal, lease({ ...renewal, status: 'APPROVED', awaiting: 'NONE' }));
      const out = tx.assetLease.updateMany.mock.calls[0][0].data;
      expect(out.depositCarriedOut.amounts).toEqual(all(51000, 20000, 0));
      expect(out.depositReturnedAt).toBeUndefined();
      const into = tx.assetLease.update.mock.calls[0][0].data;
      expect(into.depositReceivedAt).toBeUndefined();
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('MYR 9,000.00 is still to be paid') }));

      const carried = { leaseId: 'LEASE-NEW', at: '2026-03-01', amounts: all(51000, 20000, 0) };
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ ...renewal, status: 'APPROVED', depositCarriedIn: { ...carried, leaseId: 'LEASE-OLD' } }));
      expect((await service.getLease(owner, 'LEASE-NEW')).deposit.toCollect).toBe(9000);
      const earlier = lease({ status: 'ENDED', depositReceivedAt: at('2026-02-01'), depositCarriedOut: carried });
      prisma.assetLease.findFirst.mockResolvedValueOnce(earlier);
      expect((await service.getLease(owner, 'LEASE-OLD')).deposit.refundable).toEqual(['UTILITY', 'RENOVATION']);
      prisma.assetLease.findFirst.mockResolvedValueOnce(earlier);
      await expect(service.returnDeposit(owner, 'LEASE-OLD', { kind: 'SECURITY', deductions: [], reference: 'IBG-9' })).rejects.toThrow(/no such deposit/);
      prisma.assetLease.findFirst.mockResolvedValueOnce(earlier).mockResolvedValueOnce(earlier);
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.returnDeposit(owner, 'LEASE-OLD', { kind: 'UTILITY', deductions: [], reference: 'IBG-9' });
      expect(prisma.assetLease.updateMany.mock.calls.at(-1)?.[0].data.depositRefunds[0]).toEqual(expect.objectContaining({ kind: 'UTILITY', amount: 5500 }));
    });

    it('carries nothing when the earlier deposit was not received, and catches up once it is recorded', async () => {
      const renewal = lease({ id: 'LEASE-NEW', renewsLeaseId: 'LEASE-OLD', ...shariahDone });
      prisma.assetLease.findUnique.mockResolvedValueOnce(lease());
      await review(renewal, lease({ ...renewal, status: 'APPROVED', awaiting: 'NONE' }));
      expect(prisma.$transaction).not.toHaveBeenCalled();

      prisma.assetLease.findFirst.mockResolvedValueOnce(lease()).mockResolvedValueOnce(lease({ ...renewal, status: 'APPROVED', awaiting: 'NONE' })).mockResolvedValueOnce(lease());
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.assetLease.findUnique.mockResolvedValueOnce(held);
      await service.recordDeposit(owner, 'LEASE-OLD', { reference: 'IBG-1' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('leaves a deposit the owner already recorded for the renewal, and does not carry twice', async () => {
      const renewal = lease({ id: 'LEASE-NEW', renewsLeaseId: 'LEASE-OLD', ...shariahDone, depositReceivedAt: at('2026-03-01') });
      await review(renewal, lease({ ...renewal, status: 'APPROVED', awaiting: 'NONE' }));
      expect(prisma.assetLease.findUnique).not.toHaveBeenCalled();
    });

    it('asks only for what is left when the top-up is recorded', async () => {
      const row = lease({ id: 'LEASE-NEW', depositCarriedIn: { leaseId: 'LEASE-OLD', at: '', amounts: all(51000, 25000, 0) } });
      prisma.assetLease.findFirst.mockResolvedValueOnce(row).mockResolvedValueOnce(null).mockResolvedValueOnce(row);
      prisma.assetLease.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.recordDeposit(owner, 'LEASE-NEW', { reference: 'IBG-2' });
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ title: 'Deposit received', message: expect.stringContaining('MYR 10,500.00') }));
    });
  });

  describe('utility bills', () => {
    const recharged = lease({ utilitiesPaidBy: 'OWNER_RECHARGE' });
    const bill = { period: '2027-03', kind: 'ELECTRICITY' as const, amount: 1450.6, billReference: 'TNB-220113' };

    it('bills the tenant at cost, due in 14 days unless the owner says otherwise', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(recharged).mockResolvedValueOnce(recharged);
      prisma.leaseUtilityCharge.create.mockResolvedValueOnce({ id: 'C1' });
      await service.addUtilityCharge(owner, 'LEASE-OLD', { ...bill, dueDate: '2027-04-10' });
      expect(prisma.leaseUtilityCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ leaseId: 'LEASE-OLD', period: '2027-03', kind: 'ELECTRICITY', amount: 1450.6, currency: 'MYR', dueDate: at('2027-04-10'), createdBy: 'USR-AO' }) });
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Utility bill to pay', message: expect.stringContaining('the electricity bill for 2027-03 is MYR 1,450.60 (bill TNB-220113)') }));
    });

    it('is only for a lease where the owner pays the bills, and only the owner records them', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease());
      await expect(service.addUtilityCharge(owner, 'LEASE-OLD', bill)).rejects.toThrow(/tenant pays the bills directly/);
      prisma.assetLease.findFirst.mockResolvedValueOnce(recharged);
      await expect(service.addUtilityCharge(tenant, 'LEASE-OLD', bill)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('refuses the same bill twice', async () => {
      prisma.assetLease.findFirst.mockResolvedValueOnce(recharged);
      prisma.leaseUtilityCharge.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }));
      await expect(service.addUtilityCharge(owner, 'LEASE-OLD', bill)).rejects.toThrow(/already recorded/);
    });

    it('records a bill as paid once, and removes only one still due, keeping it in the audit log', async () => {
      const charge = { id: 'C1', period: '2027-03', kind: 'WATER', amount: dec(88), currency: 'MYR', billReference: 'SAJ-1', dueDate: at('2099-01-01'), status: 'DUE', paidAt: null, reference: null };
      const row = lease({ utilitiesPaidBy: 'OWNER_RECHARGE', utilityCharges: [charge] });
      prisma.assetLease.findFirst.mockResolvedValueOnce(row).mockResolvedValueOnce(row);
      prisma.leaseUtilityCharge.updateMany.mockResolvedValueOnce({ count: 1 });
      await service.recordUtilityPayment(owner, 'LEASE-OLD', 'C1', { reference: 'IBG-77' });
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ title: 'Utility bill received', message: expect.stringContaining('the water bill for 2027-03 as received (reference IBG-77)') }));

      prisma.assetLease.findFirst.mockResolvedValueOnce(row);
      prisma.leaseUtilityCharge.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.recordUtilityPayment(owner, 'LEASE-OLD', 'C1', { reference: 'IBG-77' })).rejects.toBeInstanceOf(ConflictException);

      prisma.assetLease.findFirst.mockResolvedValueOnce(row);
      prisma.leaseUtilityCharge.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.removeUtilityCharge(owner, 'LEASE-OLD', 'C1', { note: 'Wrong month' })).rejects.toThrow(/still due/);

      prisma.assetLease.findFirst.mockResolvedValueOnce(row).mockResolvedValueOnce(row);
      prisma.leaseUtilityCharge.deleteMany.mockResolvedValueOnce({ count: 1 });
      await service.removeUtilityCharge(owner, 'LEASE-OLD', 'C1', { note: 'Wrong month' });
      expect(audit.recordActor).toHaveBeenCalledWith(owner, expect.objectContaining({ action: 'asset_lease.utility_removed', metadata: expect.objectContaining({ amount: 88, billReference: 'SAJ-1', reason: 'Wrong month' }) }));
    });

    it('shows a past-due bill as overdue with the total unpaid, and reminds the tenant once', async () => {
      const charge = { id: 'C1', period: '2020-03', kind: 'WATER', amount: dec(88), currency: 'MYR', billReference: 'SAJ-1', dueDate: at('2020-04-01'), status: 'DUE', paidAt: null, reference: null };
      prisma.assetLease.findFirst.mockResolvedValueOnce(lease({ utilityCharges: [charge], utilitiesPaidBy: 'OWNER_RECHARGE' }));
      const view = await service.getLease(tenant, 'LEASE-OLD');
      expect(view.utilities[0].status).toBe('OVERDUE');
      expect(view.utilitiesUnpaid).toBe(88);
      expect(view.canChargeUtilities).toBe(false);

      prisma.leaseUtilityCharge.findMany.mockResolvedValueOnce([{ ...charge, lease: lease() }]);
      await service.remindDue(new Date('2020-04-05T00:00:00Z'));
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Utility bill overdue', dedupeKey: 'lease-utility:C1:overdue:USR-TN' }));
    });
  });

  describe('utility deposit by state', () => {
    const admin = user('Country Admin', 'ORG-ADMIN', 'USR-CA');

    it('offers each asset the months of its state', async () => {
      const prismaAssets = { ...prisma, leasableUnit: { findMany: jest.fn().mockResolvedValue([]) }, asset: { findMany: jest.fn().mockResolvedValue([{ id: 'A1', name: 'Menara', assetType: 'BUILDING', details: { state: 'Sabah' } }, { id: 'A2', name: 'Plaza', assetType: 'BUILDING', details: null }]) } };
      prisma.utilityDepositRule.findMany.mockResolvedValueOnce([{ state: 'Sabah', months: dec(0.5) }]);
      const own = new LeasingService(prismaAssets as unknown as PrismaService, audit as unknown as AuditService, notifications as never);
      const { assets } = await own.myUnits(owner);
      expect(assets).toEqual([expect.objectContaining({ id: 'A1', state: 'Sabah', utilityDepositMonths: 0.5 }), expect.objectContaining({ id: 'A2', state: null, utilityDepositMonths: 1 })]);
    });

    it('updates a state however it is typed, instead of adding a second row, and records it', async () => {
      prisma.utilityDepositRule.findMany.mockResolvedValue([{ state: 'Pulau Pinang', months: dec(1) }]);
      await service.setUtilityDepositRule(admin, { state: 'pulau pinang', months: 2 });
      expect(prisma.utilityDepositRule.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { countryNodeId_state: { countryNodeId: 'CN-MYS', state: 'Pulau Pinang' } }, update: { months: 2, updatedBy: 'USR-CA' } }));
      expect(audit.recordActor).toHaveBeenCalledWith(admin, expect.objectContaining({ action: 'utility_deposit_rule.set', metadata: expect.objectContaining({ before: 1, months: 2 }) }));
    });

    it('removes a rule of the admin\'s own country only', async () => {
      prisma.utilityDepositRule.deleteMany.mockResolvedValueOnce({ count: 1 });
      await service.removeUtilityDepositRule(admin, 'Sabah');
      expect(prisma.utilityDepositRule.deleteMany).toHaveBeenCalledWith({ where: { countryNodeId: 'CN-MYS', state: 'Sabah' } });
      prisma.utilityDepositRule.deleteMany.mockResolvedValueOnce({ count: 0 });
      await expect(service.removeUtilityDepositRule(admin, 'Sabah')).rejects.toThrow(/No rule/);
    });
  });
});
