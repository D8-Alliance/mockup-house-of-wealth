ALTER TABLE "ShariahRule" ADD COLUMN "jurisdiction" TEXT;
CREATE INDEX "ShariahRule_jurisdiction_idx" ON "ShariahRule"("jurisdiction");
