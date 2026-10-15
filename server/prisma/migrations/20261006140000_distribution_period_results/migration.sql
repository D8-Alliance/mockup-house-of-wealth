-- Period results that are not paid out: a loss, or a profit fully absorbed by earlier
-- losses. Recording them lets later profit be offset against unrecovered losses before
-- anything is distributed. Existing rows are profit distributions.
ALTER TABLE "Distribution" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PROFIT';
-- Net result actually shared under the akad after offsetting earlier losses, and the offset applied.
ALTER TABLE "Distribution" ADD COLUMN "distributableNet" DECIMAL(18,2);
ALTER TABLE "Distribution" ADD COLUMN "lossOffset" DECIMAL(18,2);
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_kind_check" CHECK ("kind" IN ('PROFIT', 'LOSS', 'ABSORBED'));
