-- AI assistant citations (snapshotted sources per answer) and RAG document versioning.
-- RagChunk_embedding_idx is intentionally untouched (managed only in SQL migrations).


-- AlterTable
ALTER TABLE "RagDocument" ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "supersededById" TEXT;

-- CreateTable
CREATE TABLE "AiCitation" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "marker" INTEGER NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "chunkId" TEXT,
    "documentId" TEXT,
    "documentTitle" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "paragraphRefs" JSONB,
    "quote" TEXT,
    "quoteVerified" BOOLEAN NOT NULL DEFAULT false,
    "excerpt" TEXT NOT NULL,
    "retrievalScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiCitation_documentId_createdAt_idx" ON "AiCitation"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCitation_chunkId_idx" ON "AiCitation"("chunkId");

-- CreateIndex
CREATE UNIQUE INDEX "AiCitation_messageId_marker_key" ON "AiCitation"("messageId", "marker");

-- CreateIndex
CREATE INDEX "RagDocument_supersededById_idx" ON "RagDocument"("supersededById");

-- AddForeignKey
ALTER TABLE "AiCitation" ADD CONSTRAINT "AiCitation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCitation" ADD CONSTRAINT "AiCitation_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "RagChunk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCitation" ADD CONSTRAINT "AiCitation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "RagDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "RagDocument" ADD CONSTRAINT "RagDocument_not_self_superseded_check" CHECK ("supersededById" IS NULL OR "supersededById" <> "id");
