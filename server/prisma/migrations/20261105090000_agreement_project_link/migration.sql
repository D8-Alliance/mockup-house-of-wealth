-- A general agreement belongs to a project; redrafting it adds a version, and an approved one is changed by amendment.
ALTER TABLE "Contract" ADD COLUMN "projectId" TEXT,
  ADD COLUMN "amendsContractId" TEXT;

CREATE INDEX "Contract_projectId_contractType_idx" ON "Contract"("projectId", "contractType");
