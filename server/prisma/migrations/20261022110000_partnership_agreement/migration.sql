-- One agreement per asset partnership, agreed and signed by both parties.
ALTER TABLE "Contract" ADD COLUMN "engagementId" TEXT;
CREATE UNIQUE INDEX "Contract_engagementId_key" ON "Contract"("engagementId");
ALTER TABLE "ContractParty" ADD COLUMN "role" TEXT;
ALTER TABLE "ContractParty" ADD COLUMN "consentedVersion" INTEGER;
ALTER TABLE "ContractParty" ADD COLUMN "consentedAt" TIMESTAMP(3);
ALTER TABLE "ContractParty" ADD COLUMN "consentedBy" TEXT;
ALTER TABLE "ContractParty" ADD COLUMN "signedAt" TIMESTAMP(3);
ALTER TABLE "ContractParty" ADD COLUMN "signedBy" TEXT;
ALTER TABLE "ContractParty" ADD COLUMN "signatureName" TEXT;
