CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE "AiConversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "title" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiConversation_userId_updatedAt_idx" ON "AiConversation"("userId", "updatedAt");
CREATE INDEX "AiConversation_organisationId_countryNodeId_updatedAt_idx" ON "AiConversation"("organisationId", "countryNodeId", "updatedAt");

CREATE TABLE "AiMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

CREATE TABLE "AiRun" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "conversationId" TEXT,
  "input" JSONB NOT NULL,
  "output" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiRun_requestId_key" UNIQUE ("requestId"),
  CONSTRAINT "AiRun_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AiRun_organisationId_countryNodeId_createdAt_idx" ON "AiRun"("organisationId", "countryNodeId", "createdAt");
CREATE INDEX "AiRun_userId_createdAt_idx" ON "AiRun"("userId", "createdAt");
CREATE INDEX "AiRun_featureKey_status_idx" ON "AiRun"("featureKey", "status");

CREATE TABLE "AiDecision" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "justification" TEXT,
  "reviewerId" TEXT NOT NULL,
  "reviewerRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiDecision_runId_key" UNIQUE ("runId"),
  CONSTRAINT "AiDecision_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RagDocument" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RagDocument_organisationId_countryNodeId_contentHash_key" UNIQUE ("organisationId", "countryNodeId", "contentHash")
);
CREATE INDEX "RagDocument_organisationId_countryNodeId_status_idx" ON "RagDocument"("organisationId", "countryNodeId", "status");

CREATE TABLE "RagChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "embedding" vector(1536),
  CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RagChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RagChunk_documentId_chunkIndex_key" UNIQUE ("documentId", "chunkIndex")
);
CREATE INDEX "RagChunk_documentId_idx" ON "RagChunk"("documentId");
CREATE INDEX "RagChunk_embedding_idx" ON "RagChunk" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 10);
