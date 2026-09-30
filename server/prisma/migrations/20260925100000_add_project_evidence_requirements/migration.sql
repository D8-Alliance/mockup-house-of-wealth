CREATE TABLE "ProjectEvidenceRequirement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredFormat" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "uploadedDocumentId" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "verificationResult" JSONB,
    "confidenceScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectEvidenceRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectEvidenceRequirement_projectId_evidenceType_key" ON "ProjectEvidenceRequirement"("projectId", "evidenceType");
CREATE INDEX "ProjectEvidenceRequirement_organisationId_countryNodeId_idx" ON "ProjectEvidenceRequirement"("organisationId", "countryNodeId");
CREATE INDEX "ProjectEvidenceRequirement_projectId_status_idx" ON "ProjectEvidenceRequirement"("projectId", "status");
ALTER TABLE "ProjectEvidenceRequirement" ADD CONSTRAINT "ProjectEvidenceRequirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectEvidenceRequirement" ADD CONSTRAINT "ProjectEvidenceRequirement_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectEvidenceRequirement" ADD CONSTRAINT "ProjectEvidenceRequirement_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectEvidenceRequirement" ADD CONSTRAINT "ProjectEvidenceRequirement_uploadedDocumentId_fkey" FOREIGN KEY ("uploadedDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
