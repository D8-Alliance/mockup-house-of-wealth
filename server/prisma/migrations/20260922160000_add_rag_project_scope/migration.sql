ALTER TABLE "RagDocument" ADD COLUMN "projectId" TEXT;

CREATE INDEX "RagDocument_projectId_organisationId_countryNodeId_status_idx"
ON "RagDocument"("projectId", "organisationId", "countryNodeId", "status");

ALTER TABLE "RagDocument"
ADD CONSTRAINT "RagDocument_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("projectId")
ON DELETE CASCADE ON UPDATE CASCADE;
