-- Utility (electricity and water) and renovation deposits on leasable units and leases, and who pays the utilities.
ALTER TABLE "LeasableUnit" ADD COLUMN     "renovationDeposit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "utilitiesPaidBy" TEXT NOT NULL DEFAULT 'TENANT_DIRECT',
ADD COLUMN     "utilityDepositMonths" DECIMAL(4,1) NOT NULL DEFAULT 1;

-- Units listed before this change keep the terms they were offered on: no utility deposit until the owner sets one.
UPDATE "LeasableUnit" SET "utilityDepositMonths" = 0;

ALTER TABLE "AssetLease" ADD COLUMN     "depositRefunds" JSONB,
ADD COLUMN     "renovationDepositAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "utilitiesPaidBy" TEXT NOT NULL DEFAULT 'TENANT_DIRECT',
ADD COLUMN     "utilityDepositAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- A security deposit refunded before this change becomes the first entry of the list of refunds.
UPDATE "AssetLease"
SET "depositRefunds" = jsonb_build_array("depositRefund" || jsonb_build_object('kind', 'SECURITY', 'paidAt', to_char("depositReturnedAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
WHERE "depositRefund" IS NOT NULL;

ALTER TABLE "AssetLease" DROP COLUMN "depositRefund";
