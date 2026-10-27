-- Sponsor capital (pledged, proved, deposited) and takaful policies: conditions for opening a pool and releasing funds.
ALTER TABLE "Project" ADD COLUMN "hasSiteWork" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "hasWorkers" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProjectCapitalCommitment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLEDGED',
    "evidenceFileName" TEXT,
    "evidenceMimeType" TEXT,
    "evidenceContent" BYTEA,
    "evidenceSha256" TEXT,
    "evidencedBy" TEXT,
    "evidencedAt" TIMESTAMP(3),
    "depositReference" TEXT,
    "depositedBy" TEXT,
    "depositedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "history" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectCapitalCommitment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectCapitalCommitment_projectId_idx" ON "ProjectCapitalCommitment"("projectId");
CREATE INDEX "ProjectCapitalCommitment_countryNodeId_status_idx" ON "ProjectCapitalCommitment"("countryNodeId", "status");
ALTER TABLE "ProjectCapitalCommitment" ADD CONSTRAINT "ProjectCapitalCommitment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TakafulPolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "coverType" TEXT NOT NULL,
    "assetId" TEXT,
    "provider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "sumCovered" DECIMAL(18,2) NOT NULL,
    "contribution" DECIMAL(18,2),
    "currency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "lossPayee" TEXT NOT NULL,
    "conventional" BOOLEAN NOT NULL DEFAULT false,
    "shariahApprovalNote" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "integrity" JSONB,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "remindersSent" JSONB,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TakafulPolicy_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TakafulPolicy_projectId_idx" ON "TakafulPolicy"("projectId");
CREATE INDEX "TakafulPolicy_countryNodeId_status_idx" ON "TakafulPolicy"("countryNodeId", "status");
CREATE INDEX "TakafulPolicy_endDate_idx" ON "TakafulPolicy"("endDate");
ALTER TABLE "TakafulPolicy" ADD CONSTRAINT "TakafulPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;
