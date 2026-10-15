ALTER TABLE "Distribution" ADD COLUMN "createdBy" TEXT NOT NULL DEFAULT 'SYSTEM-MIGRATION';
ALTER TABLE "Distribution" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Distribution" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Distribution" ADD COLUMN "rejectedBy" TEXT;
ALTER TABLE "Distribution" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Distribution" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "Distribution" ADD COLUMN "settledAt" TIMESTAMP(3);
ALTER TABLE "Distribution" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "DistributionAllocation" ALTER COLUMN "ledgerTransactionId" DROP NOT NULL;

CREATE TABLE "DistributionApproval" (
  "id" TEXT NOT NULL,
  "distributionId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DistributionApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DistributionApproval_distributionId_createdAt_idx" ON "DistributionApproval"("distributionId", "createdAt");

CREATE TABLE "PayoutInstruction" (
  "id" TEXT NOT NULL,
  "allocationId" TEXT NOT NULL,
  "beneficiaryUserId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MANUAL_BANK_FILE',
  "providerReference" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "destinationHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "idempotencyKey" TEXT NOT NULL,
  "failureReason" TEXT,
  "submittedAt" TIMESTAMP(3),
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutInstruction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayoutInstruction_allocationId_key" ON "PayoutInstruction"("allocationId");
CREATE UNIQUE INDEX "PayoutInstruction_providerReference_key" ON "PayoutInstruction"("providerReference");
CREATE UNIQUE INDEX "PayoutInstruction_idempotencyKey_key" ON "PayoutInstruction"("idempotencyKey");
CREATE INDEX "PayoutInstruction_beneficiaryUserId_status_idx" ON "PayoutInstruction"("beneficiaryUserId", "status");
CREATE INDEX "PayoutInstruction_status_createdAt_idx" ON "PayoutInstruction"("status", "createdAt");

ALTER TABLE "DistributionApproval" ADD CONSTRAINT "DistributionApproval_distribution_fkey" FOREIGN KEY ("distributionId") REFERENCES "Distribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_allocation_fkey" FOREIGN KEY ("allocationId") REFERENCES "DistributionAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
