-- Each statement of account belongs to a lease.
ALTER TABLE "LeaseStatement" ADD CONSTRAINT "LeaseStatement_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "AssetLease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
