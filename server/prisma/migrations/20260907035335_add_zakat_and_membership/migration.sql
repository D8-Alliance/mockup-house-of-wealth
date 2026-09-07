-- CreateTable
CREATE TABLE "ZakatCalculation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "investedCapital" DECIMAL(18,2) NOT NULL,
    "liquidCash" DECIMAL(18,2) NOT NULL,
    "debtsOwed" DECIMAL(18,2) NOT NULL,
    "nisabThreshold" DECIMAL(18,2) NOT NULL,
    "zakatRate" DECIMAL(5,4) NOT NULL,
    "netWealth" DECIMAL(18,2) NOT NULL,
    "zakatDue" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZakatCalculation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethodSummary" TEXT NOT NULL DEFAULT 'Simulated Payment Gateway',
    "aiCreditsRemaining" INTEGER NOT NULL,
    "aiCreditsTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipBillingRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "amountMYR" DECIMAL(18,2) NOT NULL,
    "amountUSD" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Paid',
    "paymentMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipBillingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZakatCalculation_userId_createdAt_idx" ON "ZakatCalculation"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipSubscription_userId_key" ON "MembershipSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipBillingRecord_invoiceNumber_key" ON "MembershipBillingRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "MembershipBillingRecord_userId_createdAt_idx" ON "MembershipBillingRecord"("userId", "createdAt");
