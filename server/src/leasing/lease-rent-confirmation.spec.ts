import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { renderLeaseStatement, statementTotals } from './lease-statement';
import { LeasingService } from './leasing.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));
jest.mock('../kyc/kyc.service', () => ({ detectDocumentType: () => null }));

const actor = (role: AuthenticatedUser['role'], userId: string, organisationId = 'ORG-AHG'): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const owner = actor('Asset Owner', 'USR-AO');
const manager = actor('Asset Manager', 'USR-AM');
const accounts = actor('Asset Manager', 'USR-ACC');

const dec = (value: number) => new Prisma.Decimal(value);
const asset = { id: 'ASSET-MYS-TOWER001', name: 'Menara Hidayah', assetType: 'BUILDING', location: 'Kuantan', details: { state: 'Pahang' }, status: 'VERIFIED', ownerUserId: 'USR-AO', organisationId: 'ORG-AHG', organisation: { name: 'Al Hidayah Group' } };
const unit = { id: 'UNIT-MYS-FLOOR007', assetId: asset.id, label: 'Floor 7', floorArea: dec(8500), floorAreaUnit: 'SQFT', permittedUse: 'Office', minTermMonths: 12, asset };
const payments = [{ id: 'PAY-1', period: '2020-01', dueDate: new Date('2020-01-01'), amount: dec(25500), currency: 'MYR', status: 'DUE', paidAt: null, reference: null, recordedBy: null, confirmedAt: null }];
const recorded = { ...payments[0], leaseId: 'LEASE-MYS-0000001', status: 'RECORDED', paidAt: new Date('2020-01-03'), reference: 'IBG-1', recordedBy: 'USR-AO' };
const lease = (overrides: Record<string, unknown> = {}) => ({
  id: 'LEASE-MYS-0000001', unitId: unit.id, assetId: asset.id, countryNodeId: 'CN-MYS', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT',
  status: 'APPROVED', awaiting: 'NONE', monthlyRent: dec(25500), currency: 'MYR', depositAmount: dec(51000), utilityDepositAmount: dec(25500), renovationDepositAmount: dec(0), utilitiesPaidBy: 'TENANT_DIRECT', depositRefunds: null,
  startDate: new Date('2020-01-01T00:00:00Z'), endDate: new Date('2020-12-31T00:00:00Z'), intendedUse: 'Head office', tenantActivity: 'Engineering consultancy', history: [],
  legalApprovedBy: null, legalApprovedAt: null, shariahApprovedBy: null, shariahApprovedAt: null, endedAt: null, createdBy: 'USR-TN', createdAt: new Date(), updatedAt: new Date(),
  unit, payments, utilityCharges: [], ...overrides,
});

