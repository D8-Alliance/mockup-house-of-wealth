-- Duties within an organisation (accounts, statement of account, collection, field, legal) and rent collection cases.
CREATE TABLE "OrganisationDuty" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duty" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganisationDuty_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganisationDuty_organisationId_userId_duty_key" ON "OrganisationDuty"("organisationId", "userId", "duty");
CREATE INDEX "OrganisationDuty_organisationId_duty_idx" ON "OrganisationDuty"("organisationId", "duty");

CREATE TABLE "RentCollectionCase" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "ownerOrganisationId" TEXT NOT NULL,
    "tenantOrganisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "actionDueAt" TIMESTAMP(3) NOT NULL,
    "history" JSONB NOT NULL,
    "followUps" JSONB NOT NULL DEFAULT '[]',
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentCollectionCase_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RentCollectionCase_paymentId_key" ON "RentCollectionCase"("paymentId");
CREATE INDEX "RentCollectionCase_ownerOrganisationId_stage_idx" ON "RentCollectionCase"("ownerOrganisationId", "stage");
CREATE INDEX "RentCollectionCase_leaseId_idx" ON "RentCollectionCase"("leaseId");
