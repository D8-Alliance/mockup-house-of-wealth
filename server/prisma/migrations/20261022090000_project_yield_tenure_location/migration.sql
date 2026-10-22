-- What a sponsor expects the project to return, for how long, and where it is.
ALTER TABLE "Project" ADD COLUMN "expectedYieldPct" DECIMAL(5,2);
ALTER TABLE "Project" ADD COLUMN "tenureMonths" INTEGER;
ALTER TABLE "Project" ADD COLUMN "location" TEXT;
