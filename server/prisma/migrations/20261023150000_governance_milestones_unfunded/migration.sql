-- The four milestones created for every project are governance steps, not disbursement tranches:
-- clear the amounts they were given (a third of the funding each) while they have not started.
UPDATE "ProjectMilestone"
SET "disbursementAmount" = 0
WHERE "title" IN ('Project information and sponsor evidence', 'Shariah term sheet review', 'Due diligence and risk clearance', 'Funding, execution and completion')
  AND "status" = 'UPCOMING'
  AND "disbursementAmount" > 0;
