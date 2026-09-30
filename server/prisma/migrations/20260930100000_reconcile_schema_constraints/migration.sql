-- Reconciles hand-written migrations with schema.prisma:
--  * renames constraints/indexes to Prisma default names
--  * replaces duplicate single-column Organisation FKs on Project/WealthPool with the composite tenant FK
--  * adds the missing FundingRequest -> CountryNode FK
--  * aligns FK referential actions with the schema (ON UPDATE CASCADE)
-- RagChunk_embedding_idx (pgvector ivfflat) is intentionally kept: Prisma cannot express it.

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_countryNode_fkey";

-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_organisation_country_fkey";

-- DropForeignKey
ALTER TABLE "ContractApproval" DROP CONSTRAINT "ContractApproval_contract_fkey";

-- DropForeignKey
ALTER TABLE "ContractApproval" DROP CONSTRAINT "ContractApproval_version_fkey";

-- DropForeignKey
ALTER TABLE "ContractEvent" DROP CONSTRAINT "ContractEvent_contract_fkey";

-- DropForeignKey
ALTER TABLE "ContractParty" DROP CONSTRAINT "ContractParty_contract_fkey";

-- DropForeignKey
ALTER TABLE "ContractVersion" DROP CONSTRAINT "ContractVersion_contract_fkey";

-- DropForeignKey
ALTER TABLE "FundingRequest" DROP CONSTRAINT "FundingRequest_organisation_country_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_organisation_country_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_user_fkey";

-- DropForeignKey
ALTER TABLE "ShariahDecision" DROP CONSTRAINT "ShariahDecision_review_fkey";

-- DropForeignKey
ALTER TABLE "ShariahReview" DROP CONSTRAINT "ShariahReview_countryNode_fkey";

-- DropForeignKey
ALTER TABLE "ShariahReview" DROP CONSTRAINT "ShariahReview_organisation_country_fkey";

-- DropForeignKey
ALTER TABLE "ShariahReview" DROP CONSTRAINT "ShariahReview_project_fkey";

-- DropForeignKey
ALTER TABLE "WealthPool" DROP CONSTRAINT "WealthPool_organisationId_fkey";

-- DropForeignKey
ALTER TABLE "WealthPool" DROP CONSTRAINT "WealthPool_organisation_country_fkey";


-- RenameForeignKey
ALTER TABLE "ContractClause" RENAME CONSTRAINT "ContractClause_country_fkey" TO "ContractClause_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractClause" RENAME CONSTRAINT "ContractClause_creator_fkey" TO "ContractClause_createdBy_fkey";

-- RenameForeignKey
ALTER TABLE "ContractClause" RENAME CONSTRAINT "ContractClause_org_country_fkey" TO "ContractClause_organisationId_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractClause" RENAME CONSTRAINT "ContractClause_template_fkey" TO "ContractClause_templateId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractInputSchema" RENAME CONSTRAINT "ContractInputSchema_country_fkey" TO "ContractInputSchema_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractInputSchema" RENAME CONSTRAINT "ContractInputSchema_creator_fkey" TO "ContractInputSchema_createdBy_fkey";

-- RenameForeignKey
ALTER TABLE "ContractInputSchema" RENAME CONSTRAINT "ContractInputSchema_org_country_fkey" TO "ContractInputSchema_organisationId_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractTemplate" RENAME CONSTRAINT "ContractTemplate_country_fkey" TO "ContractTemplate_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ContractTemplate" RENAME CONSTRAINT "ContractTemplate_creator_fkey" TO "ContractTemplate_createdBy_fkey";

-- RenameForeignKey
ALTER TABLE "ContractTemplate" RENAME CONSTRAINT "ContractTemplate_org_country_fkey" TO "ContractTemplate_organisationId_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "DocumentVersion" RENAME CONSTRAINT "DocumentVersion_approver_fkey" TO "DocumentVersion_approvedBy_fkey";

-- RenameForeignKey
ALTER TABLE "DocumentVersion" RENAME CONSTRAINT "DocumentVersion_country_fkey" TO "DocumentVersion_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "DocumentVersion" RENAME CONSTRAINT "DocumentVersion_creator_fkey" TO "DocumentVersion_createdBy_fkey";

