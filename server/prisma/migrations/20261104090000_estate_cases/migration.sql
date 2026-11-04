-- Estate officer role, executors, estate cases (death report to settlement) and heir consent.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'Estate_Officer';

ALTER TABLE "User" ADD COLUMN "deceasedAt" TIMESTAMP(3);
ALTER TABLE "InvestmentOrder" ADD COLUMN "estateCaseId" TEXT;
ALTER TABLE "EstateBeneficiary" ADD COLUMN "heirConsentRequired" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EstateExecutor" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "relation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "identityNumberEncrypted" TEXT,
    "identityNumberMasked" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstateExecutor_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateExecutor_ownerUserId_idx" ON "EstateExecutor"("ownerUserId");

CREATE TABLE "EstateCase" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "deceasedUserId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REPORTED',
    "dateOfDeath" TIMESTAMP(3) NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterRelation" TEXT NOT NULL,
    "reporterKind" TEXT NOT NULL,
    "reporterRefId" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "reporterPhone" TEXT,
    "reportEvidence" JSONB,
    "deathVerifiedBy" TEXT,
    "deathVerifiedAt" TIMESTAMP(3),
    "documentsVerifiedBy" TEXT,
    "documentsVerifiedAt" TIMESTAMP(3),
    "plan" JSONB,
    "planBy" TEXT,
    "planAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EstateCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EstateCase_caseNumber_key" ON "EstateCase"("caseNumber");
CREATE INDEX "EstateCase_countryNodeId_status_idx" ON "EstateCase"("countryNodeId", "status");
CREATE INDEX "EstateCase_deceasedUserId_idx" ON "EstateCase"("deceasedUserId");

CREATE TABLE "EstateCaseDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstateCaseDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateCaseDocument_caseId_idx" ON "EstateCaseDocument"("caseId");
ALTER TABLE "EstateCaseDocument" ADD CONSTRAINT "EstateCaseDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EstateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EstateHeirConsent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "heirName" TEXT NOT NULL,
    "heirRelation" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EstateHeirConsent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateHeirConsent_caseId_idx" ON "EstateHeirConsent"("caseId");
ALTER TABLE "EstateHeirConsent" ADD CONSTRAINT "EstateHeirConsent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "EstateCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
