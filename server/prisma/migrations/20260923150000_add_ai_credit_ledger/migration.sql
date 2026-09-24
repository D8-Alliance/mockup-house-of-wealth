CREATE TABLE "AiCreditTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "operationKey" TEXT,
  "targetEntity" TEXT,
  "credits" INTEGER NOT NULL,
  "balanceBefore" INTEGER NOT NULL,
  "balanceAfter" INTEGER NOT NULL,
  "amountMYR" DECIMAL(18,2),
  "paymentMethod" TEXT,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCreditTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiCreditTransaction_userId_createdAt_idx" ON "AiCreditTransaction"("userId", "createdAt");
CREATE INDEX "AiCreditTransaction_type_createdAt_idx" ON "AiCreditTransaction"("type", "createdAt");
ALTER TABLE "AiCreditTransaction" ADD CONSTRAINT "AiCreditTransaction_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MembershipSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
