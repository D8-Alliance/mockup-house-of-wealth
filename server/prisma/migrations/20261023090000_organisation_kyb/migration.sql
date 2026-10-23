-- An organisation's registration details and its business verification (KYB), for organisations
-- such as asset owners that have no delivery partner application.
ALTER TABLE "Organisation" ADD COLUMN "registrationNumber" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "registeredAddress" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "kybStatus" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "Organisation" ADD COLUMN "kybSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Organisation" ADD COLUMN "kybReviewedBy" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "kybReviewedAt" TIMESTAMP(3);
ALTER TABLE "Organisation" ADD COLUMN "kybNote" TEXT;
ALTER TABLE "Organisation" ADD COLUMN "kybHistory" JSONB NOT NULL DEFAULT '[]';
CREATE INDEX "Organisation_countryNodeId_kybStatus_idx" ON "Organisation"("countryNodeId", "kybStatus");

CREATE TABLE "OrganisationKybDocument" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileContent" BYTEA NOT NULL,
  "sha256" TEXT NOT NULL,
  "integrity" JSONB,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganisationKybDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrganisationKybDocument_organisationId_idx" ON "OrganisationKybDocument"("organisationId");
ALTER TABLE "OrganisationKybDocument" ADD CONSTRAINT "OrganisationKybDocument_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
