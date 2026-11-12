-- Each owner organisation's own rent collection timings (days before a case opens, for each reminder, and before Legal).
CREATE TABLE "RentCollectionSettings" (
    "organisationId" TEXT NOT NULL,
    "graceDays" INTEGER NOT NULL,
    "reminder1Days" INTEGER NOT NULL,
    "reminder2Days" INTEGER NOT NULL,
    "reminder3Days" INTEGER NOT NULL,
    "legalDays" INTEGER NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RentCollectionSettings_pkey" PRIMARY KEY ("organisationId")
);
