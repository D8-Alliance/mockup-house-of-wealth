-- Field-by-field comparison an officer may see (entered value, what the document shows, result). Unlike "raw", it holds no full document text.
ALTER TABLE "KycCheckResult" ADD COLUMN "findings" JSONB;
