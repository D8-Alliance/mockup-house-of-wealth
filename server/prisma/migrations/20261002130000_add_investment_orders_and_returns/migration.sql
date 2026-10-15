ALTER TABLE "InvestmentContribution" ADD COLUMN "orderId" TEXT;
CREATE UNIQUE INDEX "InvestmentContribution_orderId_key" ON "InvestmentContribution"("orderId");

CREATE TABLE "InvestmentOrder" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "investorUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  CONSTRAINT "InvestmentOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvestmentOrder_orderNumber_key" ON "InvestmentOrder"("orderNumber");
CREATE UNIQUE INDEX "InvestmentOrder_idempotencyKey_key" ON "InvestmentOrder"("idempotencyKey");
CREATE INDEX "InvestmentOrder_investorUserId_createdAt_idx" ON "InvestmentOrder"("investorUserId", "createdAt");
CREATE INDEX "InvestmentOrder_organisationId_countryNodeId_createdAt_idx" ON "InvestmentOrder"("organisationId", "countryNodeId", "createdAt");
CREATE INDEX "InvestmentOrder_poolId_status_idx" ON "InvestmentOrder"("poolId", "status");

ALTER TABLE "Distribution" ADD COLUMN "periodName" TEXT NOT NULL DEFAULT 'Unspecified';
ALTER TABLE "Distribution" ADD COLUMN "grossRevenue" DECIMAL(18,2);
ALTER TABLE "Distribution" ADD COLUMN "eligibleCosts" DECIMAL(18,2);
ALTER TABLE "Distribution" ADD COLUMN "netProfit" DECIMAL(18,2);
ALTER TABLE "Distribution" ADD COLUMN "investorProfit" DECIMAL(18,2);

ALTER TABLE "InvestmentOrder" ADD CONSTRAINT "InvestmentOrder_pool_fkey" FOREIGN KEY ("poolId") REFERENCES "WealthPool"("poolId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvestmentContribution" ADD CONSTRAINT "InvestmentContribution_order_fkey" FOREIGN KEY ("orderId") REFERENCES "InvestmentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
