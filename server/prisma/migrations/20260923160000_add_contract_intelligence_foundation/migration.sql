CREATE TABLE "ContractTemplate" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "contractType" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL,
  "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContractTemplate_scope_type_name_version_key" ON "ContractTemplate"("organisationId", "countryNodeId", "contractType", "templateName", "version");
CREATE INDEX "ContractTemplate_scope_type_approval_idx" ON "ContractTemplate"("organisationId", "countryNodeId", "contractType", "approvalStatus");
CREATE INDEX "ContractTemplate_jurisdiction_industry_idx" ON "ContractTemplate"("jurisdiction", "industry");
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_org_country_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractClause" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "templateId" TEXT,
  "contractType" TEXT NOT NULL,
  "clauseCategory" TEXT NOT NULL,
  "clauseTitle" TEXT NOT NULL,
  "clauseText" TEXT NOT NULL,
  "shariahReference" TEXT,
  "jurisdiction" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL,
  "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractClause_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContractClause_scope_type_approval_idx" ON "ContractClause"("organisationId", "countryNodeId", "contractType", "approvalStatus");
CREATE INDEX "ContractClause_template_idx" ON "ContractClause"("templateId");
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_org_country_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_template_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContractClause" ADD CONSTRAINT "ContractClause_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ContractInputSchema" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "contractType" TEXT NOT NULL,
  "schemaName" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "requiredFields" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL,
  "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractInputSchema_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContractInputSchema_scope_type_name_version_key" ON "ContractInputSchema"("organisationId", "countryNodeId", "contractType", "schemaName", "version");
CREATE INDEX "ContractInputSchema_scope_type_approval_idx" ON "ContractInputSchema"("organisationId", "countryNodeId", "contractType", "approvalStatus");
ALTER TABLE "ContractInputSchema" ADD CONSTRAINT "ContractInputSchema_org_country_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractInputSchema" ADD CONSTRAINT "ContractInputSchema_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractInputSchema" ADD CONSTRAINT "ContractInputSchema_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ShariahRule" (
  "id" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "contractType" TEXT NOT NULL,
  "ruleName" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "validationLogic" TEXT NOT NULL,
  "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdBy" TEXT NOT NULL,
  "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShariahRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShariahRule_scope_type_name_key" ON "ShariahRule"("organisationId", "countryNodeId", "contractType", "ruleName");
CREATE INDEX "ShariahRule_scope_type_severity_approval_idx" ON "ShariahRule"("organisationId", "countryNodeId", "contractType", "severity", "approvalStatus");
ALTER TABLE "ShariahRule" ADD CONSTRAINT "ShariahRule_org_country_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShariahRule" ADD CONSTRAINT "ShariahRule_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShariahRule" ADD CONSTRAINT "ShariahRule_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DocumentVersion" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdBy" TEXT NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvedBy" TEXT,
  "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentVersion_document_version_key" ON "DocumentVersion"("documentId", "version");
CREATE INDEX "DocumentVersion_scope_status_idx" ON "DocumentVersion"("organisationId", "countryNodeId", "reviewStatus");
CREATE INDEX "DocumentVersion_document_created_idx" ON "DocumentVersion"("documentId", "createdDate");
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_document_fkey" FOREIGN KEY ("documentId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_org_country_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_country_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_approver_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
