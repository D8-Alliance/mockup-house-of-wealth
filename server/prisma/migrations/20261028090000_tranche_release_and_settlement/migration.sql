-- Funding is released tranche by tranche: a request names the milestone it releases.
ALTER TABLE "FundingRequest" ADD COLUMN "milestoneId" TEXT;
ALTER TABLE "FundingRequest" ADD COLUMN "decisionNote" TEXT;
CREATE INDEX "FundingRequest_milestoneId_idx" ON "FundingRequest"("milestoneId");
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Finance confirms an investor's transfer against a bank reference before the order counts in the pool.
ALTER TABLE "InvestmentOrder" ADD COLUMN "paymentReference" TEXT;
ALTER TABLE "InvestmentOrder" ADD COLUMN "settledBy" TEXT;
