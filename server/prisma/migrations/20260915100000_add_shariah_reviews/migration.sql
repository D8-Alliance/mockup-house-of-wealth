CREATE TABLE "ShariahReview" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "proposedContract" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "aiResult" JSONB,
  "confidence" DECIMAL(5,2),
  "createdBy" TEXT NOT NULL,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShariahReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShariahReview_projectId_idx" ON "ShariahReview" ("projectId");
CREATE INDEX "ShariahReview_organisationId_countryNodeId_idx" ON "ShariahReview" ("organisationId", "countryNodeId");
CREATE INDEX "ShariahReview_status_idx" ON "ShariahReview" ("status");
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_project_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project" ("projectId");
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_organisation_country_fkey"
  FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation" ("id", "countryNodeId");
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_countryNode_fkey"
  FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode" ("code");

CREATE TABLE "ShariahDecision" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "justification" TEXT,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShariahDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ShariahDecision_reviewId_createdAt_idx" ON "ShariahDecision" ("reviewId", "createdAt");
ALTER TABLE "ShariahDecision" ADD CONSTRAINT "ShariahDecision_review_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "ShariahReview" ("id") ON DELETE CASCADE;