-- RenameForeignKey
ALTER TABLE "DocumentVersion" RENAME CONSTRAINT "DocumentVersion_document_fkey" TO "DocumentVersion_documentId_fkey";

-- RenameForeignKey
ALTER TABLE "DocumentVersion" RENAME CONSTRAINT "DocumentVersion_org_country_fkey" TO "DocumentVersion_organisationId_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ShariahRule" RENAME CONSTRAINT "ShariahRule_country_fkey" TO "ShariahRule_countryNodeId_fkey";

-- RenameForeignKey
ALTER TABLE "ShariahRule" RENAME CONSTRAINT "ShariahRule_creator_fkey" TO "ShariahRule_createdBy_fkey";

-- RenameForeignKey
ALTER TABLE "ShariahRule" RENAME CONSTRAINT "ShariahRule_org_country_fkey" TO "ShariahRule_organisationId_countryNodeId_fkey";

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WealthPool" ADD CONSTRAINT "WealthPool_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShariahReview" ADD CONSTRAINT "ShariahReview_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShariahDecision" ADD CONSTRAINT "ShariahDecision_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ShariahReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractVersion" ADD CONSTRAINT "ContractVersion_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractParty" ADD CONSTRAINT "ContractParty_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractApproval" ADD CONSTRAINT "ContractApproval_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractApproval" ADD CONSTRAINT "ContractApproval_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ContractVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractEvent" ADD CONSTRAINT "ContractEvent_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ContractClause_scope_type_approval_idx" RENAME TO "ContractClause_organisationId_countryNodeId_contractType_ap_idx";

-- RenameIndex
ALTER INDEX "ContractClause_template_idx" RENAME TO "ContractClause_templateId_idx";

-- RenameIndex
ALTER INDEX "ContractInputSchema_scope_type_approval_idx" RENAME TO "ContractInputSchema_organisationId_countryNodeId_contractTy_idx";

-- RenameIndex
ALTER INDEX "ContractInputSchema_scope_type_name_version_key" RENAME TO "ContractInputSchema_organisationId_countryNodeId_contractTy_key";

-- RenameIndex
ALTER INDEX "ContractTemplate_scope_type_approval_idx" RENAME TO "ContractTemplate_organisationId_countryNodeId_contractType__idx";

-- RenameIndex
ALTER INDEX "ContractTemplate_scope_type_name_version_key" RENAME TO "ContractTemplate_organisationId_countryNodeId_contractType__key";

-- RenameIndex
ALTER INDEX "DocumentVersion_document_created_idx" RENAME TO "DocumentVersion_documentId_createdDate_idx";

-- RenameIndex
ALTER INDEX "DocumentVersion_document_version_key" RENAME TO "DocumentVersion_documentId_version_key";

-- RenameIndex
ALTER INDEX "DocumentVersion_scope_status_idx" RENAME TO "DocumentVersion_organisationId_countryNodeId_reviewStatus_idx";

-- RenameIndex
ALTER INDEX "ProjectDueDiligenceScan_organisationId_countryNodeId_createdAt_" RENAME TO "ProjectDueDiligenceScan_organisationId_countryNodeId_create_idx";

-- RenameIndex
ALTER INDEX "ProjectLifecycleEvent_organisationId_countryNodeId_createdAt_id" RENAME TO "ProjectLifecycleEvent_organisationId_countryNodeId_createdA_idx";

-- RenameIndex
ALTER INDEX "RagDocument_islamic_metadata_idx" RENAME TO "RagDocument_organisationId_countryNodeId_contractType_juris_idx";

-- RenameIndex
ALTER INDEX "ShariahRule_scope_type_name_key" RENAME TO "ShariahRule_organisationId_countryNodeId_contractType_ruleN_key";

-- RenameIndex
ALTER INDEX "ShariahRule_scope_type_severity_approval_idx" RENAME TO "ShariahRule_organisationId_countryNodeId_contractType_sever_idx";

