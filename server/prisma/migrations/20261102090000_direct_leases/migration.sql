-- CreateTable
CREATE TABLE "LeasableUnit" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "floorArea" DECIMAL(12,2),
    "floorAreaUnit" TEXT NOT NULL DEFAULT 'SQFT',
    "monthlyRent" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "depositMonths" DECIMAL(4,1) NOT NULL DEFAULT 2,
    "minTermMonths" INTEGER NOT NULL DEFAULT 12,
    "availableFrom" TIMESTAMP(3),
    "permittedUse" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'LISTED',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeasableUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetLease" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "ownerOrganisationId" TEXT NOT NULL,
    "tenantOrganisationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "awaiting" TEXT NOT NULL,
    "monthlyRent" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "depositAmount" DECIMAL(18,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "intendedUse" TEXT NOT NULL,
    "tenantActivity" TEXT NOT NULL,
    "history" JSONB NOT NULL,
    "legalApprovedBy" TEXT,
    "legalApprovedAt" TIMESTAMP(3),
    "shariahApprovedBy" TEXT,
    "shariahApprovedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaseRentPayment" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaseRentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeasableUnit_countryNodeId_status_idx" ON "LeasableUnit"("countryNodeId", "status");

-- CreateIndex
CREATE INDEX "LeasableUnit_assetId_idx" ON "LeasableUnit"("assetId");

-- CreateIndex
CREATE INDEX "AssetLease_unitId_status_idx" ON "AssetLease"("unitId", "status");

-- CreateIndex
CREATE INDEX "AssetLease_countryNodeId_status_idx" ON "AssetLease"("countryNodeId", "status");

-- CreateIndex
CREATE INDEX "AssetLease_ownerOrganisationId_idx" ON "AssetLease"("ownerOrganisationId");

-- CreateIndex
CREATE INDEX "AssetLease_tenantOrganisationId_idx" ON "AssetLease"("tenantOrganisationId");

-- CreateIndex
CREATE INDEX "LeaseRentPayment_status_dueDate_idx" ON "LeaseRentPayment"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LeaseRentPayment_leaseId_period_key" ON "LeaseRentPayment"("leaseId", "period");

-- AddForeignKey
ALTER TABLE "LeasableUnit" ADD CONSTRAINT "LeasableUnit_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetLease" ADD CONSTRAINT "AssetLease_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "LeasableUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaseRentPayment" ADD CONSTRAINT "LeaseRentPayment_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "AssetLease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

