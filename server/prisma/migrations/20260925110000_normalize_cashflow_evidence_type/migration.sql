-- A project may already hold both a legacy CASHFLOW_PROJECTION row and a
-- CASHFLOW_FORECAST row; renaming blindly would violate the
-- (projectId, evidenceType) unique index. Keep the row that carries an
-- uploaded document, preferring the CASHFLOW_FORECAST row when both or
-- neither do.
DELETE FROM "ProjectEvidenceRequirement" f
USING "ProjectEvidenceRequirement" p
WHERE f."projectId" = p."projectId"
  AND f."evidenceType" = 'CASHFLOW_FORECAST'
  AND p."evidenceType" = 'CASHFLOW_PROJECTION'
  AND f."uploadedDocumentId" IS NULL
  AND p."uploadedDocumentId" IS NOT NULL;

DELETE FROM "ProjectEvidenceRequirement" p
USING "ProjectEvidenceRequirement" f
WHERE p."projectId" = f."projectId"
  AND p."evidenceType" = 'CASHFLOW_PROJECTION'
  AND f."evidenceType" = 'CASHFLOW_FORECAST';

UPDATE "ProjectEvidenceRequirement"
SET "evidenceType" = 'CASHFLOW_FORECAST'
WHERE "evidenceType" = 'CASHFLOW_PROJECTION';
