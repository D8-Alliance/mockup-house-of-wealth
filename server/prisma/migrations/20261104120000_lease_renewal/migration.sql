-- A lease that renews another: it starts the day after that lease ends, for the same unit and tenant.
ALTER TABLE "AssetLease" ADD COLUMN     "renewsLeaseId" TEXT;

CREATE INDEX "AssetLease_renewsLeaseId_idx" ON "AssetLease"("renewsLeaseId");
