-- Advisory automated KYC checks (src/kyc/checks). Results inform officers; they never change application status.

-- AlterTable
ALTER TABLE "KycApplication" ADD COLUMN     "checkReasons" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "checkRecommendation" TEXT,
ADD COLUMN     "checksUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "idDocumentExpiry" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KycCheckResult" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "checkType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "identity" JSONB,
    "externalRef" TEXT,
    "shadow" BOOLEAN NOT NULL DEFAULT false,
    "agree" BOOLEAN,
    "raw" JSONB,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "KycCheckResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycCheckResult_provider_externalRef_key" ON "KycCheckResult"("provider", "externalRef");

-- CreateIndex
CREATE INDEX "KycCheckResult_applicationId_round_checkType_idx" ON "KycCheckResult"("applicationId", "round", "checkType");

-- AddForeignKey
ALTER TABLE "KycCheckResult" ADD CONSTRAINT "KycCheckResult_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "KycApplication" ADD CONSTRAINT "KycApplication_checkRecommendation_check" CHECK ("checkRecommendation" IS NULL OR "checkRecommendation" IN ('CLEAR', 'ATTENTION', 'ADVERSE', 'PENDING'));
ALTER TABLE "KycCheckResult" ADD CONSTRAINT "KycCheckResult_status_check" CHECK ("status" IN ('PASS', 'FAIL', 'REVIEW', 'PENDING', 'ERROR', 'SKIPPED'));
