import { longDate } from './agreement-document';
export type TextCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO';
export interface AgreementTextCheck { key: string; label: string; status: TextCheckStatus; detail: string }

interface Section { number: string; title: string; paragraphs: string[] }
/** The approved asset partnership the agreement documents, to check the text carries its terms. */
interface PartnershipTerms { akad: string; terms: { rentAmount?: number; contributionValue?: number; profitSharePct?: number; pdpContributionValue?: number }; startDate: string; endDate: string }

/** Amounts as they may be written: "450,000", "450000" or "450,000.00". */
const amountForms = (value: number) => [value.toLocaleString('en-MY'), String(value), value.toLocaleString('en-MY', { minimumFractionDigits: 2 })];

/**
 * What the platform can check in an agreement's text before Legal and Shariah decide: blanks left in,
 * the clauses each akad needs, and, for a partnership's agreement, that it carries the approved terms.
 * The same text always gives the same results; reviewers still read the agreement.
 */
export function agreementTextChecks(contractType: string, sections: Section[], partnership?: PartnershipTerms | null): AgreementTextCheck[] {
  const checks: AgreementTextCheck[] = [];
  const add = (key: string, label: string, status: TextCheckStatus, detail: string) => checks.push({ key, label, status, detail });
  const text = sections.map((section) => `${section.title}. ${section.paragraphs.join(' ')}`).join(' ');
  const lower = text.toLowerCase();
  const mentions = (pattern: RegExp) => pattern.test(lower);

  const blanks = [...new Set(text.match(/\[[A-Za-z][A-Za-z _'-]{1,60}\]/g) ?? [])];
  add('blanks', 'No blanks left in the text', blanks.length ? 'FAIL' : 'PASS', blanks.length ? `Still to fill: ${blanks.slice(0, 6).join(', ')}${blanks.length > 6 ? '…' : ''}.` : 'Every field is filled in.');
  add('dispute', 'Governing law and disputes', mentions(/governing law|dispute|arbitration|jurisdiction/) ? 'PASS' : 'WARN', mentions(/governing law|dispute|arbitration|jurisdiction/) ? 'Governing law or dispute resolution is stated.' : 'Say which law governs and how disputes are resolved (e.g. AIAC arbitration).');
  add('termination', 'Default and termination', mentions(/terminat|default|breach|exit/) ? 'PASS' : 'WARN', mentions(/terminat|default|breach|exit/) ? 'Default, termination or exit is covered.' : 'Say what counts as default and how the agreement ends.');

  if (contractType === 'MUSHARAKAH') {
    const lossByCapital = mentions(/loss[^.]{0,80}(capital|contribution)|(capital|contribution)[^.]{0,80}loss/);
    add('loss-by-capital', 'Losses borne by capital', lossByCapital ? 'PASS' : 'FAIL', lossByCapital ? 'Losses follow the capital contributions.' : 'The text must say losses are borne in proportion to each partner\'s capital.');
    add('profit-ratio', 'Profit shared by an agreed ratio', mentions(/profit[^.]{0,80}%|%[^.]{0,80}profit/) ? 'PASS' : 'FAIL', mentions(/profit[^.]{0,80}%|%[^.]{0,80}profit/) ? 'A profit ratio is stated.' : 'State each partner\'s share of profit as a percentage of actual profit.');
    const noGuarantee = mentions(/(no|not|without|never)[^.]{0,60}guarantee/);
    add('no-guarantee', 'No guaranteed return', noGuarantee ? 'PASS' : 'WARN', noGuarantee ? 'The text says no return is guaranteed.' : 'Say that no partner is guaranteed a profit or the return of capital.');
    if (mentions(/in kind|in-kind|contributed[^.]{0,40}asset|land|machine|vehicle|building/)) {
      add('in-kind-valuation', 'Value of a contribution in kind', mentions(/valu/) ? 'PASS' : 'WARN', mentions(/valu/) ? 'The agreed value of the contributed asset is stated.' : 'An asset contributed as capital needs an agreed value, ideally from an independent valuation (AAOIFI Shariah Standard 12).');
    }
  }
  if (contractType === 'IJARAH') {
    add('ownership', 'Lessor keeps ownership', mentions(/ownership|owner/) ? 'PASS' : 'FAIL', mentions(/ownership|owner/) ? 'Ownership stays with the lessor.' : 'Say that ownership of the asset stays with the lessor throughout.');
    add('rent', 'Rent and payment dates known', mentions(/rent|rental|ujrah/) && /\d/.test(text) ? 'PASS' : 'FAIL', 'The rent must be a known amount (or formula) with known payment dates.');
    add('maintenance', 'Major maintenance and takaful with the lessor', mentions(/major maintenance|structural|takaful|insurance/) ? 'PASS' : 'WARN', mentions(/major maintenance|structural|takaful|insurance/) ? 'Major maintenance or takaful is allocated.' : 'Say the lessor bears major maintenance and takaful; the lessee only day-to-day upkeep.');
    if (mentions(/late payment|penalt|interest/)) add('late-payment', 'Late payment wording', 'WARN', 'Late payment charges may not be income to the lessor: any charge must go to charity (gharamah) beyond actual costs (ta\'widh). Check the wording.');
  }

  if (partnership) {
    const missing: string[] = [];
    const { terms } = partnership;
    if (partnership.akad === 'MUSHARAKAH') {
      if (terms.profitSharePct !== undefined && !text.includes(`${terms.profitSharePct}%`)) missing.push(`the owner's ${terms.profitSharePct}% profit share`);
      if (terms.contributionValue !== undefined && !amountForms(terms.contributionValue).some((form) => text.includes(form))) missing.push(`the asset's agreed value of ${terms.contributionValue.toLocaleString('en-MY')}`);
      if (terms.pdpContributionValue !== undefined && terms.pdpContributionValue > 0 && !amountForms(terms.pdpContributionValue).some((form) => text.includes(form))) missing.push(`the delivery partner's capital of ${terms.pdpContributionValue.toLocaleString('en-MY')}`);
    } else if (terms.rentAmount !== undefined && !amountForms(terms.rentAmount).some((form) => text.includes(form))) missing.push(`the agreed rent of ${terms.rentAmount.toLocaleString('en-MY')}`);
    const dateIn = (iso: string) => text.includes(iso) || text.includes(longDate(iso));
    if (!dateIn(partnership.startDate) || !dateIn(partnership.endDate)) missing.push(`the period ${partnership.startDate} to ${partnership.endDate}`);
    add('partnership-terms', 'Carries the approved partnership terms', missing.length ? 'WARN' : 'PASS', missing.length ? `Not found in the text: ${missing.join('; ')}. The agreement should match what Legal and Shariah approved, or explain the change.` : 'The approved terms appear in the text.');
  }
  return checks;
}
