-- Who reviewed a PDP application, why, and the applicant's organisation for notifications.
ALTER TABLE "PdpApplication" ADD COLUMN "organisationId" TEXT;
ALTER TABLE "PdpApplication" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "PdpApplication" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "PdpApplication" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "PdpApplication" ADD COLUMN "history" JSONB NOT NULL DEFAULT '[]';
