-- Risk register, incidents and the fatwa repository (Admin Center).
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "ownerName" TEXT NOT NULL,
    "mitigation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reviewDue" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RiskItem_countryNodeId_status_idx" ON "RiskItem"("countryNodeId", "status");

CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reportedBy" TEXT NOT NULL,
    "history" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Incident_countryNodeId_status_idx" ON "Incident"("countryNodeId", "status");

CREATE TABLE "FatwaResolution" (
    "id" TEXT NOT NULL,
    "countryNodeId" TEXT,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "topic" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FatwaResolution_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FatwaResolution_countryNodeId_status_idx" ON "FatwaResolution"("countryNodeId", "status");
