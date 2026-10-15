-- Human review of AI assistant citations (Citation Audit).
-- RagChunk_embedding_idx is intentionally untouched (managed only in SQL migrations).


-- AlterTable
ALTER TABLE "AiCitation" ADD COLUMN     "reviewComment" TEXT,
ADD COLUMN     "reviewStatus" TEXT NOT NULL DEFAULT 'UNREVIEWED',
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "AiCitation_reviewStatus_createdAt_idx" ON "AiCitation"("reviewStatus", "createdAt");


ALTER TABLE "AiCitation" ADD CONSTRAINT "AiCitation_reviewStatus_check" CHECK ("reviewStatus" IN ('UNREVIEWED', 'CONFIRMED', 'INCORRECT', 'IRRELEVANT'));
