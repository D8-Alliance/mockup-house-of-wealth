-- AlterTable
ALTER TABLE "AssetLease" ADD COLUMN     "depositReceivedAt" TIMESTAMP(3),
ADD COLUMN     "depositReference" TEXT,
ADD COLUMN     "depositRefund" JSONB,
ADD COLUMN     "depositReturnedAt" TIMESTAMP(3);

