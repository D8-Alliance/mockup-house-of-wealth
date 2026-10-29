-- A new pool starts as DRAFT and needs Shariah, compliance, risk and authorised sign-offs
-- before it is APPROVED and can open. Existing pools keep their status.
ALTER TABLE "WealthPool" ADD COLUMN "shariahApprovedBy" TEXT,
ADD COLUMN "shariahApprovedAt" TIMESTAMP(3),
ADD COLUMN "complianceApprovedBy" TEXT,
ADD COLUMN "complianceApprovedAt" TIMESTAMP(3),
ADD COLUMN "riskApprovedBy" TEXT,
ADD COLUMN "riskApprovedAt" TIMESTAMP(3),
ADD COLUMN "authorisedApprovedBy" TEXT,
ADD COLUMN "authorisedApprovedAt" TIMESTAMP(3);
