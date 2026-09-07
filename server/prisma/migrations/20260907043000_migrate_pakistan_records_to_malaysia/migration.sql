-- Move operational Pakistan records into the existing Malaysia tenant.
-- Historical AuditEvent rows are intentionally not rewritten because the audit
-- trigger makes them append-only.
BEGIN;

UPDATE "UserRoleAssignment" SET "countryNodeId" = 'CN-MYS' WHERE "countryNodeId" = 'CN-PAK';
UPDATE "Organisation" SET "countryNodeId" = 'CN-MYS' WHERE "countryNodeId" = 'CN-PAK';
UPDATE "Project" SET "countryNodeId" = 'CN-MYS' WHERE "countryNodeId" = 'CN-PAK';
UPDATE "WealthPool" SET "countryNodeId" = 'CN-MYS' WHERE "countryNodeId" = 'CN-PAK';
UPDATE "FundingRequest" SET "countryNodeId" = 'CN-MYS' WHERE "countryNodeId" = 'CN-PAK';
UPDATE "PdpApplication" SET "countryCode" = 'MYS', "countryName" = 'Malaysia' WHERE "countryCode" = 'PAK';

INSERT INTO "Organisation" ("id", "name", "countryNodeId", "status", "createdAt", "updatedAt")
SELECT 'ORG-MYS-P2-CAP', 'Malaysian Sovereign Capital', 'CN-MYS', "status", "createdAt", now()
FROM "Organisation" WHERE "id" = 'ORG-GULF-CAP'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Organisation" ("id", "name", "countryNodeId", "status", "createdAt", "updatedAt")
SELECT 'ORG-MYS-P2-FO', 'Malaysian Family Office', 'CN-MYS', "status", "createdAt", now()
FROM "Organisation" WHERE "id" = 'ORG-EMIRATES-FO'
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Organisation" ("id", "name", "countryNodeId", "status", "createdAt", "updatedAt")
SELECT 'ORG-MYS-P2-AGRI', 'Malaysian Rural Agribusiness', 'CN-MYS', "status", "createdAt", now()
FROM "Organisation" WHERE "id" = 'ORG-PAK-AGRI'
ON CONFLICT ("id") DO NOTHING;

UPDATE "UserRoleAssignment" SET "organisationId" = 'ORG-MYS-P2-CAP' WHERE "organisationId" = 'ORG-GULF-CAP';
UPDATE "UserRoleAssignment" SET "organisationId" = 'ORG-MYS-P2-FO' WHERE "organisationId" = 'ORG-EMIRATES-FO';
UPDATE "UserRoleAssignment" SET "organisationId" = 'ORG-MYS-P2-AGRI' WHERE "organisationId" = 'ORG-PAK-AGRI';
UPDATE "Project" SET "organisationId" = 'ORG-MYS-P2-CAP' WHERE "organisationId" = 'ORG-GULF-CAP';
UPDATE "Project" SET "organisationId" = 'ORG-MYS-P2-FO' WHERE "organisationId" = 'ORG-EMIRATES-FO';
UPDATE "Project" SET "organisationId" = 'ORG-MYS-P2-AGRI' WHERE "organisationId" = 'ORG-PAK-AGRI';
UPDATE "WealthPool" SET "organisationId" = 'ORG-MYS-P2-CAP' WHERE "organisationId" = 'ORG-GULF-CAP';
UPDATE "WealthPool" SET "organisationId" = 'ORG-MYS-P2-FO' WHERE "organisationId" = 'ORG-EMIRATES-FO';
UPDATE "WealthPool" SET "organisationId" = 'ORG-MYS-P2-AGRI' WHERE "organisationId" = 'ORG-PAK-AGRI';
UPDATE "FundingRequest" SET "organisationId" = 'ORG-MYS-P2-CAP' WHERE "organisationId" = 'ORG-GULF-CAP';
UPDATE "FundingRequest" SET "organisationId" = 'ORG-MYS-P2-FO' WHERE "organisationId" = 'ORG-EMIRATES-FO';
UPDATE "FundingRequest" SET "organisationId" = 'ORG-MYS-P2-AGRI' WHERE "organisationId" = 'ORG-PAK-AGRI';

UPDATE "User"
SET "id" = 'USR-MYS-P2-001', "idpSubjectId" = 'MYS-P2-001', "email" = replace("email", '.pk', '.my'),
    "profile" = replace(replace(replace(replace("profile"::text, 'USR-PAK-001', 'USR-MYS-P2-001'), 'ORG-GULF-CAP', 'ORG-MYS-P2-CAP'), 'CN-PAK', 'CN-MYS'), 'Pakistan', 'Malaysia')::jsonb
WHERE "id" = 'USR-PAK-001';

UPDATE "User"
SET "id" = 'USR-MYS-P2-002', "idpSubjectId" = 'MYS-P2-002', "email" = replace("email", '.pk', '.my'),
    "profile" = replace(replace(replace(replace("profile"::text, 'USR-PAK-002', 'USR-MYS-P2-002'), 'ORG-EMIRATES-FO', 'ORG-MYS-P2-FO'), 'CN-PAK', 'CN-MYS'), 'Pakistan', 'Malaysia')::jsonb
WHERE "id" = 'USR-PAK-002';

UPDATE "UserRoleAssignment" SET "assignedBy" = 'USR-MYS-P2-001' WHERE "assignedBy" = 'USR-PAK-001';
UPDATE "UserRoleAssignment" SET "assignedBy" = 'USR-MYS-P2-002' WHERE "assignedBy" = 'USR-PAK-002';
UPDATE "Project" SET "projectSponsorId" = 'USR-MYS-P2-001' WHERE "projectSponsorId" = 'USR-PAK-001';
UPDATE "Project" SET "projectSponsorId" = 'USR-MYS-P2-002' WHERE "projectSponsorId" = 'USR-PAK-002';

UPDATE "Project"
SET "projectId" = 'PROJ-MYS-P2-002', "projectCode" = 'MYS-P2-SOLAR-2026',
    "projectName" = replace("projectName", 'Pakistan', 'Malaysia'),
    "description" = replace("description", 'Pakistan', 'Malaysia')
WHERE "projectId" = 'PROJ-PAK-002';

UPDATE "Project"
SET "projectId" = 'PROJ-MYS-P2-004', "projectCode" = 'MYS-P2-AGRI-2026',
    "projectName" = replace("projectName", 'Punjab', 'Selangor'),
    "description" = replace("description", 'Pakistan', 'Malaysia')
WHERE "projectId" = 'PROJ-PAK-004';

UPDATE "WealthPool"
SET "poolId" = 'POOL-MYS-P2-001', "poolName" = replace("poolName", 'Quaid-e-Azam', 'Malaysia Solar')
WHERE "poolId" = 'POOL-PAK-001';

UPDATE "Organisation" SET "name" = 'Malaysia Legacy Capital Records' WHERE "id" = 'ORG-GULF-CAP';
UPDATE "Organisation" SET "name" = 'Malaysia Legacy Family Office Records' WHERE "id" = 'ORG-EMIRATES-FO';
UPDATE "Organisation" SET "name" = 'Malaysia Legacy Agribusiness Records' WHERE "id" = 'ORG-PAK-AGRI';

UPDATE "CountryNode"
SET "name" = 'Malaysia Legacy Node', "currency" = 'MYR', "timezone" = 'Asia/Kuala_Lumpur',
    "regulatoryProfile" = 'Bank Negara Malaysia / Securities Commission Malaysia', "status" = 'DEACTIVATED'
WHERE "code" = 'CN-PAK';

COMMIT;
