CREATE TABLE "ProjectPromotionCampaign" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "badgeType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "priceMYR" DECIMAL(18,2) NOT NULL,
    "creditsCost" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectPromotionCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PromotionPayment" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMYR" DECIMAL(18,2) NOT NULL,
    "creditsCost" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromotionPayment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PromotionPayment_campaignId_key" ON "PromotionPayment"("campaignId");
CREATE INDEX "ProjectPromotionCampaign_projectId_status_idx" ON "ProjectPromotionCampaign"("projectId", "status");
CREATE INDEX "ProjectPromotionCampaign_organisationId_countryNodeId_idx" ON "ProjectPromotionCampaign"("organisationId", "countryNodeId");
CREATE INDEX "PromotionPayment_userId_createdAt_idx" ON "PromotionPayment"("userId", "createdAt");
ALTER TABLE "ProjectPromotionCampaign" ADD CONSTRAINT "ProjectPromotionCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPromotionCampaign" ADD CONSTRAINT "ProjectPromotionCampaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPromotionCampaign" ADD CONSTRAINT "ProjectPromotionCampaign_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPromotionCampaign" ADD CONSTRAINT "ProjectPromotionCampaign_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionPayment" ADD CONSTRAINT "PromotionPayment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ProjectPromotionCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionPayment" ADD CONSTRAINT "PromotionPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
