-- Three-tier RAG knowledge base: GLOBAL (all D-8 country nodes), COUNTRY, PROJECT.

ALTER TABLE "RagDocument"
  ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'PROJECT',
  ADD COLUMN "scopeKey" TEXT,
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "reviewComment" TEXT;

-- Existing tenant-wide documents become COUNTRY scope (never silently widened to GLOBAL).
UPDATE "RagDocument" SET "scope" = CASE WHEN "projectId" IS NULL THEN 'COUNTRY' ELSE 'PROJECT' END;

-- Project documents belong to the project's tenant, not the uploader's.
UPDATE "RagDocument" d
SET "organisationId" = p."organisationId", "countryNodeId" = p."countryNodeId"
FROM "Project" p
WHERE d."projectId" = p."projectId"
  AND (d."organisationId" <> p."organisationId" OR d."countryNodeId" <> p."countryNodeId");

UPDATE "RagDocument"
SET "scopeKey" = CASE "scope" WHEN 'GLOBAL' THEN 'GLOBAL' WHEN 'COUNTRY' THEN "countryNodeId" ELSE "projectId" END;

-- Previously uniqueness was per organisation; now it is per scope. Keep the
-- oldest copy of any document that would now collide (chunks cascade).
DELETE FROM "RagDocument" newer
USING "RagDocument" older
WHERE newer."scope" = older."scope"
  AND newer."scopeKey" = older."scopeKey"
  AND newer."contentHash" = older."contentHash"
  AND (newer."createdAt", newer."id") > (older."createdAt", older."id");

ALTER TABLE "RagDocument" ALTER COLUMN "scopeKey" SET NOT NULL;

ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_scope_check"
  CHECK ("scope" IN ('GLOBAL', 'COUNTRY', 'PROJECT'));
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_scope_project_check"
  CHECK (("scope" = 'PROJECT') = ("projectId" IS NOT NULL));

-- Older databases hold this as a UNIQUE constraint, newer ones as a unique index.
ALTER TABLE "RagDocument" DROP CONSTRAINT IF EXISTS "RagDocument_organisationId_countryNodeId_contentHash_key";
DROP INDEX IF EXISTS "RagDocument_organisationId_countryNodeId_contentHash_key";
CREATE UNIQUE INDEX "RagDocument_scope_scopeKey_contentHash_key" ON "RagDocument"("scope", "scopeKey", "contentHash");
CREATE INDEX "RagDocument_scope_countryNodeId_approvalStatus_status_idx" ON "RagDocument"("scope", "countryNodeId", "approvalStatus", "status");
