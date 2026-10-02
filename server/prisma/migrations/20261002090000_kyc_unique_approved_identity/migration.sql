-- One identity document can be verified for only one account.
-- Expression index (not representable in schema.prisma): the number is compared as
-- upper-case letters and digits only, matching normalizeIdNumber() in src/kyc/kyc-workflow.ts.
CREATE UNIQUE INDEX "KycApplication_approved_identity_key"
  ON "KycApplication" ("idDocumentType", upper(regexp_replace("idDocumentNumber", '[^A-Za-z0-9]', '', 'g')))
  WHERE status = 'APPROVED';
