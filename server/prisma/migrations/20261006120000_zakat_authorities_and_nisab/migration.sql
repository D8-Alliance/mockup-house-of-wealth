-- State zakat authorities and their published nisab values, so calculations use the
-- user's own authority and the nisab in force on the calculation date, with its source.
CREATE TABLE "ZakatAuthority" (
  "code" TEXT NOT NULL,
  "countryNodeId" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "website" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZakatAuthority_pkey" PRIMARY KEY ("code")
);
CREATE INDEX "ZakatAuthority_countryNodeId_idx" ON "ZakatAuthority"("countryNodeId");
ALTER TABLE "ZakatAuthority" ADD CONSTRAINT "ZakatAuthority_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ZakatNisabRate" (
  "id" TEXT NOT NULL,
  "authorityCode" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "effectiveFrom" DATE NOT NULL,
  "effectiveTo" DATE NOT NULL,
  "source" TEXT NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ZakatNisabRate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZakatNisabRate_period_check" CHECK ("effectiveFrom" <= "effectiveTo"),
  CONSTRAINT "ZakatNisabRate_amount_check" CHECK ("amount" > 0)
);
CREATE INDEX "ZakatNisabRate_authorityCode_effectiveFrom_idx" ON "ZakatNisabRate"("authorityCode", "effectiveFrom");
ALTER TABLE "ZakatNisabRate" ADD CONSTRAINT "ZakatNisabRate_authorityCode_fkey" FOREIGN KEY ("authorityCode") REFERENCES "ZakatAuthority"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- What a calculation used: authority, nisab record, year basis and the itemised lines.
ALTER TABLE "ZakatCalculation" ADD COLUMN "authorityCode" TEXT;
ALTER TABLE "ZakatCalculation" ADD COLUMN "nisabRateId" TEXT;
ALTER TABLE "ZakatCalculation" ADD COLUMN "nisabSource" TEXT;
ALTER TABLE "ZakatCalculation" ADD COLUMN "yearBasis" TEXT;
ALTER TABLE "ZakatCalculation" ADD COLUMN "asOfDate" DATE;
ALTER TABLE "ZakatCalculation" ADD COLUMN "lines" JSONB;

-- Official channels checked on 2026-10-06. Other authorities are added by an administrator.
INSERT INTO "ZakatAuthority" ("code", "countryNodeId", "region", "name", "website")
SELECT v.code, v.country, v.region, v.name, v.website
FROM (VALUES
  ('MY-SGR', 'CN-MYS', 'Selangor', 'Lembaga Zakat Selangor (LZS)', 'https://www.zakatselangor.com.my'),
  ('MY-WP', 'CN-MYS', 'Wilayah Persekutuan', 'Pusat Pungutan Zakat MAIWP (PPZ-MAIWP)', 'https://www.zakat.com.my'),
  ('MY-PHG', 'CN-MYS', 'Pahang', 'Pusat Kutipan Zakat Pahang', 'https://zakatpahang.my'),
  ('MY-KDH', 'CN-MYS', 'Kedah', 'Lembaga Zakat Negeri Kedah (LZNK)', 'https://www.lznk.com.my'),
  ('MY-PRK', 'CN-MYS', 'Perak', 'Zakat Perak (MAIPk)', 'https://zapar.com.my'),
  ('MY-SWK', 'CN-MYS', 'Sarawak', 'Tabung Baitulmal Sarawak', 'https://www.tbs.org.my')
) AS v(code, country, region, name, website)
WHERE EXISTS (SELECT 1 FROM "CountryNode" c WHERE c."code" = v.country);

-- Selangor nisab published by LZS for 2026.
INSERT INTO "ZakatNisabRate" ("id", "authorityCode", "amount", "currency", "effectiveFrom", "effectiveTo", "source", "createdBy")
SELECT v.id, 'MY-SGR', v.amount, 'MYR', v.f::date, v.t::date, v.source, 'SYSTEM-MIGRATION'
FROM (VALUES
  ('nisab-my-sgr-2026h1', 42047.00, '2026-01-01', '2026-06-30', 'Lembaga Zakat Selangor, kadar nisab Januari-Jun 2026 (RM42,047)'),
  ('nisab-my-sgr-2026h2', 38748.00, '2026-07-01', '2026-12-31', 'Lembaga Zakat Selangor, kadar nisab Julai-Disember 2026 (RM38,748)')
) AS v(id, amount, f, t, source)
WHERE EXISTS (SELECT 1 FROM "ZakatAuthority" a WHERE a."code" = 'MY-SGR');
