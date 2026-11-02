-- Entity type and corporate group on organisations, and the related-party flag on investment orders.
ALTER TABLE "Organisation" ADD COLUMN "entityType" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "groupName" TEXT;
ALTER TABLE "InvestmentOrder" ADD COLUMN "relatedParty" BOOLEAN NOT NULL DEFAULT false;
