-- The balance trigger read NEW."id" or NEW."transactionId" inside one CASE expression.
-- PL/pgSQL resolves both record fields when evaluating it, so on "LedgerTransaction"
-- (which has no "transactionId") every insert failed with
-- 'record "new" has no field "transactionId"', and no ledger posting could commit.
-- Picking the field in separate branches only touches the field that exists.
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
  IF TG_TABLE_NAME = 'LedgerTransaction' THEN
    transaction_id := NEW."id";
  ELSE
    transaction_id := NEW."transactionId";
  END IF;
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
