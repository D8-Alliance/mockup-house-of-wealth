-- A pool's minimum raise and closing date; a pool below its minimum at closing refunds its investors.
ALTER TABLE "WealthPool" ADD COLUMN "minimumRaise" DECIMAL(18,2),
  ADD COLUMN "closesAt" TIMESTAMP(3),
  ADD COLUMN "fundraisingEndedAt" TIMESTAMP(3);

ALTER TABLE "InvestmentOrder" ADD COLUMN "refundReference" TEXT,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "refundedBy" TEXT;
