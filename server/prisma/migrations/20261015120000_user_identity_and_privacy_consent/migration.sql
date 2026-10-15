-- Who the account belongs to, and the country it was registered in (fixed).
ALTER TABLE "User" ADD COLUMN "userType" TEXT NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE "User" ADD COLUMN "homeCountryNodeId" TEXT;

-- Existing accounts: home country from their first active role; type from the roles they hold.
UPDATE "User" u SET "homeCountryNodeId" = a."countryNodeId"
FROM (SELECT DISTINCT ON ("userId") "userId", "countryNodeId" FROM "UserRoleAssignment" WHERE "isActive" ORDER BY "userId", "assignedAt") a
WHERE a."userId" = u.id;

UPDATE "User" u SET "userType" = 'INSTITUTION'
WHERE EXISTS (SELECT 1 FROM "UserRoleAssignment" r WHERE r."userId" = u.id AND r."isActive"
  AND r.role::text IN ('Project_Sponsor', 'Project_Manager', 'Asset_Owner', 'Asset_Manager', 'Institutional_Investor', 'Corporate_Investor', 'Family_Office', 'Organization_Admin'));

UPDATE "User" u SET "userType" = 'PLATFORM_STAFF'
WHERE EXISTS (SELECT 1 FROM "UserRoleAssignment" r WHERE r."userId" = u.id AND r."isActive"
  AND r.role::text NOT IN ('Project_Sponsor', 'Project_Manager', 'Asset_Owner', 'Asset_Manager', 'Institutional_Investor', 'Corporate_Investor', 'Family_Office', 'Organization_Admin', 'Retail_Investor', 'HNWI_Investor', 'Guest'));

-- Evidence of accepting each version of the privacy notice (PDPA).
CREATE TABLE "PrivacyConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "PrivacyConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PrivacyConsent_userId_noticeVersion_key" ON "PrivacyConsent"("userId", "noticeVersion");
ALTER TABLE "PrivacyConsent" ADD CONSTRAINT "PrivacyConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
