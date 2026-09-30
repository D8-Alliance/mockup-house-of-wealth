-- Standardise RAG embeddings on 768 dimensions (Ollama nomic-embed-text, or
-- OpenAI text-embedding-3-* with dimensions=768) and switch to an HNSW index,
-- which, unlike ivfflat, needs no training data and suits a growing corpus.
-- Existing vectors (if any) are from an incompatible 1536-dimension model and
-- are cleared; POST /ai/rag/embeddings/backfill regenerates them.

DROP INDEX IF EXISTS "RagChunk_embedding_idx";

ALTER TABLE "RagChunk" ALTER COLUMN "embedding" TYPE vector(768) USING NULL;

-- Managed only here: Prisma cannot express pgvector indexes. Never accept a
-- generated migration that drops it.
CREATE INDEX "RagChunk_embedding_idx" ON "RagChunk" USING hnsw ("embedding" vector_cosine_ops);
