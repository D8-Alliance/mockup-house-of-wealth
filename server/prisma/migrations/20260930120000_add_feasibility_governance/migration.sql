ALTER TABLE "ProjectEvidenceRequirement"
  ADD COLUMN "aiVerificationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

CREATE TABLE "ProjectFeasibilityRevision" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "aiRunId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "supersedesRevisionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_HUMAN_REVIEW',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectFeasibilityRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectApproval" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decision" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "reviewerRole" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "supportingEvidence" JSONB,
  "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supersededAt" TIMESTAMP(3),
  CONSTRAINT "ProjectApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectFeasibilityRevision_aiRunId_key" ON "ProjectFeasibilityRevision"("aiRunId");
CREATE UNIQUE INDEX "ProjectFeasibilityRevision_projectId_revisionNumber_key" ON "ProjectFeasibilityRevision"("projectId", "revisionNumber");
CREATE INDEX "ProjectFeasibilityRevision_projectId_createdAt_idx" ON "ProjectFeasibilityRevision"("projectId", "createdAt");
CREATE INDEX "ProjectFeasibilityRevision_organisationId_countryNodeId_idx" ON "ProjectFeasibilityRevision"("organisationId", "countryNodeId");
CREATE INDEX "ProjectApproval_projectId_status_idx" ON "ProjectApproval"("projectId", "status");
CREATE INDEX "ProjectApproval_revisionId_stage_idx" ON "ProjectApproval"("revisionId", "stage");
CREATE INDEX "ProjectApproval_organisationId_countryNodeId_idx" ON "ProjectApproval"("organisationId", "countryNodeId");

ALTER TABLE "ProjectFeasibilityRevision" ADD CONSTRAINT "ProjectFeasibilityRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFeasibilityRevision" ADD CONSTRAINT "ProjectFeasibilityRevision_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectFeasibilityRevision" ADD CONSTRAINT "ProjectFeasibilityRevision_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectFeasibilityRevision" ADD CONSTRAINT "ProjectFeasibilityRevision_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectFeasibilityRevision" ADD CONSTRAINT "ProjectFeasibilityRevision_supersedesRevisionId_fkey" FOREIGN KEY ("supersedesRevisionId") REFERENCES "ProjectFeasibilityRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectApproval" ADD CONSTRAINT "ProjectApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApproval" ADD CONSTRAINT "ProjectApproval_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProjectFeasibilityRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApproval" ADD CONSTRAINT "ProjectApproval_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectApproval" ADD CONSTRAINT "ProjectApproval_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
