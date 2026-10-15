CREATE TABLE "AiCreditWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "subscriptionPlan" TEXT NOT NULL,
    "monthlyAllowance" INTEGER NOT NULL DEFAULT 0,
    "purchasedCredits" INTEGER NOT NULL DEFAULT 0,
    "bonusCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "resetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiCreditWallet_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCreditWallet_userId_organisationId_key" ON "AiCreditWallet"("userId", "organisationId");
CREATE INDEX "AiCreditWallet_organisationId_updatedAt_idx" ON "AiCreditWallet"("organisationId", "updatedAt");

CREATE TABLE "AiCapabilityPricing" (
    "id" TEXT NOT NULL,
    "operationKey" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "creditsRequired" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiCapabilityPricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCapabilityPricing_operationKey_key" ON "AiCapabilityPricing"("operationKey");

CREATE TABLE "AiUsageTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "featureType" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "creditsConsumed" INTEGER NOT NULL,
    "projectId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    CONSTRAINT "AiUsageTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageTransaction_userId_timestamp_idx" ON "AiUsageTransaction"("userId", "timestamp");
CREATE INDEX "AiUsageTransaction_organisationId_timestamp_idx" ON "AiUsageTransaction"("organisationId", "timestamp");
CREATE INDEX "AiUsageTransaction_featureType_timestamp_idx" ON "AiUsageTransaction"("featureType", "timestamp");

INSERT INTO "AiCapabilityPricing" ("id", "operationKey", "featureType", "operationName", "creditsRequired", "updatedAt") VALUES
('cap_simple_query', 'SIMPLE_QUERY', 'AI_QUERY', 'AI Query', 1, CURRENT_TIMESTAMP),
('cap_project_summary', 'PROJECT_SUMMARY', 'PROJECT', 'Project Summary', 5, CURRENT_TIMESTAMP),
('cap_full_feasibility', 'FULL_FEASIBILITY_ANALYSIS', 'PROJECT_FEASIBILITY', 'Full Feasibility Analysis', 20, CURRENT_TIMESTAMP),
('cap_investment_analysis', 'INVESTMENT_ANALYSIS', 'INVESTMENT', 'Investment Analysis', 30, CURRENT_TIMESTAMP),
('cap_risk_analysis', 'RISK_ANALYSIS', 'RISK', 'Risk Analysis', 15, CURRENT_TIMESTAMP),
('cap_contract_analysis', 'CONTRACT_ANALYSIS', 'CONTRACT', 'Contract Analysis', 20, CURRENT_TIMESTAMP),
('cap_due_diligence', 'DUE_DILIGENCE', 'DUE_DILIGENCE', 'Due Diligence', 30, CURRENT_TIMESTAMP),
('cap_full_intelligence', 'FULL_PROJECT_INTELLIGENCE', 'PROJECT_INTELLIGENCE', 'Full Project Intelligence', 100, CURRENT_TIMESTAMP)
ON CONFLICT ("operationKey") DO NOTHING;
