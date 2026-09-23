CREATE TABLE "ProjectAnnouncement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "countryNodeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "announcementType" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectAnnouncement_projectId_publishedAt_idx" ON "ProjectAnnouncement"("projectId", "publishedAt");
CREATE INDEX "ProjectAnnouncement_organisationId_countryNodeId_idx" ON "ProjectAnnouncement"("organisationId", "countryNodeId");
ALTER TABLE "ProjectAnnouncement" ADD CONSTRAINT "ProjectAnnouncement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAnnouncement" ADD CONSTRAINT "ProjectAnnouncement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAnnouncement" ADD CONSTRAINT "ProjectAnnouncement_organisationId_countryNodeId_fkey" FOREIGN KEY ("organisationId", "countryNodeId") REFERENCES "Organisation"("id", "countryNodeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAnnouncement" ADD CONSTRAINT "ProjectAnnouncement_countryNodeId_fkey" FOREIGN KEY ("countryNodeId") REFERENCES "CountryNode"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
