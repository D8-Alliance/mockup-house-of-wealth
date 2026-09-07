-- CreateTable
CREATE TABLE "PdpApplication" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "organisationName" TEXT NOT NULL,
    "pdpType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "kybStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "payload" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdpApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdpApplication_applicationNumber_key" ON "PdpApplication"("applicationNumber");

-- CreateIndex
CREATE INDEX "PdpApplication_userId_idx" ON "PdpApplication"("userId");

-- CreateIndex
CREATE INDEX "PdpApplication_countryCode_status_idx" ON "PdpApplication"("countryCode", "status");
