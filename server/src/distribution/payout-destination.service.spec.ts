import { ForbiddenException } from '@nestjs/common';
import { PayoutDestinationService } from './payout-destination.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));
jest.mock('../audit/audit.service', () => ({ AuditService: class {} }));

const settlement = (userId: string): AuthenticatedUser => ({ userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role: 'Settlement Officer', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Settlement Officer'] });

describe('PayoutDestinationService.verify', () => {
  const destination = { id: 'PD-1', ownerUserId: 'USR-OFFICER', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', destinationHash: 'h' };
  const prisma = { payoutDestination: { findUnique: jest.fn().mockResolvedValue(destination), update: jest.fn().mockResolvedValue({ ...destination, status: 'VERIFIED' }) } };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const service = new PayoutDestinationService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('refuses a settlement operator verifying their own payout account', async () => {
    await expect(service.verify(settlement('USR-OFFICER'), 'PD-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.payoutDestination.update).not.toHaveBeenCalled();
  });

  it('lets another settlement operator verify it', async () => {
    await service.verify(settlement('USR-SECOND'), 'PD-1');
    expect(prisma.payoutDestination.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'VERIFIED', verifiedBy: 'USR-SECOND' }) }));
  });
});

describe('PayoutDestinationService own accounts', () => {
  const investor: AuthenticatedUser = { userId: 'USR-INV', idpSubjectId: 'USR-INV', email: 'inv@example.test', name: 'Investor', role: 'Retail Investor', countryNodeId: 'CN-MYS', organisationId: 'ORG-INV', assignedRoles: ['Retail Investor'] };
  const owned = { id: 'PD-9', ownerUserId: 'USR-INV', organisationId: 'ORG-INV', countryNodeId: 'CN-MYS', destinationHash: 'h', isDefault: true, status: 'PENDING_VERIFICATION' };
  const prisma = { payoutDestination: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), update: jest.fn().mockResolvedValue(owned) } };
  const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
  const service = new PayoutDestinationService(prisma as unknown as PrismaService, audit as unknown as AuditService);

  beforeEach(() => jest.clearAllMocks());

  it('is closed to staff roles such as Super Admin', () => {
    expect(() => service.listMine({ ...investor, role: 'Super Admin', assignedRoles: ['Super Admin'] })).toThrow(ForbiddenException);
  });

  it('lists only the owner\'s accounts that were not removed', async () => {
    await service.listMine(investor);
    expect(prisma.payoutDestination.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerUserId: 'USR-INV', status: { not: 'REMOVED' } } }));
  });

  it('removes by marking, and passes the default to the next account', async () => {
    prisma.payoutDestination.findUnique.mockResolvedValueOnce(owned);
    prisma.payoutDestination.findFirst.mockResolvedValueOnce({ id: 'PD-8' });
    await service.remove(investor, 'PD-9');
    expect(prisma.payoutDestination.update).toHaveBeenCalledWith({ where: { id: 'PD-9' }, data: { status: 'REMOVED', isDefault: false } });
    expect(prisma.payoutDestination.update).toHaveBeenCalledWith({ where: { id: 'PD-8' }, data: { isDefault: true } });
  });

  it('will not touch someone else\'s account', async () => {
    prisma.payoutDestination.findUnique.mockResolvedValueOnce({ ...owned, ownerUserId: 'USR-OTHER' });
    await expect(service.remove(investor, 'PD-9')).rejects.toThrow('Payout account not found.');
  });
});
