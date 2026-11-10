-- Corporate groups kept by the administrators of each country: official name and other spellings.
CREATE TABLE "CorporateGroup" (
    "id" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CorporateGroup_countryNodeId_name_key" ON "CorporateGroup"("countryNodeId", "name");
