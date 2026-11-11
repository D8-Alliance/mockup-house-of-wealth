/**
 * Bank statement matching for payouts. The Settlement Officer exports the platform account's statement from
 * online banking (CSV) and the system pairs its outgoing lines with payouts already sent (SUBMITTED), so they
 * can be confirmed together instead of one by one. Nothing is settled here: the officer ticks the pairs to
 * confirm. Bank file formats differ, so the columns are found by their header names (English or Malay).
 */

export interface StatementLine {
  /** 1-based row in the file, header excluded, so the officer can find it. */
  line: number;
  date: string;
  description: string;
  /** The money that left the account, positive. */
  amount: number;
}

export interface SubmittedPayout {
  id: string;
  amount: number;
  currency: string;
  /** The transfer reference recorded when the payout was sent. */
  providerReference: string | null;
}

export type MatchBasis = 'REFERENCE' | 'AMOUNT';

export interface StatementMatch {
  payoutId: string;
  line: StatementLine;
  /** REFERENCE: the payout's transfer reference is in the line and the amount agrees. AMOUNT: only the amount agrees, and it is unique on both sides. */
  basis: MatchBasis;
}

export interface MatchResult {
  matches: StatementMatch[];
  /** The line holds a payout's reference but a different amount: look at it, never settle it automatically. */
  mismatches: Array<{ payoutId: string; line: StatementLine; expected: number }>;
  /** The same amount appears more than once, so no pairing is safe without a reference. */
  ambiguous: Array<{ amount: number; payoutIds: string[]; lines: number[] }>;
  unmatchedLines: StatementLine[];
  unmatchedPayoutIds: string[];
}

const HEADERS = {
  date: ['date', 'tarikh', 'transaction date', 'tarikh transaksi', 'posting date', 'value date', 'tarikh urus niaga'],
  description: ['description', 'keterangan', 'details', 'butiran', 'reference', 'rujukan', 'ref', 'particulars', 'narration', 'transaction description', 'remarks', 'catatan'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'dr', 'pengeluaran', 'debit amount', 'amount out', 'money out'],
  amount: ['amount', 'amaun', 'transaction amount', 'jumlah'],
};

/** Splits one CSV row, honouring quotes ("a, b" stays one field; "" is a quote). */
function splitRow(row: string, delimiter: string): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (quoted) {
      if (char === '"' && row[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { fields.push(field.trim()); field = ''; }
    else field += char;
  }
  fields.push(field.trim());
  return fields;
}

/** "RM 1,234.50", "(1,234.50)", "-1234.5" → a number; blank → null. */
export function parseAmount(value: string | undefined): number | null {
  if (!value) return null;
  const negative = /^\(.*\)$/.test(value.trim()) || /^-/.test(value.trim()) || /\bDR\b/i.test(value);
  const digits = value.replace(/[^\d.]/g, '');
  if (!digits || !/\d/.test(digits)) return null;
  const amount = Number(digits);
  if (!Number.isFinite(amount)) return null;
  return negative ? -amount : amount;
}

const cents = (value: number) => Math.round(value * 100);

/**
 * Reads a bank statement CSV: finds the header row (the first one naming a date and an amount or debit column),
 * then keeps the outgoing lines. With a debit column, outgoing means a debit; with one amount column, the negative
 * amounts (or every amount, when none is negative, as some banks export outgoing payments only).
 */
export function parseStatementCsv(text: string): StatementLine[] {
  const rows = text.replace(/^﻿/, '').split(/\r?\n/).filter((row) => row.trim());
  if (!rows.length) throw new Error('The statement file is empty.');
  const delimiter = [',', ';', '\t'].map((candidate) => [candidate, rows.slice(0, 20).reduce((count, row) => count + row.split(candidate).length, 0)] as const).sort((a, b) => b[1] - a[1])[0][0];
  const find = (header: string[], names: string[]) => header.findIndex((cell) => names.includes(cell.toLowerCase().replace(/\s+/g, ' ').trim()));
  let headerAt = -1;
  let columns = { date: -1, description: -1, debit: -1, amount: -1 };
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const header = splitRow(rows[index], delimiter);
    const found = { date: find(header, HEADERS.date), description: find(header, HEADERS.description), debit: find(header, HEADERS.debit), amount: find(header, HEADERS.amount) };
    if (found.date >= 0 && (found.debit >= 0 || found.amount >= 0)) { headerAt = index; columns = found; break; }
  }
  if (headerAt < 0) throw new Error('No header row with a date column and an amount or debit column was found. Export the statement as CSV with its column names.');
  const parsed = rows.slice(headerAt + 1).map((row, index) => {
    const cells = splitRow(row, delimiter);
    const description = columns.description >= 0 ? cells[columns.description] ?? '' : cells.filter((_, at) => at !== columns.date && at !== columns.debit && at !== columns.amount).join(' ');
    return { line: index + 1, date: cells[columns.date] ?? '', description, debit: columns.debit >= 0 ? parseAmount(cells[columns.debit]) : null, amount: columns.amount >= 0 ? parseAmount(cells[columns.amount]) : null };
  }).filter((row) => row.date);
  if (columns.debit >= 0) return parsed.filter((row) => row.debit !== null && row.debit !== 0).map((row) => ({ line: row.line, date: row.date, description: row.description, amount: Math.abs(row.debit!) }));
  const anyNegative = parsed.some((row) => (row.amount ?? 0) < 0);
  return parsed.filter((row) => row.amount !== null && row.amount !== 0 && (!anyNegative || row.amount < 0)).map((row) => ({ line: row.line, date: row.date, description: row.description, amount: Math.abs(row.amount!) }));
}

