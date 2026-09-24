INSERT INTO "User" ("id", "idpProvider", "idpSubjectId", "email", "name", "isActive", "createdAt", "updatedAt")
VALUES
  ('USR-AHMAD-PDP', 'mock', 'USR-AHMAD-PDP', 'ahmad.pdp@felda.gov.my', 'Ahmad Razak (PDP Lead)', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('USR-TARIQ-PDP', 'mock', 'USR-TARIQ-PDP', 'tariq.pdp@mycapital.my', 'Tariq Al-Mansoor', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('USR-MEHMET-PDP', 'mock', 'USR-MEHMET-PDP', 'mehmet.pdp@istanbultech.tr', 'Mehmet Yilmaz', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('USR-ZUBDA-PDP', 'mock', 'USR-ZUBDA-PDP', 'zubda.pdp@myruralagri.my', 'Zubda Khan', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('USR-IBRAHIM-PDP', 'mock', 'USR-IBRAHIM-PDP', 'ibrahim.pdp@lagoswaqf.ng', 'Ibrahim Bello', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "email" = EXCLUDED."email",
  "name" = EXCLUDED."name",
  "isActive" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "UserRoleAssignment" ("id", "userId", "role", "organisationId", "countryNodeId", "assignedBy", "assignedAt", "isActive", "createdAt", "updatedAt")
VALUES
  ('ROLE-USR-AHMAD-PDP-SPONSOR', 'USR-AHMAD-PDP', 'Project_Sponsor', 'ORG-FELDA-MYS', 'CN-MYS', 'USR-SYS-001', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ROLE-USR-TARIQ-PDP-SPONSOR', 'USR-TARIQ-PDP', 'Project_Sponsor', 'ORG-MYS-P2-CAP', 'CN-MYS', 'USR-SYS-001', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ROLE-USR-MEHMET-PDP-SPONSOR', 'USR-MEHMET-PDP', 'Project_Sponsor', 'ORG-TURK-LOG', 'CN-TUR', 'USR-SYS-001', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ROLE-USR-ZUBDA-PDP-SPONSOR', 'USR-ZUBDA-PDP', 'Project_Sponsor', 'ORG-MYS-P2-AGRI', 'CN-MYS', 'USR-SYS-001', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ROLE-USR-IBRAHIM-PDP-SPONSOR', 'USR-IBRAHIM-PDP', 'Project_Sponsor', 'ORG-NGA-WAQF', 'CN-NGA', 'USR-SYS-001', CURRENT_TIMESTAMP, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("userId", "role", "organisationId", "countryNodeId") DO UPDATE SET
  "isActive" = true,
  "revokedBy" = NULL,
  "revokedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Project" ADD CONSTRAINT "Project_projectSponsorId_fkey" FOREIGN KEY ("projectSponsorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
