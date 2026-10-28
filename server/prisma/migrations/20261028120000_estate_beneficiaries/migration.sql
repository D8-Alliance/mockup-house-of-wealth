-- Beneficiaries and estate instructions, previously kept only in the browser.
CREATE TABLE "EstateBeneficiary" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "distributionType" TEXT NOT NULL,
    "allocationPercent" DECIMAL(5,2),
    "email" TEXT,
    "phone" TEXT,
    "identityNumberEncrypted" TEXT,
    "identityNumberMasked" TEXT,
    "payoutMethod" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "hibahIjabAt" TIMESTAMP(3),
    "hibahQabulStatus" TEXT,
    "hibahQabulAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateBeneficiary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EstateBeneficiary_ownerUserId_idx" ON "EstateBeneficiary"("ownerUserId");
