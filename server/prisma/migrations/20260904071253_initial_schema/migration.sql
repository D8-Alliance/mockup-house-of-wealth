-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Super_Admin', 'Country_Admin', 'Organization_Admin', 'Project_Sponsor', 'Project_Manager', 'Asset_Owner', 'Asset_Manager', 'Pool_Manager', 'Retail_Investor', 'HNWI_Investor', 'Institutional_Investor', 'Corporate_Investor', 'Family_Office', 'Portfolio_Manager', 'Shariah_Advisor', 'Shariah_Reviewer', 'Shariah_Committee', 'Compliance_Officer', 'KYC_Officer', 'KYB_Officer', 'AML_Officer', 'Risk_Officer', 'Fraud_Analyst', 'Legal_Officer', 'Finance_Officer', 'Treasury_Officer', 'Settlement_Officer', 'Reconciliation_Officer', 'Auditor', 'Customer_Support', 'System_Administrator', 'Security_Administrator', 'Data_Administrator', 'AI_Administrator', 'AI_Model_Reviewer', 'Guest');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "idpProvider" TEXT NOT NULL,
    "idpSubjectId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryNode" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "regulatoryProfile" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "verificationStatus" TEXT NOT NULL,
    "activeOrganisationsCount" INTEGER NOT NULL DEFAULT 0,
    "activeUsersCount" INTEGER NOT NULL DEFAULT 0,
    "activeProjectsCount" INTEGER NOT NULL DEFAULT 0,
    "activePoolsCount" INTEGER NOT NULL DEFAULT 0,
    "flagUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryNode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "projectId" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "totalProjectCost" DECIMAL(18,2) NOT NULL,
    "sponsorContribution" DECIMAL(18,2) NOT NULL,
    "fundingRequired" DECIMAL(18,2) NOT NULL,
    "proposedShariahContract" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "projectSponsorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "WealthPool" (
    "poolId" TEXT NOT NULL,
    "poolName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "investmentStructure" TEXT NOT NULL,
    "indicativeExpectedReturn" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WealthPool_pkey" PRIMARY KEY ("poolId")
);

-- CreateTable
CREATE TABLE "FundingRequest" (
    "fundingRequestId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "poolId" TEXT,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "purpose" TEXT NOT NULL DEFAULT 'Project funding',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "disbursedBy" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingRequest_pkey" PRIMARY KEY ("fundingRequestId")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "organisationId" TEXT,
    "countryNodeId" TEXT,
    "result" TEXT NOT NULL DEFAULT 'Success',
    "metadata" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_idpProvider_idpSubjectId_key" ON "User"("idpProvider", "idpSubjectId");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_role_idx" ON "UserRoleAssignment"("role");

-- CreateIndex
CREATE INDEX "UserRoleAssignment_countryNodeId_idx" ON "UserRoleAssignment"("countryNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleAssignment_userId_role_organisationId_countryNodeId_key" ON "UserRoleAssignment"("userId", "role", "organisationId", "countryNodeId");

-- CreateIndex
CREATE INDEX "Organisation_countryNodeId_idx" ON "Organisation"("countryNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "Project_countryNodeId_idx" ON "Project"("countryNodeId");

-- CreateIndex
CREATE INDEX "Project_organisationId_idx" ON "Project"("organisationId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "WealthPool_countryNodeId_idx" ON "WealthPool"("countryNodeId");

-- CreateIndex
CREATE INDEX "WealthPool_projectId_idx" ON "WealthPool"("projectId");

-- CreateIndex
CREATE INDEX "FundingRequest_countryNodeId_idx" ON "FundingRequest"("countryNodeId");

-- CreateIndex
CREATE INDEX "FundingRequest_projectId_idx" ON "FundingRequest"("projectId");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_idx" ON "AuditEvent"("userId");

-- CreateIndex
CREATE INDEX "AuditEvent_action_idx" ON "AuditEvent"("action");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditEvent_countryNodeId_idx" ON "AuditEvent"("countryNodeId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleAssignment" ADD CONSTRAINT "UserRoleAssignment_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organisation" ADD CONSTRAINT "Organisation_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthPool" ADD CONSTRAINT "WealthPool_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthPool" ADD CONSTRAINT "WealthPool_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthPool" ADD CONSTRAINT "WealthPool_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WealthPool"("poolId") ON DELETE SET NULL ON UPDATE CASCADE;

-- Append-only audit log guard
CREATE OR REPLACE FUNCTION block_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'AuditEvent is append-only: UPDATE and DELETE are forbidden';
END;
$$;

CREATE TRIGGER audit_log_no_update
    BEFORE UPDATE ON "AuditEvent"
    FOR EACH ROW
    EXECUTE FUNCTION block_audit_log_mutation();

CREATE TRIGGER audit_log_no_delete
    BEFORE DELETE ON "AuditEvent"
    FOR EACH ROW
    EXECUTE FUNCTION block_audit_log_mutation();

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
