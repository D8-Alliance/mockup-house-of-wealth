-- Quarterly project performance reports (PDP submits, auditor verifies, investors read).
CREATE TABLE "ProjectPerformanceReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "revenueActual" DECIMAL(18,2) NOT NULL,
    "revenueProjected" DECIMAL(18,2) NOT NULL,
    "costActual" DECIMAL(18,2) NOT NULL,
    "costProjected" DECIMAL(18,2) NOT NULL,
    "profitDistributed" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "milestonesOnTimePct" INTEGER NOT NULL,
    "budgetUsedPct" INTEGER NOT NULL,
    "shariahIncidents" INTEGER NOT NULL DEFAULT 0,
    "auditFindings" TEXT NOT NULL DEFAULT '',
    "sectorKpis" JSONB NOT NULL DEFAULT '[]',
    "commentary" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectPerformanceReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectPerformanceReport_projectId_year_quarter_key" ON "ProjectPerformanceReport"("projectId", "year", "quarter");
CREATE INDEX "ProjectPerformanceReport_countryNodeId_status_idx" ON "ProjectPerformanceReport"("countryNodeId", "status");
