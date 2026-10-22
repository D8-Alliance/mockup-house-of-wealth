-- Platform e-signature (phase 1): a one-time code per signature, and the sealed, time-stamped final PDF.
CREATE TABLE "SignatureChallenge" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "codeHash" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignatureChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SignatureChallenge_contractId_userId_idx" ON "SignatureChallenge"("contractId", "userId");

CREATE TABLE "SignedAgreementDocument" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "pdf" BYTEA NOT NULL,
  "sha256" TEXT NOT NULL,
  "sealedAt" TIMESTAMP(3) NOT NULL,
  "sealCertSha256" TEXT NOT NULL,
  "timestampToken" TEXT,
  "timestampAt" TIMESTAMP(3),
  "timestampAuthority" TEXT,
  "timestampSerial" TEXT,
  "integrityStatus" TEXT NOT NULL DEFAULT 'SEALED',
  "integrityCheckedAt" TIMESTAMP(3),
  "integrityNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SignedAgreementDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SignedAgreementDocument_contractId_key" ON "SignedAgreementDocument"("contractId");
ALTER TABLE "SignedAgreementDocument" ADD CONSTRAINT "SignedAgreementDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContractParty" ADD COLUMN "signatureMethod" TEXT;
ALTER TABLE "ContractParty" ADD COLUMN "otpChannel" TEXT;
