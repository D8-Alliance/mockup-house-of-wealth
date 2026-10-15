-- What the owner sees for each payout account (the full number stays encrypted), and which one they prefer.
ALTER TABLE "PayoutDestination" ADD COLUMN "accountHolder" TEXT;
ALTER TABLE "PayoutDestination" ADD COLUMN "maskedReference" TEXT;
ALTER TABLE "PayoutDestination" ADD COLUMN "currency" TEXT;
ALTER TABLE "PayoutDestination" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
