-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "offerTerms" JSONB,
ADD COLUMN     "offeredToPdp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProjectAssetNeed" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT '',
    "preferredAkad" TEXT NOT NULL DEFAULT 'EITHER',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAssetNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetEngagement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "needId" TEXT,
    "countryNodeId" TEXT NOT NULL,
    "ownerOrganisationId" TEXT NOT NULL,
    "pdpOrganisationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "awaiting" TEXT NOT NULL,
    "akad" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "history" JSONB NOT NULL,
    "legalApprovedBy" TEXT,
    "legalApprovedAt" TIMESTAMP(3),
    "shariahApprovedBy" TEXT,
    "shariahApprovedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAssetNeed_countryNodeId_status_idx" ON "ProjectAssetNeed"("countryNodeId", "status");

-- CreateIndex
CREATE INDEX "ProjectAssetNeed_projectId_idx" ON "ProjectAssetNeed"("projectId");

-- CreateIndex
CREATE INDEX "AssetEngagement_assetId_status_idx" ON "AssetEngagement"("assetId", "status");

-- CreateIndex
CREATE INDEX "AssetEngagement_projectId_idx" ON "AssetEngagement"("projectId");

-- CreateIndex
CREATE INDEX "AssetEngagement_countryNodeId_status_idx" ON "AssetEngagement"("countryNodeId", "status");

-- AddForeignKey
ALTER TABLE "ProjectAssetNeed" ADD CONSTRAINT "ProjectAssetNeed_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEngagement" ADD CONSTRAINT "AssetEngagement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEngagement" ADD CONSTRAINT "AssetEngagement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetEngagement" ADD CONSTRAINT "AssetEngagement_needId_fkey" FOREIGN KEY ("needId") REFERENCES "ProjectAssetNeed"("id") ON DELETE SET NULL ON UPDATE CASCADE;

