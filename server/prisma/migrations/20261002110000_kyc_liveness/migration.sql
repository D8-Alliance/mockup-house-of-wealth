-- CreateTable
CREATE TABLE "KycLivenessSession" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "stepStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycLivenessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycLivenessFrame" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "metrics" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycLivenessFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycLivenessSession_applicationId_createdAt_idx" ON "KycLivenessSession"("applicationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycLivenessFrame_sessionId_step_key" ON "KycLivenessFrame"("sessionId", "step");

-- AddForeignKey
ALTER TABLE "KycLivenessSession" ADD CONSTRAINT "KycLivenessSession_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycLivenessFrame" ADD CONSTRAINT "KycLivenessFrame_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "KycLivenessSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
