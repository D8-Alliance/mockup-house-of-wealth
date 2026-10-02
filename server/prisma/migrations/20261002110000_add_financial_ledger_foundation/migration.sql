CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL,
  "accountCode" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "ownerType" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancialAccount_accountCode_key" ON "FinancialAccount"("accountCode");
CREATE INDEX "FinancialAccount_ownerType_ownerId_idx" ON "FinancialAccount"("ownerType", "ownerId");
CREATE INDEX "FinancialAccount_organisationId_countryNodeId_idx" ON "FinancialAccount"("organisationId", "countryNodeId");
CREATE INDEX "FinancialAccount_status_idx" ON "FinancialAccount"("status");

CREATE TABLE "LedgerTransaction" (
  "id" TEXT NOT NULL,
  "transactionNumber" TEXT NOT NULL,
  "transactionType" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "description" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LedgerTransaction_transactionNumber_key" ON "LedgerTransaction"("transactionNumber");
CREATE UNIQUE INDEX "LedgerTransaction_idempotencyKey_key" ON "LedgerTransaction"("idempotencyKey");
CREATE INDEX "LedgerTransaction_referenceType_referenceId_idx" ON "LedgerTransaction"("referenceType", "referenceId");
CREATE INDEX "LedgerTransaction_organisationId_countryNodeId_createdAt_idx" ON "LedgerTransaction"("organisationId", "countryNodeId", "createdAt");
CREATE INDEX "LedgerTransaction_transactionType_createdAt_idx" ON "LedgerTransaction"("transactionType", "createdAt");

CREATE TABLE "LedgerEntry" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LedgerEntry_amount_check" CHECK ("amount" > 0),
  CONSTRAINT "LedgerEntry_direction_check" CHECK ("direction" IN ('DEBIT', 'CREDIT'))
);
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "LedgerEntry"("accountId", "createdAt");
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

CREATE TABLE "InvestmentContribution" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "poolId" TEXT,
  "investorUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestmentContribution_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvestmentContribution_ledgerTransactionId_key" ON "InvestmentContribution"("ledgerTransactionId");
CREATE INDEX "InvestmentContribution_projectId_createdAt_idx" ON "InvestmentContribution"("projectId", "createdAt");
CREATE INDEX "InvestmentContribution_investorUserId_createdAt_idx" ON "InvestmentContribution"("investorUserId", "createdAt");
CREATE INDEX "InvestmentContribution_organisationId_countryNodeId_idx" ON "InvestmentContribution"("organisationId", "countryNodeId");

CREATE TABLE "FundingDisbursement" (
  "id" TEXT NOT NULL,
  "fundingRequestId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FundingDisbursement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FundingDisbursement_fundingRequestId_key" ON "FundingDisbursement"("fundingRequestId");
CREATE UNIQUE INDEX "FundingDisbursement_ledgerTransactionId_key" ON "FundingDisbursement"("ledgerTransactionId");
CREATE INDEX "FundingDisbursement_projectId_createdAt_idx" ON "FundingDisbursement"("projectId", "createdAt");
CREATE INDEX "FundingDisbursement_organisationId_countryNodeId_idx" ON "FundingDisbursement"("organisationId", "countryNodeId");

CREATE TABLE "Refund" (
  "id" TEXT NOT NULL,
  "paymentTransactionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Refund_ledgerTransactionId_key" ON "Refund"("ledgerTransactionId");
CREATE INDEX "Refund_userId_createdAt_idx" ON "Refund"("userId", "createdAt");
CREATE INDEX "Refund_organisationId_countryNodeId_idx" ON "Refund"("organisationId", "countryNodeId");

CREATE TABLE "ZakatPayment" (
  "id" TEXT NOT NULL,
  "calculationId" TEXT NOT NULL,
  "payerUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZakatPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ZakatPayment_ledgerTransactionId_key" ON "ZakatPayment"("ledgerTransactionId");
CREATE INDEX "ZakatPayment_payerUserId_createdAt_idx" ON "ZakatPayment"("payerUserId", "createdAt");
CREATE INDEX "ZakatPayment_organisationId_countryNodeId_idx" ON "ZakatPayment"("organisationId", "countryNodeId");

CREATE TABLE "Distribution" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "poolId" TEXT,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "totalAmount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Distribution_projectId_createdAt_idx" ON "Distribution"("projectId", "createdAt");
CREATE INDEX "Distribution_organisationId_countryNodeId_idx" ON "Distribution"("organisationId", "countryNodeId");

CREATE TABLE "DistributionAllocation" (
  "id" TEXT NOT NULL,
  "distributionId" TEXT NOT NULL,
  "beneficiaryUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "ledgerTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistributionAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DistributionAllocation_ledgerTransactionId_key" ON "DistributionAllocation"("ledgerTransactionId");
CREATE INDEX "DistributionAllocation_beneficiaryUserId_createdAt_idx" ON "DistributionAllocation"("beneficiaryUserId", "createdAt");
CREATE INDEX "DistributionAllocation_organisationId_countryNodeId_idx" ON "DistributionAllocation"("organisationId", "countryNodeId");

ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_organisation_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_organisation_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerTransaction" ADD CONSTRAINT "LedgerTransaction_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transaction_fkey" FOREIGN KEY ("transactionId") REFERENCES "LedgerTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_account_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FundingDisbursement" ADD CONSTRAINT "FundingDisbursement_request_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "FundingRequest"("fundingRequestId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "PaymentTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ZakatPayment" ADD CONSTRAINT "ZakatPayment_calculation_fkey" FOREIGN KEY ("calculationId") REFERENCES "ZakatCalculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DistributionAllocation" ADD CONSTRAINT "DistributionAllocation_distribution_fkey" FOREIGN KEY ("distributionId") REFERENCES "Distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION block_financial_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Financial ledger is append-only: UPDATE and DELETE are forbidden';
END;
$$;

CREATE TRIGGER ledger_transaction_no_update BEFORE UPDATE ON "LedgerTransaction" FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_mutation();
CREATE TRIGGER ledger_transaction_no_delete BEFORE DELETE ON "LedgerTransaction" FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_mutation();
CREATE TRIGGER ledger_entry_no_update BEFORE UPDATE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_mutation();
CREATE TRIGGER ledger_entry_no_delete BEFORE DELETE ON "LedgerEntry" FOR EACH ROW EXECUTE FUNCTION block_financial_ledger_mutation();
