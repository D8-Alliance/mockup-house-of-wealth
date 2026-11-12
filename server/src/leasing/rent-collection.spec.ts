import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { renderReminderLetter } from './rent-collection-letter';
import { actionDueAfter, nextReminder, shouldOpenCase, timingsFrom } from './rent-collection-rules';
import { RentCollectionService } from './rent-collection.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const actor = (role: AuthenticatedUser['role'], userId: string, organisationId = 'ORG-AHG'): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId: 'CN-MYS', organisationId, assignedRoles: [role] });
const owner = actor('Asset Owner', 'USR-AO');
const collector = actor('Asset Manager', 'USR-AZIMAH');
const clerk = actor('Asset Manager', 'USR-CLERK');
const d = (value: string) => new Date(`${value}T00:00:00Z`);

describe('rent collection rules', () => {
  it('opens a case 7 days after the due date, not before', () => {
    expect(shouldOpenCase(d('2026-11-01'), d('2026-11-07'))).toBe(false);
    expect(shouldOpenCase(d('2026-11-01'), d('2026-11-08'))).toBe(true);
  });

  it('allows 7 days for reminder 1, 14 for reminder 2, 7 for reminder 3, then 7 before Legal', () => {
    expect(actionDueAfter('OPEN', d('2026-11-08'))).toEqual(d('2026-11-15'));
    expect(actionDueAfter('REMINDER_1', d('2026-11-10'))).toEqual(d('2026-11-24'));
    expect(actionDueAfter('REMINDER_2', d('2026-11-24'))).toEqual(d('2026-12-01'));
    expect(actionDueAfter('REMINDER_3', d('2026-12-01'))).toEqual(d('2026-12-08'));
    expect([nextReminder('OPEN'), nextReminder('REMINDER_2'), nextReminder('REMINDER_3'), nextReminder('LEGAL')]).toEqual(['REMINDER_1', 'REMINDER_3', null, null]);
  });

  it("uses an owner's own timings, and the default for any missing or out of range", () => {
    const timings = timingsFrom({ graceDays: 3, reminder1Days: 10, reminder2Days: 0, reminder3Days: 120, legalDays: null });
    expect(timings).toEqual({ graceDays: 3, reminder1Days: 10, reminder2Days: 14, reminder3Days: 7, legalDays: 7 });
    expect(shouldOpenCase(d('2026-11-01'), d('2026-11-04'), timings)).toBe(true);
    expect(actionDueAfter('OPEN', d('2026-11-04'), timings)).toEqual(d('2026-11-14'));
  });

  it('writes the reminder letter as a PDF in Malay and English', async () => {
    const letter = { number: 3 as const, caseId: 'COLL-MYS-1', issuedOn: '2026-12-01', payBy: '2026-12-08', ownerName: 'Al Hidayah Group', tenantName: 'Teras Engineering', unit: 'Tingkat 7', asset: 'Menara Hidayah', leaseId: 'LEASE-MYS-1', leaseStart: '2026-08-01', period: '2026-11', dueDate: '2026-11-01', amount: 'RM 25,500.00', totalOverdue: 'RM 25,500.00' };
    for (const language of ['ms', 'en'] as const) expect((await renderReminderLetter({ ...letter, language })).subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('RentCollectionService', () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'COLL-MYS-1', leaseId: 'LEASE-MYS-1', paymentId: 'PAY-1', itemKind: 'RENT', period: '2026-11', ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', countryNodeId: 'CN-MYS',
    amount: new Prisma.Decimal(25500), currency: 'MYR', stage: 'OPEN', assignedUserId: null, actionDueAt: d('2026-11-15'), history: [], followUps: [], closedAt: null, closedReason: null,
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  });
  const lease = { id: 'LEASE-MYS-1', startDate: d('2026-08-01'), createdBy: 'USR-TN', unit: { label: 'Tingkat 7', asset: { name: 'Menara Hidayah', ownerUserId: 'USR-AO' } } };
  let prisma: Record<string, Record<string, jest.Mock>>;
  let notifications: { enqueue: jest.Mock };
  let service: RentCollectionService;

  beforeEach(() => {
    prisma = {
      rentCollectionCase: { findFirst: jest.fn(async () => row()), findMany: jest.fn(async () => []), findUniqueOrThrow: jest.fn(async () => row()), updateMany: jest.fn(async () => ({ count: 1 })), create: jest.fn(async ({ data }) => ({ ...row(), ...data })) },
      organisationDuty: { findMany: jest.fn(async ({ where }) => (where.duty === 'COLLECTION' ? [{ userId: 'USR-AZIMAH' }] : where.duty === 'LEGAL' ? [{ userId: 'USR-LEGAL' }] : [])) },
      assetLease: { findUniqueOrThrow: jest.fn(async () => lease), findMany: jest.fn(async () => [lease]) },
      leaseRentPayment: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => ({ dueDate: d('2026-11-01') })) },
      leaseUtilityCharge: { findMany: jest.fn(async () => []), findUnique: jest.fn(async () => null) },
      organisation: { findMany: jest.fn(async () => [{ id: 'ORG-TENANT', name: 'Teras Engineering' }]) },
      userRoleAssignment: { findMany: jest.fn(async () => []) },
      user: { findMany: jest.fn(async () => []) },
      rentCollectionSettings: { findUnique: jest.fn(async () => null), findMany: jest.fn(async () => []), upsert: jest.fn(async () => ({})) },
    };
    notifications = { enqueue: jest.fn(async () => undefined) };
    service = new RentCollectionService(prisma as unknown as PrismaService, { recordActor: jest.fn(async () => undefined) } as unknown as AuditService, notifications as never);
  });

  it('opens a case for a month unpaid 7 days after it was due and tells the collection team', async () => {
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce([{ id: 'PAY-1', leaseId: 'LEASE-MYS-1', period: '2026-11', dueDate: d('2026-11-01'), amount: new Prisma.Decimal(25500), currency: 'MYR', lease: { ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', countryNodeId: 'CN-MYS', unit: lease.unit } }]);
    await service.sweep(d('2026-11-08'));
    expect(prisma.rentCollectionCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentId: 'PAY-1', stage: 'OPEN', actionDueAt: d('2026-11-15') }) });
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AZIMAH', title: 'New collection case' }));
  });

  it('sends the next reminder to the tenant, for the collection team only', async () => {
    await expect(service.remind(clerk, 'COLL-MYS-1')).rejects.toBeInstanceOf(ForbiddenException);
    await service.remind(collector, 'COLL-MYS-1');
    expect(prisma.rentCollectionCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stage: 'REMINDER_1' }) }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Rent reminder 1' }));
  });

  it('hands a case to Legal only after the third reminder, and tells the legal team', async () => {
    await expect(service.escalate(owner, 'COLL-MYS-1', 'No answer')).rejects.toBeInstanceOf(BadRequestException);
    prisma.rentCollectionCase.findFirst.mockResolvedValueOnce(row({ stage: 'REMINDER_3' }));
    await service.escalate(owner, 'COLL-MYS-1', 'No answer after three reminders');
    expect(prisma.rentCollectionCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stage: 'LEGAL' }) }));
    expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-LEGAL', title: 'Rent arrears passed to Legal' }));
  });

  it('closes a case as paid once the month is recorded as received', async () => {
    prisma.rentCollectionCase.findMany.mockResolvedValueOnce([{ id: 'COLL-MYS-1', paymentId: 'PAY-1', itemKind: 'RENT', history: [], updatedAt: new Date() }]);
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce([{ id: 'PAY-1', paidAt: d('2026-11-20'), reference: 'IBG 123' }]);
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce([]);
    await service.sweep(d('2026-11-21'));
    expect(prisma.rentCollectionCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'COLL-MYS-1' }), data: expect.objectContaining({ stage: 'PAID' }) }));
  });

  it("opens cases on the owner's own grace days and gives reminder 1 the owner's days", async () => {
    const unpaid = [{ id: 'PAY-1', leaseId: 'LEASE-MYS-1', period: '2026-11', dueDate: d('2026-11-01'), amount: new Prisma.Decimal(25500), currency: 'MYR', lease: { ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', countryNodeId: 'CN-MYS', unit: lease.unit } }];
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce(unpaid);
    await service.sweep(d('2026-11-04'));
    expect(prisma.rentCollectionCase.create).not.toHaveBeenCalled();
    prisma.leaseRentPayment.findMany.mockResolvedValueOnce(unpaid);
    prisma.rentCollectionSettings.findMany.mockResolvedValueOnce([{ organisationId: 'ORG-AHG', graceDays: 3, reminder1Days: 10, reminder2Days: 14, reminder3Days: 7, legalDays: 7 }]);
    await service.sweep(d('2026-11-04'));
    expect(prisma.rentCollectionCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentId: 'PAY-1', actionDueAt: d('2026-11-14') }) });
  });

  it("keeps the pay-by date of each reminder, from the owner's timings when it was sent", async () => {
    prisma.rentCollectionSettings.findUnique.mockResolvedValue({ organisationId: 'ORG-AHG', graceDays: 7, reminder1Days: 7, reminder2Days: 21, reminder3Days: 7, legalDays: 7 });
    await service.remind(collector, 'COLL-MYS-1');
    const sent = prisma.rentCollectionCase.updateMany.mock.calls[0][0].data.history.at(-1);
    expect(sent).toEqual(expect.objectContaining({ action: 'REMINDER_SENT', stage: 'REMINDER_1' }));
    expect(Date.parse(`${sent.payBy}T00:00:00Z`) - Date.parse(`${sent.at.slice(0, 10)}T00:00:00Z`)).toBe(21 * 24 * 60 * 60 * 1000);
  });

  it('lets only the Asset Owner change the timings, in whole days from 1 to 90', async () => {
    const timings = { graceDays: 5, reminder1Days: 7, reminder2Days: 14, reminder3Days: 7, legalDays: 10 };
    await expect(service.setTimings(collector, timings)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.setTimings(owner, { ...timings, legalDays: 0 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setTimings(owner, { ...timings, graceDays: 2.5 })).rejects.toBeInstanceOf(BadRequestException);
    await service.setTimings(owner, timings);
    expect(prisma.rentCollectionSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { organisationId: 'ORG-AHG' }, create: expect.objectContaining({ ...timings, updatedBy: 'USR-AO' }) }));
  });

  it('keeps the case to the owner team: the tenant cannot open it', async () => {
    await expect(service.list(actor('Organization Admin', 'USR-TN', 'ORG-TENANT'))).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('utility bills the owner recharged', () => {
    const bill = { id: 'UTIL-1', leaseId: 'LEASE-MYS-1', period: '2026-10', dueDate: d('2026-11-01'), amount: new Prisma.Decimal(812.4), currency: 'MYR', kind: 'ELECTRICITY', lease: { ownerOrganisationId: 'ORG-AHG', tenantOrganisationId: 'ORG-TENANT', countryNodeId: 'CN-MYS', unit: lease.unit } };

    it('opens a case for a bill unpaid 7 days after it was due, like a month of rent', async () => {
      prisma.leaseUtilityCharge.findMany.mockResolvedValueOnce([bill]);
      await service.sweep(d('2026-11-08'));
      expect(prisma.rentCollectionCase.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentId: 'UTIL-1', itemKind: 'ELECTRICITY', period: '2026-10', stage: 'OPEN' }) });
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-AZIMAH', message: expect.stringContaining('the electricity bill of RM 812.40 for 2026-10 is unpaid') }));
    });

    it('sends a bill reminder naming the bill', async () => {
      prisma.rentCollectionCase.findFirst.mockResolvedValue(row({ paymentId: 'UTIL-1', itemKind: 'ELECTRICITY', period: '2026-10', amount: new Prisma.Decimal(812.4) }));
      prisma.rentCollectionCase.findUniqueOrThrow.mockResolvedValue(row({ paymentId: 'UTIL-1', itemKind: 'ELECTRICITY', period: '2026-10', amount: new Prisma.Decimal(812.4) }));
      prisma.leaseUtilityCharge.findUnique.mockResolvedValue({ status: 'DUE', dueDate: d('2026-11-01'), billReference: 'TNB-881' });
      await service.remind(collector, 'COLL-MYS-1');
      expect(notifications.enqueue).toHaveBeenCalledWith(expect.objectContaining({ recipientUserId: 'USR-TN', title: 'Bill reminder 1', message: expect.stringContaining('the electricity bill of RM 812.40 for 2026-10 is unpaid') }));
    });

    it('closes the case once the bill is paid, or when the owner removed the bill', async () => {
      prisma.rentCollectionCase.findMany.mockResolvedValueOnce([
        { id: 'COLL-MYS-2', paymentId: 'UTIL-1', itemKind: 'ELECTRICITY', history: [], updatedAt: new Date() },
        { id: 'COLL-MYS-3', paymentId: 'UTIL-GONE', itemKind: 'WATER', history: [], updatedAt: new Date() },
      ]);
      prisma.leaseUtilityCharge.findMany.mockResolvedValueOnce([{ id: 'UTIL-1', status: 'PAID', paidAt: d('2026-11-20'), reference: 'IBG 9' }]);
      await service.sweep(d('2026-11-21'));
      expect(prisma.rentCollectionCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'COLL-MYS-2' }), data: expect.objectContaining({ stage: 'PAID' }) }));
      expect(prisma.rentCollectionCase.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'COLL-MYS-3' }), data: expect.objectContaining({ stage: 'CLOSED', closedReason: 'Bill removed by the owner' }) }));
    });

    it('writes the reminder letter for a bill in Malay and English', async () => {
      const letter = { number: 1 as const, caseId: 'COLL-MYS-2', issuedOn: '2026-11-10', payBy: '2026-11-24', ownerName: 'Al Hidayah Group', tenantName: 'Teras Engineering', unit: 'Tingkat 7', asset: 'Menara Hidayah', leaseId: 'LEASE-MYS-1', leaseStart: '2026-08-01', period: '2026-10', dueDate: '2026-11-01', amount: 'RM 812.40', totalOverdue: 'RM 26,312.40', item: 'ELECTRICITY', billReference: 'TNB-881' };
      for (const language of ['ms', 'en'] as const) expect((await renderReminderLetter({ ...letter, language })).subarray(0, 5).toString()).toBe('%PDF-');
    });
  });
});
