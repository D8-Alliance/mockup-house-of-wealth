-- Remaining Malaysian state councils (official websites checked on 2026-10-06), and nisab
-- values confirmed on the authorities' own sites. Kedah, Pahang and Perak nisab values are
-- not recorded: their published values had no clear effective period, or could not be
-- confirmed on the official site.
INSERT INTO "ZakatAuthority" ("code", "countryNodeId", "region", "name", "website")
SELECT v.code, 'CN-MYS', v.region, v.name, v.website
FROM (VALUES
  ('MY-JHR', 'Johor', 'Majlis Agama Islam Negeri Johor (MAIJ)', 'https://www.maij.gov.my'),
  ('MY-MLK', 'Melaka', 'Majlis Agama Islam Melaka (MAIM)', 'https://www.maim.gov.my'),
  ('MY-NSN', 'Negeri Sembilan', 'Majlis Agama Islam Negeri Sembilan (MAINS)', 'https://www.mains.gov.my'),
  ('MY-PNG', 'Pulau Pinang', 'Zakat Majlis Agama Islam Negeri Pulau Pinang (MAINPP)', 'https://zakat.mainpp.gov.my'),
  ('MY-KTN', 'Kelantan', 'Majlis Agama Islam dan Adat Istiadat Melayu Kelantan (MAIK)', 'https://www.e-maik.my'),
  ('MY-TRG', 'Terengganu', 'Majlis Agama Islam dan Adat Melayu Terengganu (MAIDAM)', 'https://www.maidam.gov.my'),
  ('MY-PLS', 'Perlis', 'Majlis Agama Islam dan Adat Istiadat Melayu Perlis (MAIPs)', 'https://www.maips.gov.my'),
  ('MY-SBH', 'Sabah', 'Majlis Ugama Islam Sabah (MUIS)', 'https://muis.sabah.gov.my')
) AS v(code, region, name, website)
WHERE EXISTS (SELECT 1 FROM "CountryNode" c WHERE c."code" = 'CN-MYS')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "ZakatNisabRate" ("id", "authorityCode", "amount", "currency", "effectiveFrom", "effectiveTo", "source", "createdBy")
SELECT v.id, v.authority, v.amount, 'MYR', v.f::date, v.t::date, v.source, 'SYSTEM-MIGRATION'
FROM (VALUES
  ('nisab-my-wp-2026', 'MY-WP', 33996.00, '2026-01-01', '2026-12-31', 'PPZ-MAIWP, Arkib Nisab Tahunan: nisab emas 2026 RM33,996.00 (zakat.com.my)'),
  ('nisab-my-swk-2026-09', 'MY-SWK', 46294.89, '2026-09-01', '2026-09-30', 'Tabung Baitulmal Sarawak, kadar nisab zakat semasa September 2026 RM46,294.89 (tbs.org.my, 24 Sep 2026)')
) AS v(id, authority, amount, f, t, source)
WHERE EXISTS (SELECT 1 FROM "ZakatAuthority" a WHERE a."code" = v.authority)
ON CONFLICT ("id") DO NOTHING;
