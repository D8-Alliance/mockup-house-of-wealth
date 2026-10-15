ALTER TABLE "AiRun" ADD COLUMN "reviewStage" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "AiRun" ADD COLUMN "reviewHistory" JSONB;
CREATE INDEX "AiRun_featureKey_reviewStage_idx" ON "AiRun"("featureKey", "reviewStage");
