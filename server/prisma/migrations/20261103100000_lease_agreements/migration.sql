-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "leaseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contract_leaseId_key" ON "Contract"("leaseId");

