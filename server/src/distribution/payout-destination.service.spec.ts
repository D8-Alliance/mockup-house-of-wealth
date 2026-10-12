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
