-- Deposits carried from a lease to the lease that renews it.
ALTER TABLE "AssetLease" ADD COLUMN     "depositCarriedIn" JSONB,
ADD COLUMN     "depositCarriedOut" JSONB;

-- Monthly utility bills recharged at cost when the owner pays them.
CREATE TABLE "LeaseUtilityCharge" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "billReference" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseUtilityCharge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaseUtilityCharge_leaseId_period_kind_key" ON "LeaseUtilityCharge"("leaseId", "period", "kind");
CREATE INDEX "LeaseUtilityCharge_status_dueDate_idx" ON "LeaseUtilityCharge"("status", "dueDate");

ALTER TABLE "LeaseUtilityCharge" ADD CONSTRAINT "LeaseUtilityCharge_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "AssetLease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The utility deposit a unit starts with, by state.
CREATE TABLE "UtilityDepositRule" (
    "countryNodeId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "months" DECIMAL(4,1) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilityDepositRule_pkey" PRIMARY KEY ("countryNodeId","state")
);