describe('two-person rent recording and the statement of account', () => {
  const duties = async ({ where }: { where: { duty: string } }) => (where.duty === 'ACCOUNTS' ? [{ userId: 'USR-ACC' }] : where.duty === 'SOA' ? [{ userId: 'USR-SOA' }] : []);
  const prisma = {
    assetLease: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    organisation: { findUnique: jest.fn().mockResolvedValue({ name: 'Teras Engineering Sdn Bhd' }), findMany: jest.fn().mockResolvedValue([{ id: 'ORG-TENANT', name: 'Teras Engineering Sdn Bhd' }]) },
    leaseRentPayment: { updateMany: jest.fn(), findUnique: jest.fn() },
    organisationDuty: { findMany: jest.fn(duties) },
    leaseStatement: { create: jest.fn().mockResolvedValue({}), upsert: jest.fn().mockResolvedValue({}) },
    contract: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ profile: { preferences: { language: 'en' } } }) },
  };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const service = new LeasingService(prisma as unknown as PrismaService, audit as unknown as AuditService, notifications as never);
  const sent = () => notifications.enqueue.mock.calls.map(([call]) => [call.recipientUserId, call.title]);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organisationDuty.findMany.mockImplementation(duties);
    // findLease, then getLease after the change.
    prisma.assetLease.findFirst.mockResolvedValue(lease());
  });

  it('needs the SOA duty to record, and waits for Accounts instead of telling the tenant', async () => {
    await expect(service.recordPayment(manager, 'LEASE-MYS-0000001', '2020-01', { reference: 'IBG-1' })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.leaseRentPayment.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.recordPayment(owner, 'LEASE-MYS-0000001', '2020-01', { reference: 'IBG-1' });
    expect(prisma.leaseRentPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RECORDED', recordedBy: 'USR-AO' }) }));
    expect(sent()).toEqual([['USR-AO', 'Rent to confirm (2020-01)'], ['USR-ACC', 'Rent to confirm (2020-01)']]);
  });

  it('records straight as paid when nobody holds the Accounts duty', async () => {
    prisma.organisationDuty.findMany.mockResolvedValue([]);
    prisma.leaseRentPayment.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.recordPayment(manager, 'LEASE-MYS-0000001', '2020-01', { reference: 'IBG-1' });
    expect(prisma.leaseRentPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PAID', confirmedBy: 'USR-AM' }) }));
    expect(sent()).toEqual([['USR-TN', 'Rent received (2020-01)']]);
  });

  it('lets Accounts confirm, never the person who recorded it, and only then tells the tenant', async () => {
    prisma.leaseRentPayment.findUnique.mockResolvedValue(recorded);
    await expect(service.confirmPayment(owner, 'LEASE-MYS-0000001', '2020-01')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.confirmPayment(manager, 'LEASE-MYS-0000001', '2020-01')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.leaseRentPayment.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.confirmPayment(accounts, 'LEASE-MYS-0000001', '2020-01');
    expect(prisma.leaseRentPayment.updateMany).toHaveBeenCalledWith({ where: { id: 'PAY-1', status: 'RECORDED' }, data: expect.objectContaining({ status: 'PAID', confirmedBy: 'USR-ACC' }) });
    expect(sent()).toEqual([['USR-TN', 'Rent received (2020-01)']]);
  });

  it('sends a payment Accounts cannot find back to due and tells the recorder why', async () => {
    prisma.leaseRentPayment.findUnique.mockResolvedValueOnce(recorded);
    prisma.leaseRentPayment.updateMany.mockResolvedValueOnce({ count: 1 });
    await service.rejectPayment(accounts, 'LEASE-MYS-0000001', '2020-01', 'Not in the bank statement');
    expect(prisma.leaseRentPayment.updateMany).toHaveBeenCalledWith({ where: { id: 'PAY-1', status: 'RECORDED' }, data: { status: 'DUE', paidAt: null, reference: null, recordedBy: null, recordedAt: null } });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AO', title: 'Rent not confirmed (2020-01)', message: expect.stringContaining('Not in the bank statement') }));
  });

  it('refuses to confirm a month with nothing recorded', async () => {
    prisma.leaseRentPayment.findUnique.mockResolvedValueOnce(payments[0]);
    await expect(service.confirmPayment(accounts, 'LEASE-MYS-0000001', '2020-01')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts only what is billed by the statement date; a payment being confirmed is not outstanding', () => {
    const lines = [
      { kind: 'RENT' as const, period: '2027-01', dueDate: '2027-01-01', amount: 25500, status: 'PAID', paidAt: '2027-01-02', reference: 'IBG-1' },
      { kind: 'RENT' as const, period: '2027-02', dueDate: '2027-02-01', amount: 25500, status: 'RECORDED', paidAt: '2027-02-03', reference: 'IBG-2' },
      { kind: 'RENT' as const, period: '2027-03', dueDate: '2027-03-01', amount: 25500, status: 'OVERDUE', paidAt: null, reference: null },
      { kind: 'WATER' as const, period: '2027-03', dueDate: '2027-03-20', amount: 88.4, status: 'DUE', paidAt: null, reference: 'SAJ-1' },
      { kind: 'RENT' as const, period: '2027-04', dueDate: '2027-04-01', amount: 25500, status: 'DUE', paidAt: null, reference: null },
    ];
    expect(statementTotals(lines, '2027-03-20')).toEqual(expect.objectContaining({ billedTotal: 76588.4, paid: 25500, beingConfirmed: 25500, outstanding: 25588.4, overdue: 25500 }));
  });

  it('renders the statement in Malay and English', async () => {
    const result = await service.statement(owner, 'LEASE-MYS-0000001', 'ms', new Date('2020-02-01T03:00:00Z'));
    expect(result.filename).toBe('LEASE-MYS-0000001-statement-2020-02.pdf');
    expect(result.buffer.subarray(0, 5).toString()).toBe('%PDF-');
    const english = await renderLeaseStatement({ language: 'en', leaseId: 'L', issuedOn: '2020-02-01', month: '2020-02', ownerName: 'O', tenantName: 'T', unit: 'U', asset: 'A', leaseStart: '2020-01-01', leaseEnd: '2020-12-31', currency: 'MYR', lines: [] });
    expect(english.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('lets only the Asset Owner or the SOA team send the statement', async () => {
    await expect(service.sendStatement(manager, 'LEASE-MYS-0000001')).rejects.toBeInstanceOf(ForbiddenException);
    const result = await service.sendStatement(owner, 'LEASE-MYS-0000001');
    expect(result.outstanding).toBe(25500);
    expect(prisma.leaseStatement.upsert).toHaveBeenCalled();
  });

  it('sends each running lease its statement once a month and tells the tenant the balance', async () => {
    prisma.assetLease.findMany.mockResolvedValueOnce([lease()]);
    expect(await service.sendMonthlyStatements(new Date('2020-02-01T03:00:00Z'))).toBe(1);
    expect(prisma.assetLease.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ statements: { none: { month: '2020-02' } } }) }));
    expect(prisma.leaseStatement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ leaseId: 'LEASE-MYS-0000001', month: '2020-02', outstanding: 25500, sentBy: 'SYSTEM' }) });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Statement of account 2020-02', dedupeKey: 'lease-statement:LEASE-MYS-0000001:2020-02', message: expect.stringContaining('MYR 25,500.00'), attachment: { filename: 'LEASE-MYS-0000001-statement-2020-02.pdf', content: expect.any(Buffer) } }));
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'USR-TN' }, select: { profile: true } });
  });
});
