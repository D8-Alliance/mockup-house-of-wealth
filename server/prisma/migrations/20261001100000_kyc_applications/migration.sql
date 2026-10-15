-- Individual KYC applications reviewed manually by KYC officers.

-- CreateTable
CREATE TABLE "KycApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "dateOfBirth" TIMESTAMP(3),
    "nationality" TEXT NOT NULL DEFAULT '',
    "idDocumentType" TEXT NOT NULL DEFAULT '',
    "idDocumentNumber" TEXT NOT NULL DEFAULT '',
    "residentialAddress" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "kycLevel" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycReview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "kycLevel" TEXT,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycApplication_applicationNumber_key" ON "KycApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "KycApplication_userId_createdAt_idx" ON "KycApplication"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KycApplication_countryNodeId_status_submittedAt_idx" ON "KycApplication"("countryNodeId", "status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KycDocument_applicationId_documentType_key" ON "KycDocument"("applicationId", "documentType");

-- CreateIndex
CREATE INDEX "KycReview_applicationId_createdAt_idx" ON "KycReview"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycReview" ADD CONSTRAINT "KycReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "KycApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;



ALTER TABLE "KycApplication" ADD CONSTRAINT "KycApplication_status_check" CHECK ("status" IN ('DRAFT', 'SUBMITTED', 'RESUBMISSION_REQUIRED', 'APPROVED', 'REJECTED'));
ALTER TABLE "KycApplication" ADD CONSTRAINT "KycApplication_kycLevel_check" CHECK ("kycLevel" IS NULL OR "kycLevel" IN ('LEVEL_1', 'LEVEL_2', 'LEVEL_3'));
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_documentType_check" CHECK ("documentType" IN ('ID_FRONT', 'ID_BACK', 'PASSPORT', 'SELFIE', 'PROOF_OF_ADDRESS'));
ALTER TABLE "KycReview" ADD CONSTRAINT "KycReview_decision_check" CHECK ("decision" IN ('APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'));

-- At most one open (not yet decided) application per user. Not expressible in schema.prisma.
CREATE UNIQUE INDEX "KycApplication_userId_open_key" ON "KycApplication"("userId") WHERE "status" IN ('DRAFT', 'SUBMITTED', 'RESUBMISSION_REQUIRED');
