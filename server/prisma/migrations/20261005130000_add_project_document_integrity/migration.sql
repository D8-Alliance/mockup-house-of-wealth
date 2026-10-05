-- Evidence tamper signals: the SHA-256 recorded at upload (so later changes to the
-- stored file are detectable) and the advisory PDF inspection result.
ALTER TABLE "ProjectDocument" ADD COLUMN "sha256" TEXT;
ALTER TABLE "ProjectDocument" ADD COLUMN "integrity" JSONB;

-- Existing documents: hash what is stored now. Their PDF inspection runs at the next analysis.
UPDATE "ProjectDocument" SET "sha256" = encode(sha256("fileContent"), 'hex') WHERE "sha256" IS NULL;

CREATE INDEX "ProjectDocument_sha256_idx" ON "ProjectDocument"("sha256");
