-- Public site content, previously kept only in the editing admin's browser.
CREATE TABLE "SiteContentEntry" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContentEntry_pkey" PRIMARY KEY ("key")
);
