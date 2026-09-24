ALTER TABLE "Contract" ADD COLUMN "title" TEXT;
ALTER TABLE "Contract" ADD COLUMN "templateId" TEXT;
ALTER TABLE "Contract" ADD COLUMN "wizardData" JSONB;
ALTER TABLE "Contract" ADD COLUMN "complianceReport" JSONB;
ALTER TABLE "Contract" ADD COLUMN "lastGeneratedAt" TIMESTAMP(3);

CREATE INDEX "Contract_contractType_status_idx" ON "Contract"("contractType", "status");
