-- Feasibility runs created before 20260930120000_add_feasibility_governance have no
-- ProjectFeasibilityRevision, so reviewing them failed with "revision is missing".
-- Create a revision for each such run, renumber every affected project's revisions
-- by creation time (so an old run never becomes the "latest" revision), and turn the
-- run's stored review history into ProjectApproval rows.

-- 1. Revisions for runs that have none. Temporary numbers stay clear of real ones.
INSERT INTO "ProjectFeasibilityRevision" ("id", "projectId", "organisationId", "countryNodeId", "aiRunId", "revisionNumber", "status", "createdBy", "createdAt")
SELECT
  'backfill-' || r."id",
  p."projectId",
  p."organisationId",
  p."countryNodeId",
  r."id",
  1000000 + ROW_NUMBER() OVER (PARTITION BY p."projectId" ORDER BY r."createdAt", r."id"),
  'PENDING_HUMAN_REVIEW',
  r."userId",
  r."createdAt"
FROM "AiRun" r
JOIN "Project" p ON p."projectId" = r."input"->>'projectId'
WHERE r."featureKey" = 'project_feasibility'
  AND NOT EXISTS (SELECT 1 FROM "ProjectFeasibilityRevision" f WHERE f."aiRunId" = r."id");

-- 2. Renumber affected projects 1..n by creation time. Going through negative values
--    keeps the (projectId, revisionNumber) unique index satisfied at every row.
CREATE TEMP TABLE "_feasibility_renumber" ON COMMIT DROP AS
SELECT f."id",
       ROW_NUMBER() OVER (PARTITION BY f."projectId" ORDER BY f."createdAt", f."id") AS "revisionNumber",
       LAG(f."id") OVER (PARTITION BY f."projectId" ORDER BY f."createdAt", f."id") AS "supersedesRevisionId"
FROM "ProjectFeasibilityRevision" f
WHERE f."projectId" IN (SELECT "projectId" FROM "ProjectFeasibilityRevision" WHERE "id" LIKE 'backfill-%');

UPDATE "ProjectFeasibilityRevision" f SET "revisionNumber" = -n."revisionNumber"
FROM "_feasibility_renumber" n WHERE n."id" = f."id";

UPDATE "ProjectFeasibilityRevision" f SET "revisionNumber" = -f."revisionNumber", "supersedesRevisionId" = n."supersedesRevisionId"
FROM "_feasibility_renumber" n WHERE n."id" = f."id";

-- 3. Approvals from each backfilled run's review history (the AI's own entry has no status).
INSERT INTO "ProjectApproval" ("id", "projectId", "revisionId", "organisationId", "countryNodeId", "stage", "status", "decision", "reviewerId", "reviewerRole", "comment", "supportingEvidence", "decidedAt")
SELECT
  'backfill-' || r."id" || '-' || e.ordinality,
  f."projectId",
  f."id",
  f."organisationId",
  f."countryNodeId",
  e.entry->>'stage',
  COALESCE(e.entry->>'status', CASE e.entry->>'decision' WHEN 'REJECTED' THEN 'REJECTED' WHEN 'REQUEST_CHANGES' THEN 'REQUEST_CHANGES' ELSE 'APPROVED' END),
  e.entry->>'decision',
  COALESCE(e.entry->>'reviewerId', e.entry->>'reviewer', 'unknown'),
  COALESCE(e.entry->>'reviewerRole', 'unknown'),
  COALESCE(e.entry->>'comment', ''),
  COALESCE(e.entry->'supportingEvidence', '[]'::jsonb),
  CASE WHEN e.entry->>'date' ~ '^\d{4}-\d{2}-\d{2}T' THEN ((e.entry->>'date')::timestamptz AT TIME ZONE 'UTC') ELSE r."createdAt" END
FROM "ProjectFeasibilityRevision" f
JOIN "AiRun" r ON r."id" = f."aiRunId"
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(r."reviewHistory") = 'array' THEN r."reviewHistory" ELSE '[]'::jsonb END) WITH ORDINALITY AS e(entry, ordinality)
WHERE f."id" LIKE 'backfill-%'
  AND e.entry->>'stage' IS NOT NULL
  AND e.entry->>'decision' IS NOT NULL
  AND e.entry->>'decision' <> 'AI_RECOMMENDATION';

-- 4. Only the latest revision of a project carries active decisions...
UPDATE "ProjectApproval" a SET "status" = 'SUPERSEDED', "supersededAt" = COALESCE(a."supersededAt", CURRENT_TIMESTAMP)
FROM "ProjectFeasibilityRevision" f
WHERE a."revisionId" = f."id"
  AND a."status" <> 'SUPERSEDED'
  AND EXISTS (SELECT 1 FROM "ProjectFeasibilityRevision" newer WHERE newer."projectId" = f."projectId" AND newer."revisionNumber" > f."revisionNumber");

-- ...and only one decision per stage of a revision (the most recent) stays active.
UPDATE "ProjectApproval" a SET "status" = 'SUPERSEDED', "supersededAt" = COALESCE(a."supersededAt", CURRENT_TIMESTAMP)
WHERE a."status" <> 'SUPERSEDED'
  AND EXISTS (
    SELECT 1 FROM "ProjectApproval" later
    WHERE later."revisionId" = a."revisionId" AND later."stage" = a."stage" AND later."status" <> 'SUPERSEDED'
      AND (later."decidedAt" > a."decidedAt" OR (later."decidedAt" = a."decidedAt" AND later."id" > a."id"))
  );

-- 5. Enforce it from now on: at most one active decision per revision and stage.
CREATE UNIQUE INDEX "ProjectApproval_active_revision_stage_key" ON "ProjectApproval"("revisionId", "stage") WHERE "status" <> 'SUPERSEDED';
