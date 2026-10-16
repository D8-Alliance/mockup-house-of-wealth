-- Type-specific asset details, map location, duplicate detection and automated document checks.
ALTER TABLE "Asset" ADD COLUMN "details" JSONB;
ALTER TABLE "Asset" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Asset" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "Asset" ADD COLUMN "identityKey" TEXT;
ALTER TABLE "Asset" ADD COLUMN "checkFindings" JSONB;
ALTER TABLE "Asset" ADD COLUMN "checkedAt" TIMESTAMP(3);
CREATE INDEX "Asset_identityKey_idx" ON "Asset"("identityKey");

-- Where and when a site photo was taken.
ALTER TABLE "AssetDocument" ADD COLUMN "metadata" JSONB;
