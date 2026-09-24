ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "lifecycleVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "ProjectMilestone" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetDate" TIMESTAMP(3),
  "completionPct" INTEGER NOT NULL DEFAULT 0,
  "disbursementAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'UPCOMING',
  "shariahSignoff" BOOLEAN NOT NULL DEFAULT false,
  "auditorSignoff" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectMilestone_projectId_status_idx" ON "ProjectMilestone"("projectId", "status");
CREATE INDEX "ProjectMilestone_organisationId_countryNodeId_idx" ON "ProjectMilestone"("organisationId", "countryNodeId");
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ProjectLifecycleEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "note" TEXT,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectLifecycleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectLifecycleEvent_projectId_createdAt_idx" ON "ProjectLifecycleEvent"("projectId", "createdAt");
CREATE INDEX "ProjectLifecycleEvent_organisationId_countryNodeId_createdAt_idx" ON "ProjectLifecycleEvent"("organisationId", "countryNodeId", "createdAt");
ALTER TABLE "ProjectLifecycleEvent" ADD CONSTRAINT "ProjectLifecycleEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectLifecycleEvent" ADD CONSTRAINT "ProjectLifecycleEvent_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectLifecycleEvent" ADD CONSTRAINT "ProjectLifecycleEvent_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
