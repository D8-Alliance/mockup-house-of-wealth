-- Tamper-evident hash chains over the audit log and the financial ledger.
-- Each link stores sha256(previous hash + canonical record content), so changing,
-- removing or reordering a sealed record breaks every later link. Links live in
-- their own table so AuditEvent and the ledger keep their UPDATE/DELETE bans.
CREATE TABLE "HashChainLink" (
  "id" TEXT NOT NULL,
  "chain" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "recordId" TEXT NOT NULL,
  "previousHash" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "sealedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HashChainLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HashChainLink_chain_sequence_key" ON "HashChainLink"("chain", "sequence");
CREATE UNIQUE INDEX "HashChainLink_chain_recordId_key" ON "HashChainLink"("chain", "recordId");

CREATE OR REPLACE FUNCTION block_hash_chain_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'HashChainLink is append-only: UPDATE and DELETE are forbidden';
END;
$$;

CREATE TRIGGER hash_chain_link_no_update BEFORE UPDATE ON "HashChainLink" FOR EACH ROW EXECUTE FUNCTION block_hash_chain_mutation();
CREATE TRIGGER hash_chain_link_no_delete BEFORE DELETE ON "HashChainLink" FOR EACH ROW EXECUTE FUNCTION block_hash_chain_mutation();
