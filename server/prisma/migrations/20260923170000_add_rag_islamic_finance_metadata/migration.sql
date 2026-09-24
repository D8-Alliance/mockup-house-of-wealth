ALTER TABLE "RagDocument" ADD COLUMN "documentCategory" TEXT;
ALTER TABLE "RagDocument" ADD COLUMN "contractType" TEXT;
ALTER TABLE "RagDocument" ADD COLUMN "authority" TEXT;
ALTER TABLE "RagDocument" ADD COLUMN "jurisdiction" TEXT;
ALTER TABLE "RagDocument" ADD COLUMN "industry" TEXT;
ALTER TABLE "RagDocument" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
CREATE INDEX "RagDocument_islamic_metadata_idx" ON "RagDocument"("organisationId", "countryNodeId", "contractType", "jurisdiction", "approvalStatus");
ALTER TABLE "ContractClause" ADD COLUMN "industry" TEXT;
CREATE INDEX "ContractClause_industry_idx" ON "ContractClause"("industry");
