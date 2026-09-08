-- Enforce that tenant-owned rows cannot pair an organisation with another node.
CREATE UNIQUE INDEX "Organisation_id_countryNodeId_key"
  ON "Organisation" ("id", "countryNodeId");

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_organisation_country_fkey"
  FOREIGN KEY ("organisationId", "countryNodeId")
  REFERENCES "Organisation" ("id", "countryNodeId");

ALTER TABLE "WealthPool"
  ADD CONSTRAINT "WealthPool_organisation_country_fkey"
  FOREIGN KEY ("organisationId", "countryNodeId")
  REFERENCES "Organisation" ("id", "countryNodeId");

ALTER TABLE "FundingRequest"
  ADD CONSTRAINT "FundingRequest_organisation_country_fkey"
  FOREIGN KEY ("organisationId", "countryNodeId")
  REFERENCES "Organisation" ("id", "countryNodeId");

CREATE TABLE "Contract" (
  "id" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "contractType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contract_contractNumber_key" ON "Contract" ("contractNumber");
CREATE INDEX "Contract_organisationId_countryNodeId_idx" ON "Contract" ("organisationId", "countryNodeId");
CREATE INDEX "Contract_status_idx" ON "Contract" ("status");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organisation_country_fkey"
  FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation" ("id", "countryNodeId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_countryNode_fkey"
  FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode" ("code");

CREATE TABLE "ContractVersion" (
  "id" TEXT NOT NULL, "contractId" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "content" JSONB NOT NULL, "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdBy" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContractVersion_contractId_version_key" ON "ContractVersion" ("contractId", "version");
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contract_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE;

CREATE TABLE "ContractParty" (
  "id" TEXT NOT NULL, "contractId" TEXT NOT NULL, "partyType" TEXT NOT NULL,
  "displayName" TEXT NOT NULL, "userId" TEXT, "organisationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractParty_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractParty_contractId_idx" ON "ContractParty" ("contractId");
ALTER TABLE "ContractParty" ADD CONSTRAINT "ContractParty_contract_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE;

CREATE TABLE "ContractApproval" (
  "id" TEXT NOT NULL, "contractId" TEXT NOT NULL, "versionId" TEXT NOT NULL,
  "approverId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decisionNote" TEXT, "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractApproval_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractApproval_contractId_status_idx" ON "ContractApproval" ("contractId", "status");
ALTER TABLE "ContractApproval" ADD CONSTRAINT "ContractApproval_contract_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE;
ALTER TABLE "ContractApproval" ADD CONSTRAINT "ContractApproval_version_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ContractVersion" ("id") ON DELETE CASCADE;

CREATE TABLE "ContractEvent" (
  "id" TEXT NOT NULL, "contractId" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "fromStatus" TEXT, "toStatus" TEXT, "actorId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractEvent_contractId_createdAt_idx" ON "ContractEvent" ("contractId", "createdAt");
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contract_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE;

CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL,
  "activeRole" "UserRole", "countryNodeId" TEXT NOT NULL, "organisationId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session" ("tokenHash");
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session" ("userId", "revokedAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session" ("expiresAt");
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_fkey"
  FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE;
