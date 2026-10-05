import { BadRequestException } from '@nestjs/common';
import { FinancialLedgerService, toyyibPayCashAccount } from './financial-ledger.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

const actor: AuthenticatedUser = {
  userId: 'USR-A', idpSubjectId: 'SUB-A', email: 'a@example.test', name: 'A',
  role: 'Super Admin', countryNodeId: 'CN-MYS', organisationId: 'ORG-A', assignedRoles: ['Super Admin'],
};

const account = (id: string, accountType = 'ASSET') => ({ id, accountCode: id, accountType, ownerType: 'ORGANISATION', ownerId: 'ORG-A', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', status: 'ACTIVE' });

describe('FinancialLedgerService', () => {
  it('rejects unbalanced postings before opening a transaction', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new FinancialLedgerService(prisma as unknown as PrismaService, {} as AuditService);

    await expect(service.post(actor, { transactionType: 'TEST', referenceType: 'TEST', referenceId: '1', currency: 'MYR', description: 'Invalid', idempotencyKey: 'invalid-1', entries: [{ accountId: 'A', direction: 'DEBIT', amount: 100 }, { accountId: 'B', direction: 'CREDIT', amount: 90 }] })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('posts balanced entries and audits inside the transaction', async () => {
    const tx = {
      ledgerTransaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'LT-1', transactionNumber: 'HOW-LEDGER-1', organisationId: 'ORG-A', countryNodeId: 'CN-MYS', transactionType: 'FUNDING', entries: [] }),
      },
      financialAccount: { findMany: jest.fn().mockResolvedValue([account('A'), account('B')]) },
    };
    const prisma = { $transaction: jest.fn().mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const audit = { recordActor: jest.fn().mockResolvedValue(undefined) };
    const service = new FinancialLedgerService(prisma as unknown as PrismaService, audit as unknown as AuditService);

    const result = await service.post(actor, { transactionType: 'FUNDING', referenceType: 'FundingRequest', referenceId: 'FR-1', currency: 'MYR', description: 'Funding', idempotencyKey: 'funding-1', entries: [{ accountId: 'A', direction: 'DEBIT', amount: 100 }, { accountId: 'B', direction: 'CREDIT', amount: 100 }] });

    expect(result.id).toBe('LT-1');
    expect(tx.ledgerTransaction.create).toHaveBeenCalled();
    expect(audit.recordActor).toHaveBeenCalledWith(actor, expect.objectContaining({ action: 'financial.ledger.post' }), tx);
  });
});

describe('toyyibPayCashAccount', () => {
  it('gives every organisation and country its own ToyyibPay cash account', () => {
    const a = toyyibPayCashAccount('ORG-A', 'CN-MYS', 'MYR');
    const b = toyyibPayCashAccount('ORG-B', 'CN-MYS', 'MYR');
    expect(a.accountCode).not.toBe(b.accountCode);
    expect(a).toMatchObject({ organisationId: 'ORG-A', countryNodeId: 'CN-MYS', currency: 'MYR', accountType: 'ASSET' });
  });
});
