ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

CREATE TABLE "NotificationOutbox" (
  "id" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "channels" TEXT NOT NULL DEFAULT 'IN_APP',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationOutbox_dedupeKey_key" ON "NotificationOutbox"("dedupeKey");
CREATE INDEX "NotificationOutbox_status_nextAttemptAt_idx" ON "NotificationOutbox"("status", "nextAttemptAt");
CREATE INDEX "NotificationOutbox_recipientUserId_createdAt_idx" ON "NotificationOutbox"("recipientUserId", "createdAt");

CREATE TABLE "JobRun" (
  "id" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JobRun_idempotencyKey_key" ON "JobRun"("idempotencyKey");
CREATE INDEX "JobRun_jobName_startedAt_idx" ON "JobRun"("jobName", "startedAt");
CREATE INDEX "JobRun_status_startedAt_idx" ON "JobRun"("status", "startedAt");
