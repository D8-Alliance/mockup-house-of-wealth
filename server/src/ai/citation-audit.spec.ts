import { auditCountry, canReviewCitations, canViewCitationAudit, citationAuditWhere, dateRange, toCsv } from './citation-audit';

describe('citation-audit', () => {
  it('lets Shariah reviewers read but only knowledge-base managers review', () => {
    expect(canViewCitationAudit('Shariah Reviewer')).toBe(true);
    expect(canReviewCitations('Shariah Reviewer')).toBe(false);
    expect(canReviewCitations('Country Admin')).toBe(true);
    expect(canViewCitationAudit('Project Sponsor')).toBe(false);
  });

  it('pins non-Super-Admins to their own country and lets Super Admin narrow optionally', () => {
    expect(auditCountry({ role: 'Country Admin', countryNodeId: 'CN-TUR' }, 'CN-MYS')).toBe('CN-TUR');
    expect(auditCountry({ role: 'Super Admin', countryNodeId: 'CN-MYS' })).toBeUndefined();
    expect(auditCountry({ role: 'Super Admin', countryNodeId: 'CN-MYS' }, 'CN-NGA')).toBe('CN-NGA');
  });

  it('builds a where clause with country scope, grounding and unverified-quote filters', () => {
    const where = citationAuditWhere({ role: 'AI Administrator', countryNodeId: 'CN-IDN' }, { groundingStatus: 'UNSUPPORTED', quoteVerified: 'false', countryNodeId: 'CN-MYS' });
    expect(where.message).toEqual({ metadata: { path: ['groundingStatus'], equals: 'UNSUPPORTED' }, conversation: { countryNodeId: 'CN-IDN' } });
    expect(where).toMatchObject({ quote: { not: null }, quoteVerified: false });
  });

  it('treats a bare "to" date as the whole day', () => {
    expect(dateRange({ from: '2026-09-01', to: '2026-09-30' })).toEqual({ gte: new Date('2026-09-01'), lt: new Date('2026-10-01') });
    expect(dateRange({})).toBeUndefined();
  });

  it('escapes CSV cells and neutralises spreadsheet formulas', () => {
    const csv = toCsv(['question', 'answer', 'n'], [['Zakah, "base"?', '=HYPERLINK("http://x")', 3], [null, 'line1\nline2', undefined]]);
    expect(csv.split('\r\n')[0]).toBe('question,answer,n');
    expect(csv).toContain('"Zakah, ""base""?"');
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"line1\nline2"');
  });
});