const squash = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Pairs statement lines with sent payouts. First by transfer reference (it must also agree on the amount), then,
 * for what is left, by an amount that appears exactly once among the lines and once among the payouts. Each line
 * and each payout is used once.
 */
export function matchStatement(lines: StatementLine[], payouts: SubmittedPayout[]): MatchResult {
  const matches: StatementMatch[] = [];
  const mismatches: MatchResult['mismatches'] = [];
  const usedLines = new Set<number>();
  const usedPayouts = new Set<string>();

  for (const payout of payouts) {
    const reference = squash(payout.providerReference ?? '');
    if (reference.length < 4) continue;
    const line = lines.find((item) => !usedLines.has(item.line) && squash(item.description).includes(reference));
    if (!line) continue;
    usedLines.add(line.line);
    usedPayouts.add(payout.id);
    if (cents(line.amount) === cents(payout.amount)) matches.push({ payoutId: payout.id, line, basis: 'REFERENCE' });
    else mismatches.push({ payoutId: payout.id, line, expected: payout.amount });
  }

  const ambiguous: MatchResult['ambiguous'] = [];
  const openLines = lines.filter((line) => !usedLines.has(line.line));
  const openPayouts = payouts.filter((payout) => !usedPayouts.has(payout.id));
  for (const amount of [...new Set(openPayouts.map((payout) => cents(payout.amount)))]) {
    const samePayouts = openPayouts.filter((payout) => cents(payout.amount) === amount);
    const sameLines = openLines.filter((line) => cents(line.amount) === amount);
    if (!sameLines.length) continue;
    if (samePayouts.length === 1 && sameLines.length === 1) {
      matches.push({ payoutId: samePayouts[0].id, line: sameLines[0], basis: 'AMOUNT' });
      usedLines.add(sameLines[0].line);
      usedPayouts.add(samePayouts[0].id);
    } else ambiguous.push({ amount: amount / 100, payoutIds: samePayouts.map((payout) => payout.id), lines: sameLines.map((line) => line.line) });
  }

  const inAmbiguous = new Set(ambiguous.flatMap((item) => item.lines));
  const ambiguousPayouts = new Set(ambiguous.flatMap((item) => item.payoutIds));
  return {
    matches,
    mismatches,
    ambiguous,
    unmatchedLines: lines.filter((line) => !usedLines.has(line.line) && !inAmbiguous.has(line.line)),
    unmatchedPayoutIds: payouts.filter((payout) => !usedPayouts.has(payout.id) && !ambiguousPayouts.has(payout.id)).map((payout) => payout.id),
  };
}
