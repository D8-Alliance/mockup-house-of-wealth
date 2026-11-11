-- A collection case chases a month's rent (RENT) or an unpaid utility bill the owner recharged (its kind).
ALTER TABLE "RentCollectionCase" ADD COLUMN "itemKind" TEXT NOT NULL DEFAULT 'RENT';
