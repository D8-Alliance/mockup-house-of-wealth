-- Akad (Shariah contract) terms per pool, and the investor's acceptance of them.
-- The profit-sharing ratio is fixed in the terms before anyone invests; distributions
-- use it instead of a percentage chosen at distribution time.
CREATE TABLE "PoolAkadTerms" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "akadType" TEXT NOT NULL,
  "investorProfitSharePct" DECIMAL(5,2) NOT NULL,
  "termsText" TEXT NOT NULL,
  "termsHash" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PoolAkadTerms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PoolAkadTerms_poolId_version_key" ON "PoolAkadTerms"("poolId", "version");
ALTER TABLE "PoolAkadTerms" ADD CONSTRAINT "PoolAkadTerms_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WealthPool"("poolId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Accepted terms must stay exactly as accepted: a change means a new version.
CREATE OR REPLACE FUNCTION block_pool_akad_terms_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'PoolAkadTerms is append-only: publish a new version instead';
END;
$$;

CREATE TRIGGER pool_akad_terms_no_update BEFORE UPDATE ON "PoolAkadTerms" FOR EACH ROW EXECUTE FUNCTION block_pool_akad_terms_mutation();
CREATE TRIGGER pool_akad_terms_no_delete BEFORE DELETE ON "PoolAkadTerms" FOR EACH ROW EXECUTE FUNCTION block_pool_akad_terms_mutation();

-- Ijab and qabul: which terms the investor accepted, their hash, and when. Null for older orders.
ALTER TABLE "InvestmentOrder" ADD COLUMN "akadTermsId" TEXT;
ALTER TABLE "InvestmentOrder" ADD COLUMN "akadTermsHash" TEXT;
ALTER TABLE "InvestmentOrder" ADD COLUMN "akadAcceptedAt" TIMESTAMP(3);
ALTER TABLE "InvestmentOrder" ADD CONSTRAINT "InvestmentOrder_akadTermsId_fkey" FOREIGN KEY ("akadTermsId") REFERENCES "PoolAkadTerms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "InvestmentOrder_akadTermsId_idx" ON "InvestmentOrder"("akadTermsId");

-- The ratio a distribution actually used, and the terms it came from.
ALTER TABLE "Distribution" ADD COLUMN "akadTermsId" TEXT;
ALTER TABLE "Distribution" ADD COLUMN "investorProfitSharePct" DECIMAL(5,2);
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_akadTermsId_fkey" FOREIGN KEY ("akadTermsId") REFERENCES "PoolAkadTerms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
