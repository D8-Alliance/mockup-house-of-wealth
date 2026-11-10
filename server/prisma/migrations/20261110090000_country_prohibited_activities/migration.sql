-- Extra prohibited-activity words per country node, on top of the platform's own list.
ALTER TABLE "CountryNode" ADD COLUMN "prohibitedActivityTerms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
