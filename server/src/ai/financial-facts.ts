/**
 * Financial figures read from the text of uploaded evidence (financial model, cashflow forecast). Nothing is
 * assumed: a figure the documents do not state stays null, and the figures that need it are not calculated.
 */
export interface FinancialFacts {
  cashFlows: number[];
  capex: number | null;
  opex: number | null;
  revenue: number | null;
  operatingCashflow: number | null;
  debtService: number | null;
  discountRate: number | null;
  scenarioAdjustments: { downside: number | null; upside: number | null };
  source: 'YEARLY_TABLE' | 'NET_CASH_FLOW_ROW' | 'EXTRACTED_DOCUMENT_LINES' | 'NOT_AVAILABLE';
}

const AMOUNT = /(?:MYR|RM|USD|EUR|GBP)\s*([\d,]+(?:\.\d+)?)\s*(million|billion|m|b)?\b/i;
const toNumber = (text: string) => Number(text.replace(/,/g, ''));
const scaled = (value: number, unit?: string) => (unit?.toLowerCase().startsWith('b') ? value * 1e9 : unit?.toLowerCase().startsWith('m') ? value * 1e6 : value);

/** The first amount after the label, e.g. "Capex RM 2,400,000: building RM 1,500,000" is 2,400,000. */
function amountAfter(line: string, label: RegExp): number | null {
  const found = label.exec(line);
  if (!found) return null;
  const match = AMOUNT.exec(line.slice(found.index));
  return match ? scaled(toNumber(match[1]), match[2]) : null;
}

/** The first line with the label that also states an amount (a heading such as "Revenue assumptions" is skipped). */
function labelled(lines: string[], label: RegExp): number | null {
  for (const line of lines) {
    const value = amountAfter(line, label);
    if (value !== null) return value;
  }
  return null;
}

/** Numbers in a table row, e.g. "Net cash flow 42,000 234,000 -1,000" or "2028 1,260,000 948,000 312,000". */
const rowNumbers = (text: string) => [...text.matchAll(/(?:^|\s)(-?[\d,]*\d(?:\.\d+)?)(?=\s|$)/g)].map((match) => toNumber(match[1]));

/**
 * A yearly table whose header names its columns, e.g. "Year Revenue (RM) Opex (RM) Operating profit (RM)" and then
 * one row per year. Returns each column's series in year order.
 */
function yearlyTable(lines: string[]) {
  const headerIndex = lines.findIndex((line) => /^year\b/i.test(line) && /revenue|opex|profit|cash flow/i.test(line));
  if (headerIndex < 0) return null;
  const header = lines[headerIndex].toLowerCase();
  const columns = ['revenue', 'capex', 'opex', 'operating profit', 'net cash flow']
    .map((name) => ({ name, at: header.indexOf(name) }))
    .filter((column) => column.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((column) => column.name);
  const rows: number[][] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    if (!/^(19|20)\d\d\b/.test(line)) break;
    const numbers = rowNumbers(line.replace(/^(19|20)\d\d\b/, ''));
    if (numbers.length < columns.length) break;
    rows.push(numbers);
  }
  if (rows.length < 2) return null;
  const series = (name: string) => { const index = columns.indexOf(name); return index < 0 ? null : rows.map((row) => row[index]); };
  return { revenue: series('revenue'), opex: series('opex'), operatingProfit: series('operating profit'), netCashFlow: series('net cash flow') };
}

export function extractFinancialFacts(text: string): FinancialFacts {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const table = yearlyTable(lines);
  const netCashFlowRow = lines.find((line) => /^net cash flow\b/i.test(line));
  const rowSeries = netCashFlowRow ? rowNumbers(netCashFlowRow.replace(/^net cash flow\b/i, '')) : [];

  // Operating cash flows per year, before funding: the model's operating profit (or net cash flow) column first,
  // then a "Net cash flow" row, then single amounts on cash flow lines.
  const tableFlows = table?.operatingProfit ?? table?.netCashFlow ?? null;
  const lineFlows = lines.filter((line) => /cash flow/i.test(line)).map((line) => { const match = AMOUNT.exec(line); return match ? scaled(toNumber(match[1]), match[2]) : null; }).filter((value): value is number => value !== null);
  const cashFlows = tableFlows ?? (rowSeries.length >= 2 ? rowSeries : lineFlows);
  const source: FinancialFacts['source'] = tableFlows ? 'YEARLY_TABLE' : rowSeries.length >= 2 ? 'NET_CASH_FLOW_ROW' : lineFlows.length ? 'EXTRACTED_DOCUMENT_LINES' : 'NOT_AVAILABLE';

  const last = (series: number[] | null | undefined) => (series?.length ? series[series.length - 1] : null);
  const rateLine = lines.find((line) => /discount rate|hurdle rate|cost of capital/i.test(line));
  const rate = rateLine?.match(/([\d.]+)\s*%/);
  const scenario = (name: string) => {
    const line = lines.find((candidate) => new RegExp(name, 'i').test(candidate) && /cash flow|revenue|opex|cost|sensitivity/i.test(candidate));
    const match = line?.match(/([+-]?[\d.]+)\s*%/);
    return match ? Number(match[1]) / 100 : null;
  };

  return {
    cashFlows,
    capex: labelled(lines, /capex|capital expenditure|construction cost/i),
    // A steady year from the table when there is one; otherwise the stated amount.
    opex: last(table?.opex) ?? labelled(lines, /opex|operating expense|operating cost/i),
    revenue: last(table?.revenue) ?? labelled(lines, /revenue|sales|turnover/i),
    operatingCashflow: last(table?.operatingProfit) ?? labelled(lines, /operating cash flow|ebitda|operating profit/i),
    debtService: labelled(lines, /debt service|finance payment|principal and interest/i),
    discountRate: rate ? Number(rate[1]) / 100 : null,
    scenarioAdjustments: { downside: scenario('downside'), upside: scenario('upside') },
    source,
  };
}

/** The feasibility evidence groups and the uploaded evidence types that satisfy each. */
const EVIDENCE_GROUPS: Array<{ label: string; types: string[]; keyword: string }> = [
  { label: 'financial model or cashflow forecast', types: ['FINANCIAL_MODEL', 'CASHFLOW_FORECAST'], keyword: 'financial' },
  { label: 'asset appraisal or valuation', types: ['ASSET_VALUATION'], keyword: 'valuation' },
  { label: 'legal and ownership evidence', types: ['LEGAL_OWNERSHIP'], keyword: 'legal' },
];

/**
 * Evidence groups with nothing uploaded. The uploaded evidence types decide; documents in Malay ("Hak Milik",
 * "Geran") never contain the English keywords the older check looked for. Projects from before evidence types
 * were recorded fall back to those keywords.
 */
export function missingFeasibilityEvidence(text: string, requirements: Array<{ evidenceType: string; uploadedDocumentId?: string | null }>): string[] {
  const uploaded = new Set(requirements.filter((item) => item.uploadedDocumentId).map((item) => item.evidenceType));
  if (!uploaded.size) return EVIDENCE_GROUPS.filter((group) => !text.includes(group.keyword)).map((group) => group.label);
  return EVIDENCE_GROUPS.filter((group) => !group.types.some((type) => uploaded.has(type))).map((group) => group.label);
}
