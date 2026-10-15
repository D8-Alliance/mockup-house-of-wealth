CREATE TABLE "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organisationId" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "productType" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "amountMYR" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "provider" TEXT NOT NULL DEFAULT 'TOYYIBPAY',
  "providerBillCode" TEXT,
  "providerTransactionId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'INITIATED',
  "metadata" JSONB,
  "paidAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentTransaction_providerBillCode_key" ON "PaymentTransaction"("providerBillCode");
CREATE INDEX "PaymentTransaction_userId_createdAt_idx" ON "PaymentTransaction"("userId", "createdAt");
CREATE INDEX "PaymentTransaction_organisationId_countryNodeId_createdAt_idx" ON "PaymentTransaction"("organisationId", "countryNodeId", "createdAt");
CREATE INDEX "PaymentTransaction_productType_productId_idx" ON "PaymentTransaction"("productType", "productId");
CREATE INDEX "PaymentTransaction_status_createdAt_idx" ON "PaymentTransaction"("status", "createdAt");
