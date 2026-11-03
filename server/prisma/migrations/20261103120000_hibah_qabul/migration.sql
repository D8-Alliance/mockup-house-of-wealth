-- AlterTable
ALTER TABLE "EstateBeneficiary" ADD COLUMN     "hibahQabulAsGuardian" BOOLEAN,
ADD COLUMN     "hibahQabulAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hibahQabulBy" TEXT,
ADD COLUMN     "hibahQabulEvidence" JSONB,
ADD COLUMN     "hibahQabulExpiresAt" TIMESTAMP(3),
ADD COLUMN     "hibahQabulSentAt" TIMESTAMP(3),
ADD COLUMN     "hibahQabulTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "EstateBeneficiary_hibahQabulTokenHash_key" ON "EstateBeneficiary"("hibahQabulTokenHash");

