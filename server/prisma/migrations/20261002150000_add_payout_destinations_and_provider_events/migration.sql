ALTER TABLE "DistributionAllocation" ADD COLUMN "destinationId" TEXT;

CREATE TABLE "PayoutDestination" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "destinationType" TEXT NOT NULL,
  "encryptedReference" TEXT NOT NULL,
  "destinationHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "verifiedBy" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "cooldownUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutDestination_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutDestination_ownerUserId_status_idx" ON "PayoutDestination"("ownerUserId", "status");
CREATE INDEX "PayoutDestination_organisationId_countryNodeId_idx" ON "PayoutDestination"("organisationId", "countryNodeId");

ALTER TABLE "PayoutInstruction" ADD COLUMN "destinationId" TEXT;

CREATE TABLE "PayoutProviderEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT NOT NULL,
  "payoutInstructionId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "PayoutProviderEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PayoutProviderEvent_provider_providerEventId_key" ON "PayoutProviderEvent"("provider", "providerEventId");
CREATE INDEX "PayoutProviderEvent_payoutInstructionId_receivedAt_idx" ON "PayoutProviderEvent"("payoutInstructionId", "receivedAt");

ALTER TABLE "DistributionAllocation" ADD CONSTRAINT "DistributionAllocation_destination_fkey" FOREIGN KEY ("destinationId") REFERENCES "PayoutDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_destination_fkey" FOREIGN KEY ("destinationId") REFERENCES "PayoutDestination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayoutProviderEvent" ADD CONSTRAINT "PayoutProviderEvent_payoutInstruction_fkey" FOREIGN KEY ("payoutInstructionId") REFERENCES "PayoutInstruction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
