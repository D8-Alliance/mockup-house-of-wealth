import { readFileSync } from 'fs';
import { join } from 'path';
import { readPdfText } from '../documents/pdf-reader';
import { extractFinancialFacts, missingFeasibilityEvidence } from './financial-facts';

const sample = (folder: string, file: string) => readFileSync(join(__dirname, '../../../docs/sit', folder, file));

describe('financial facts from evidence text', () => {
  it('reads the SIT financial model: yearly operating profit, capex, steady revenue and opex, discount rate', async () => {
    const text = await readPdfText(sample('contoh-dokumen-bahagian-2', '01_Model_Kewangan_Kilang_Baja_Gambang.pdf'));
    const facts = extractFinancialFacts(text);
    expect(facts).toMatchObject({
      source: 'YEARLY_TABLE',
      cashFlows: [-180000, 312000, 1122000, 1662000, 1932000, 1932000, 1932000],
      capex: 2400000,
      revenue: 3780000,
      opex: 1848000,
      operatingCashflow: 1932000,
      discountRate: 0.08,
      scenarioAdjustments: { downside: -0.2, upside: 0.1 },
      debtService: null,
    });
  });

  it('skips a Capex column in the yearly table', async () => {
    const facts = extractFinancialFacts(await readPdfText(sample('contoh-dokumen', '01_Model_Kewangan_Durian_Jengka.pdf')));
    expect(facts.capex).toBe(1200000);
    expect(facts.cashFlows.length).toBe(10);
    expect(facts.discountRate).toBe(0.08);
  });

  it('takes the first amount after a label and skips headings without one', () => {
    const facts = extractFinancialFacts('Revenue assumptions\nRevenue RM 1,000,000 a year\nCapex RM 2,400,000: building RM 1,500,000; line RM 600,000\nNet cash flow 42,000 234,000 -5,000');
    expect(facts).toMatchObject({ revenue: 1000000, capex: 2400000, cashFlows: [42000, 234000, -5000], source: 'NET_CASH_FLOW_ROW', discountRate: null });
  });
});

describe('missing feasibility evidence', () => {
  it('goes by the evidence types uploaded, so Malay title documents count as legal evidence', () => {
    const uploaded = (types: string[]) => types.map((evidenceType) => ({ evidenceType, uploadedDocumentId: 'DOC' }));
    expect(missingFeasibilityEvidence('geran hak milik', uploaded(['FINANCIAL_MODEL', 'ASSET_VALUATION', 'LEGAL_OWNERSHIP']))).toEqual([]);
    expect(missingFeasibilityEvidence('', uploaded(['CASHFLOW_FORECAST']))).toEqual(['asset appraisal or valuation', 'legal and ownership evidence']);
  });

  it('falls back to keywords for projects without recorded evidence types', () => {
    expect(missingFeasibilityEvidence('financial model and valuation', [])).toEqual(['legal and ownership evidence']);
  });
});
