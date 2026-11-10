-- Rent recorded by SOA waits for Accounts to confirm it (status RECORDED, then PAID).
ALTER TABLE "LeaseRentPayment" ADD COLUMN "recordedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedBy" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- Monthly statements of account sent to tenants.
CREATE TABLE "LeaseStatement" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "outstanding" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseStatement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaseStatement_leaseId_month_key" ON "LeaseStatement"("leaseId", "month");
CREATE INDEX "LeaseStatement_leaseId_idx" ON "LeaseStatement"("leaseId");
