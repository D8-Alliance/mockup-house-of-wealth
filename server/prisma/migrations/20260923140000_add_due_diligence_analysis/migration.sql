CREATE TABLE "ProjectDueDiligenceScan" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "requestedBy" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "confidenceScore" INTEGER NOT NULL DEFAULT 0,
  "missingDocuments" JSONB NOT NULL,
  "findings" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ProjectDueDiligenceScan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectDueDiligenceScan_projectId_createdAt_idx" ON "ProjectDueDiligenceScan"("projectId", "createdAt");
CREATE INDEX "ProjectDueDiligenceScan_organisationId_countryNodeId_createdAt_idx" ON "ProjectDueDiligenceScan"("organisationId", "countryNodeId", "createdAt");
ALTER TABLE "ProjectDueDiligenceScan" ADD CONSTRAINT "ProjectDueDiligenceScan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDueDiligenceScan" ADD CONSTRAINT "ProjectDueDiligenceScan_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectDueDiligenceScan" ADD CONSTRAINT "ProjectDueDiligenceScan_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProjectDocumentAnalysis" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "analysedBy" TEXT NOT NULL,
  "confidenceScore" INTEGER NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectDocumentAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectDocumentAnalysis_documentId_createdAt_idx" ON "ProjectDocumentAnalysis"("documentId", "createdAt");
CREATE INDEX "ProjectDocumentAnalysis_projectId_createdAt_idx" ON "ProjectDocumentAnalysis"("projectId", "createdAt");
ALTER TABLE "ProjectDocumentAnalysis" ADD CONSTRAINT "ProjectDocumentAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ProjectDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentAnalysis" ADD CONSTRAINT "ProjectDocumentAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentAnalysis" ADD CONSTRAINT "ProjectDocumentAnalysis_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectDocumentAnalysis" ADD CONSTRAINT "ProjectDocumentAnalysis_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
