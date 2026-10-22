import { agreementTextChecks } from './agreement-text-checks';

const status = (checks: ReturnType<typeof agreementTextChecks>, key: string) => checks.find((check) => check.key === key)?.status;

describe('agreement text checks', () => {
  it('flags blanks and missing Musharakah protections', () => {
    const checks = agreementTextChecks('MUSHARAKAH', [
      { number: '3', title: 'Transaction Structure', paragraphs: ['Contributions: Al Hidayah: land, contributed in kind. FELCRA: [state its capital contribution].', 'Profit sharing: Al Hidayah 60%; FELCRA 40% of distributable profit.'] },
    ]);
    expect(status(checks, 'blanks')).toBe('FAIL');
    expect(checks.find((check) => check.key === 'blanks')?.detail).toContain('[state its capital contribution]');
    expect(status(checks, 'loss-by-capital')).toBe('FAIL');
    expect(status(checks, 'profit-ratio')).toBe('PASS');
    expect(status(checks, 'no-guarantee')).toBe('WARN');
    expect(status(checks, 'in-kind-valuation')).toBe('WARN');
    expect(status(checks, 'dispute')).toBe('WARN');
  });

  it('checks a partnership agreement carries the approved terms', () => {
    const sections = [{ number: '3', title: 'Terms', paragraphs: ['Land valued at MYR 450,000.00 contributed as capital; FELCRA contributes MYR 300,000. Profit: owner 60%. Losses are borne in proportion to each partner\'s capital contribution. No partner is guaranteed a return. Period 2026-11-01 to 2027-01-31. Governing law: Malaysia. Either party may terminate on default.'] }];
    const approved = { akad: 'MUSHARAKAH', terms: { contributionValue: 450000, profitSharePct: 60, pdpContributionValue: 300000 }, startDate: '2026-11-01', endDate: '2027-01-31' };
    const checks = agreementTextChecks('MUSHARAKAH', sections, approved);
    expect(status(checks, 'partnership-terms')).toBe('PASS');
    expect(status(checks, 'loss-by-capital')).toBe('PASS');
    const changed = agreementTextChecks('MUSHARAKAH', sections, { ...approved, terms: { ...approved.terms, profitSharePct: 55 } });
    expect(changed.find((check) => check.key === 'partnership-terms')?.detail).toContain("the owner's 55% profit share");
  });

  it('checks Ijarah ownership, rent and late payment wording', () => {
    const checks = agreementTextChecks('IJARAH', [{ number: '3', title: 'Lease', paragraphs: ['The Lessor keeps ownership. Rental: MYR 9,000 monthly. A late payment penalty of 2% applies.'] }]);
    expect(status(checks, 'ownership')).toBe('PASS');
    expect(status(checks, 'rent')).toBe('PASS');
    expect(status(checks, 'maintenance')).toBe('WARN');
    expect(status(checks, 'late-payment')).toBe('WARN');
  });
});
