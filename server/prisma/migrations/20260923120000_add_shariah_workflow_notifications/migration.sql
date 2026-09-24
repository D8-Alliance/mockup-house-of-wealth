ALTER TABLE "ShariahReview" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ShariahReview" ADD COLUMN "parentReviewId" TEXT;
ALTER TABLE "ShariahReview" ADD COLUMN "requestedChanges" TEXT;
ALTER TABLE "ShariahReview" ADD COLUMN "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "ShariahReview_projectId_status_idx" ON "ShariahReview"("projectId", "status");
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_parentReviewId_fkey" FOREIGN KEY ("parentReviewId") REFERENCES "ShariahReview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_recipientUserId_readAt_createdAt_idx" ON "Notification"("recipientUserId", "readAt", "createdAt");
CREATE INDEX "Notification_organisationId_countryNodeId_createdAt_idx" ON "Notification"("organisationId", "countryNodeId", "createdAt");
