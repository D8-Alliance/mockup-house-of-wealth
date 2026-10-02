import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, FinancialAccount, LedgerTransaction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/identity.service';
import { PrismaService } from '../prisma.service';
import { assertTenantScope, tenantScopeFilter } from '../tenancy/tenant-scope';

export type LedgerPosting = {
  transactionType: string;
  referenceType: string;
  referenceId: string;
  currency: string;
  description: string;
  idempotencyKey: string;
  entries: Array<{ accountId: string; direction: 'DEBIT' | 'CREDIT'; amount: number; description?: string }>;
};

@Injectable()
export class FinancialLedgerService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createAccount(actor: AuthenticatedUser, input: { accountCode: string; accountType: string; ownerType: string; ownerId: string; organisationId: string; countryNodeId: string; currency?: string }) {
    assertTenantScope(actor, input, 'Financial account');
    const account = await this.prisma.financialAccount.create({ data: { ...input, currency: input.currency || 'MYR' } });
    await this.audit.recordActor(actor, { action: 'financial.account.create', resourceType: 'FinancialAccount', resourceId: account.id, organisationId: account.organisationId, countryNodeId: account.countryNodeId, metadata: { accountCode: account.accountCode, accountType: account.accountType, ownerType: account.ownerType, ownerId: account.ownerId, currency: account.currency } });
    return account;
  }

  async ensureAccount(actor: AuthenticatedUser, input: { accountCode: string; accountType: string; ownerType: string; ownerId: string; organisationId: string; countryNodeId: string; currency: string }) {
    assertTenantScope(actor, input, 'Financial account');
    const existing = await this.prisma.financialAccount.findUnique({ where: { accountCode: input.accountCode } });
    if (existing) {
      assertTenantScope(actor, existing, 'Financial account');
      if (existing.currency !== input.currency) throw new BadRequestException('Financial account currency does not match.');
      return existing;
    }
    return this.createAccount(actor, input);
  }

  async ensureAccountInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { accountCode: string; accountType: string; ownerType: string; ownerId: string; organisationId: string; countryNodeId: string; currency: string }) {
    assertTenantScope(actor, input, 'Financial account');
    const existing = await tx.financialAccount.findUnique({ where: { accountCode: input.accountCode } });
    if (existing) {
      assertTenantScope(actor, existing, 'Financial account');
      if (existing.currency !== input.currency) throw new BadRequestException('Financial account currency does not match.');
      return existing;
    }
    return tx.financialAccount.create({ data: input });
  }

  listAccounts(actor: AuthenticatedUser) {
    const canViewTenantAccounts = ['Super Admin', 'Country Admin', 'Organization Admin', 'Settlement Officer', 'Portfolio Manager'].includes(actor.role);
    return this.prisma.financialAccount.findMany({ where: { ...tenantScopeFilter(actor), ...(canViewTenantAccounts ? {} : { ownerType: 'USER', ownerId: actor.userId }) }, orderBy: { createdAt: 'desc' } });
  }

  async getBalance(actor: AuthenticatedUser, accountId: string) {
    const account = await this.prisma.financialAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Financial account not found');
    assertTenantScope(actor, account, 'Financial account');
    if (!['Super Admin', 'Country Admin', 'Organization Admin', 'Settlement Officer', 'Portfolio Manager'].includes(actor.role) && (account.ownerType !== 'USER' || account.ownerId !== actor.userId)) throw new ForbiddenException('Only your own financial account may be viewed.');
    return this.balanceForAccount(account);
  }

  async listLedger(actor: AuthenticatedUser, accountId?: string) {
    if (accountId) await this.getBalance(actor, accountId);
    const canViewTenantLedger = ['Super Admin', 'Country Admin', 'Organization Admin', 'Settlement Officer', 'Portfolio Manager'].includes(actor.role);
    const entryScope = accountId ? { entries: { some: { accountId } } } : canViewTenantLedger ? {} : { entries: { some: { account: { ownerType: 'USER', ownerId: actor.userId } } } };
    return this.prisma.ledgerTransaction.findMany({ where: { ...tenantScopeFilter(actor), ...entryScope }, include: { entries: { include: { account: { select: { accountCode: true, ownerType: true, ownerId: true } } } } }, orderBy: { createdAt: 'desc' }, take: 500 });
  }

  async transfer(actor: AuthenticatedUser, input: { sourceAccountId: string; destinationAccountId: string; amount: number; description: string; idempotencyKey: string }) {
    if (input.sourceAccountId === input.destinationAccountId) throw new BadRequestException('Source and destination accounts must differ.');
    const [source, destination] = await Promise.all([
      this.prisma.financialAccount.findUnique({ where: { id: input.sourceAccountId } }),
      this.prisma.financialAccount.findUnique({ where: { id: input.destinationAccountId } }),
    ]);
    if (!source || !destination) throw new NotFoundException('Financial account not found.');
    assertTenantScope(actor, source, 'Source financial account');
    assertTenantScope(actor, destination, 'Destination financial account');
    const canTransferTenantAccounts = ['Super Admin', 'Settlement Officer', 'Portfolio Manager'].includes(actor.role);
    if (!canTransferTenantAccounts && (source.ownerId !== actor.userId || destination.ownerId !== actor.userId)) throw new ForbiddenException('Only your own financial accounts may be transferred.');
    if (source.currency !== destination.currency) throw new BadRequestException('Transfer accounts must use the same currency.');
    const balance = await this.balanceForAccount(source);
    if (balance.balance + 0.005 < input.amount) throw new BadRequestException('Insufficient account balance.');
    return this.post(actor, { transactionType: 'INTERNAL_TRANSFER', referenceType: 'FinancialAccount', referenceId: source.id, currency: source.currency, description: input.description, idempotencyKey: input.idempotencyKey, entries: [{ accountId: destination.id, direction: 'DEBIT', amount: input.amount, description: 'Internal transfer received' }, { accountId: source.id, direction: 'CREDIT', amount: input.amount, description: 'Internal transfer sent' }] });
  }

  async post(actor: AuthenticatedUser, posting: LedgerPosting) {
    if (posting.entries.length < 2) throw new BadRequestException('A ledger transaction requires at least two entries.');
    this.assertBalanced(posting);
    return this.prisma.$transaction((tx) => this.postInTransaction(tx, actor, posting));
  }

  async recordInvestmentContribution(actor: AuthenticatedUser, input: { projectId: string; poolId?: string; investorUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Investment contribution');
    return this.prisma.$transaction(async (tx) => {
      const ledger = await this.postInTransaction(tx, actor, input.posting);
      return tx.investmentContribution.create({ data: { projectId: input.projectId, poolId: input.poolId, investorUserId: input.investorUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
    });
  }

  async recordInvestmentContributionInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { orderId: string; projectId: string; poolId?: string; investorUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Investment contribution');
    const ledger = await this.postInTransaction(tx, actor, input.posting);
    return tx.investmentContribution.create({ data: { orderId: input.orderId, projectId: input.projectId, poolId: input.poolId, investorUserId: input.investorUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
  }

  async recordFundingDisbursement(actor: AuthenticatedUser, input: { fundingRequestId: string; projectId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Funding disbursement');
    return this.prisma.$transaction(async (tx) => {
      const ledger = await this.postInTransaction(tx, actor, input.posting);
      return tx.fundingDisbursement.create({ data: { fundingRequestId: input.fundingRequestId, projectId: input.projectId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
    });
  }

  async recordRefund(actor: AuthenticatedUser, input: { paymentTransactionId: string; userId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; reason: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Refund');
    return this.prisma.$transaction(async (tx) => {
      const ledger = await this.postInTransaction(tx, actor, input.posting);
      return tx.refund.create({ data: { paymentTransactionId: input.paymentTransactionId, userId: input.userId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, reason: input.reason, ledgerTransactionId: ledger.id } });
    });
  }

  async recordRefundInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { paymentTransactionId: string; userId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; reason: string; posting: LedgerPosting }) {
    const ledger = await this.postInTransaction(tx, actor, input.posting);
    return tx.refund.create({ data: { paymentTransactionId: input.paymentTransactionId, userId: input.userId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, reason: input.reason, ledgerTransactionId: ledger.id } });
  }

  async recordZakatPayment(actor: AuthenticatedUser, input: { calculationId: string; payerUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Zakat payment');
    return this.prisma.$transaction(async (tx) => {
      const ledger = await this.postInTransaction(tx, actor, input.posting);
      return tx.zakatPayment.create({ data: { calculationId: input.calculationId, payerUserId: input.payerUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
    });
  }

  async recordZakatPaymentInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { calculationId: string; payerUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    const ledger = await this.postInTransaction(tx, actor, input.posting);
    return tx.zakatPayment.create({ data: { calculationId: input.calculationId, payerUserId: input.payerUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
  }

  async recordDistributionAllocation(actor: AuthenticatedUser, input: { distributionId: string; beneficiaryUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    assertTenantScope(actor, input, 'Distribution allocation');
    return this.prisma.$transaction(async (tx) => {
      const ledger = await this.postInTransaction(tx, actor, input.posting);
      return tx.distributionAllocation.create({ data: { distributionId: input.distributionId, beneficiaryUserId: input.beneficiaryUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
    });
  }

  async recordDistributionAllocationInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { distributionId: string; beneficiaryUserId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    const ledger = await this.postInTransaction(tx, actor, input.posting);
    return tx.distributionAllocation.create({ data: { distributionId: input.distributionId, beneficiaryUserId: input.beneficiaryUserId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
  }

  public async postInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, posting: LedgerPosting) {
    if (posting.entries.length < 2) throw new BadRequestException('A ledger transaction requires at least two entries.');
    this.assertBalanced(posting);
    const existing = await tx.ledgerTransaction.findUnique({ where: { idempotencyKey: posting.idempotencyKey }, include: { entries: true } });
    if (existing) {
      assertTenantScope(actor, existing, 'Ledger transaction');
      return existing;
    }
    const accounts = await tx.financialAccount.findMany({ where: { id: { in: posting.entries.map((entry) => entry.accountId) } } });
    if (accounts.length !== new Set(posting.entries.map((entry) => entry.accountId)).size) throw new NotFoundException('One or more financial accounts were not found.');
    for (const account of accounts) {
      assertTenantScope(actor, account, 'Financial account');
      if (account.status !== 'ACTIVE') throw new BadRequestException(`Financial account ${account.accountCode} is not active.`);
      if (account.currency !== posting.currency) throw new BadRequestException('All ledger accounts must use the transaction currency.');
    }
    const accountScope = accounts[0];
    if (accounts.some((account) => account.organisationId !== accountScope.organisationId || account.countryNodeId !== accountScope.countryNodeId)) throw new BadRequestException('A ledger transaction cannot cross tenant boundaries.');
    const transaction = await tx.ledgerTransaction.create({ data: { transactionNumber: `HOW-LEDGER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, transactionType: posting.transactionType, referenceType: posting.referenceType, referenceId: posting.referenceId, organisationId: accountScope.organisationId, countryNodeId: accountScope.countryNodeId, currency: posting.currency, description: posting.description, idempotencyKey: posting.idempotencyKey, createdBy: actor.userId, entries: { create: posting.entries.map((entry) => ({ accountId: entry.accountId, direction: entry.direction, amount: new Prisma.Decimal(entry.amount), currency: posting.currency, description: entry.description })) } }, include: { entries: true } });
    await this.audit.recordActor(actor, { action: 'financial.ledger.post', resourceType: 'LedgerTransaction', resourceId: transaction.id, organisationId: transaction.organisationId, countryNodeId: transaction.countryNodeId, metadata: { transactionType: transaction.transactionType, referenceType: transaction.referenceType, referenceId: transaction.referenceId, amount: posting.entries.filter((entry) => entry.direction === 'DEBIT').reduce((sum, entry) => sum + entry.amount, 0), entryCount: posting.entries.length } }, tx);
    return transaction;
  }

  async reverseInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, transactionId: string, idempotencyKey: string, description: string) {
    const original = await tx.ledgerTransaction.findUnique({ where: { id: transactionId }, include: { entries: true } });
    if (!original) throw new NotFoundException('Ledger transaction to reverse was not found.');
    assertTenantScope(actor, original, 'Ledger transaction');
    return this.postInTransaction(tx, actor, { transactionType: 'REVERSAL', referenceType: 'LedgerTransaction', referenceId: transactionId, currency: original.currency, description, idempotencyKey, entries: original.entries.map((entry) => ({ accountId: entry.accountId, direction: entry.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT', amount: Number(entry.amount), description: `Reversal of ${transactionId}` })) });
  }

  async recordFundingDisbursementInTransaction(tx: Prisma.TransactionClient, actor: AuthenticatedUser, input: { fundingRequestId: string; projectId: string; organisationId: string; countryNodeId: string; amount: number; currency: string; posting: LedgerPosting }) {
    const ledger = await this.postInTransaction(tx, actor, input.posting);
    return tx.fundingDisbursement.create({ data: { fundingRequestId: input.fundingRequestId, projectId: input.projectId, organisationId: input.organisationId, countryNodeId: input.countryNodeId, amount: new Prisma.Decimal(input.amount), currency: input.currency, ledgerTransactionId: ledger.id } });
  }

  private assertBalanced(posting: LedgerPosting) {
    const debit = posting.entries.filter((entry) => entry.direction === 'DEBIT').reduce((sum, entry) => sum + entry.amount, 0);
    const credit = posting.entries.filter((entry) => entry.direction === 'CREDIT').reduce((sum, entry) => sum + entry.amount, 0);
    if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit <= 0 || Math.abs(debit - credit) > 0.005) throw new BadRequestException('Ledger transaction debits and credits must balance.');
  }

  private async balanceForAccount(account: FinancialAccount) {
    const [debits, credits] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { accountId: account.id, direction: 'DEBIT' } }),
      this.prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: { accountId: account.id, direction: 'CREDIT' } }),
    ]);
    const debit = Number(debits._sum.amount || 0);
    const credit = Number(credits._sum.amount || 0);
    const normalDebit = ['ASSET', 'EXPENSE'].includes(account.accountType.toUpperCase());
    return { accountId: account.id, accountCode: account.accountCode, currency: account.currency, balance: normalDebit ? debit - credit : credit - debit, debit, credit };
  }
}
