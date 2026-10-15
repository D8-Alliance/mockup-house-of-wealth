CREATE OR REPLACE FUNCTION enforce_ledger_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_id TEXT;
  entry_count INTEGER;
  debit_total NUMERIC;
  credit_total NUMERIC;
BEGIN
  transaction_id := CASE WHEN TG_TABLE_NAME = 'LedgerTransaction' THEN NEW."id" ELSE NEW."transactionId" END;
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN "direction" = 'DEBIT' THEN "amount" ELSE 0 END), 0), COALESCE(SUM(CASE WHEN "direction" = 'CREDIT' THEN "amount" ELSE 0 END), 0)
    INTO entry_count, debit_total, credit_total
    FROM "LedgerEntry"
   WHERE "transactionId" = transaction_id;
  IF entry_count < 2 OR debit_total <= 0 OR debit_total <> credit_total THEN
    RAISE EXCEPTION 'Ledger transaction % is not balanced', transaction_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_transaction_balance_on_header
AFTER INSERT ON "LedgerTransaction"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_transaction_balance();

CREATE CONSTRAINT TRIGGER ledger_transaction_balance_on_entry
AFTER INSERT ON "LedgerEntry"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_transaction_balance();
