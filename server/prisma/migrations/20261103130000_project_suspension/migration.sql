-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedBy" TEXT,
ADD COLUMN     "suspendedPoolIds" JSONB,
ADD COLUMN     "suspendedReason" TEXT;

