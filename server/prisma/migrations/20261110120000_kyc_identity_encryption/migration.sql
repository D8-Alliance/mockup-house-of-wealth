-- The KYC identity document number is stored encrypted; a keyed hash and the last four characters sit beside it.
ALTER TABLE "KycApplication" ADD COLUMN "idDocumentNumberHash" TEXT,
  ADD COLUMN "idDocumentNumberLast4" TEXT;

CREATE INDEX "KycApplication_idDocumentNumberHash_idx" ON "KycApplication"("idDocumentNumberHash");
CREATE INDEX "KycApplication_idDocumentNumberLast4_idx" ON "KycApplication"("idDocumentNumberLast4");

-- One identity document can be verified for only one account, compared by hash once the number is encrypted.
-- The older index on the plain number stays for rows not yet converted by scripts/encrypt-kyc-identity.ts.
CREATE UNIQUE INDEX "KycApplication_approved_identity_hash_key"
  ON "KycApplication" ("idDocumentType", "idDocumentNumberHash")
  WHERE status = 'APPROVED' AND "idDocumentNumberHash" IS NOT NULL;
