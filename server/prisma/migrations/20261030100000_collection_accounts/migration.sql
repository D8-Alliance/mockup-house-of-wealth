-- The platform's trust (escrow) account per country that investors transfer to.
CREATE TABLE "CollectionAccount" (
    "countryNodeId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "swiftCode" TEXT,
    "currency" TEXT NOT NULL,
    "instructions" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionAccount_pkey" PRIMARY KEY ("countryNodeId")
);

ALTER TABLE "CollectionAccount" ADD CONSTRAINT "CollectionAccount_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE CASCADE ON UPDATE CASCADE;
