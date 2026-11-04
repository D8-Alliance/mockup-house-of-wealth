import { AuthenticatedUser } from '../auth/identity.service';
import { buildAgreement } from './agreement-document';
import { agreementTextChecks } from './agreement-text-checks';
import { partyActions } from './agreement-review-rules';

const parties = [
  { name: 'Al Hidayah Group Sdn Bhd', registration: '201901012345 (1234567-A)', address: 'Kuantan, Pahang', defined: 'the Lessor', description: 'as the lessor' },
  { name: 'Teras Engineering Sdn Bhd', registration: '201501004321 (1123456-X)', address: 'Kuantan, Pahang', defined: 'the Lessee', description: 'as the lessee' },
];
const deal = {
  engagementId: 'LEASE-MYS-0000001', akad: 'IJARAH', terms: { rentAmount: 25500, rentFrequency: 'MONTHLY', upkeepBy: 'LESSEE', currency: 'MYR' },
  startDate: '2027-01-01', endDate: '2027-12-31', assetName: 'Tingkat 7, Menara Hidayah', approvedOn: '2 November 2026',
  lease: { leaseId: 'LEASE-MYS-0000001', depositAmount: 51000, intendedUse: 'Head office', tenantActivity: 'engineering consultancy' },
};
const wizard = { lessorName: parties[0].name, lesseeName: parties[1].name, assetDescription: 'Tingkat 7, Menara Hidayah, 8,500 square feet', ownershipMaintained: 'Yes. Al Hidayah Group keeps ownership.', rentalAmount: 'MYR 25,500.00 a month', rentalFrequency: 'Monthly in advance', leaseTerm: '2027-01-01 to 2027-12-31' };

describe('Ijarah agreement of a direct lease', () => {
  const { front, sections } = buildAgreement({ contractType: 'IJARAH', title: 'Ijarah Agreement', projectName: 'Tingkat 7, Menara Hidayah', jurisdiction: 'Malaysia', wizardData: wizard, parties, deal }, [{ clauseTitle: 'Rent', clauseText: 'Rent is for usufruct.', shariahReference: null }], [{ ruleName: 'Ownership', description: 'The lessor keeps ownership.' }]);
  const text = sections.map((section) => section.paragraphs.join(' ')).join(' ');

  it('speaks of the permitted use and the lease, not a project', () => {
    expect(front.coverLine).toBe('LEASE OF TINGKAT 7, MENARA HIDAYAH');
    expect(front.recitals.join(' ')).toContain('under lease LEASE-MYS-0000001');
    expect(front.recitals.join(' ')).not.toContain('Project');
    expect(text).toContain('only for the Permitted Use');
    expect(text).not.toContain('for the Project');
  });

  it('states the monthly rent in advance and holds the deposit in trust, refunded after the lease', () => {
    expect(text).toContain('RM 25,500.00 a month, payable monthly in advance');
    expect(text).toContain('Security Deposit of RM 51,000.00');
    expect(text).toContain('in trust (amanah)');
    const particulars = sections.find((section) => section.title === 'Particulars')!.paragraphs;
    expect(particulars).toEqual(expect.arrayContaining(['Permitted Use: Head office', 'Security Deposit: RM 51,000.00', 'Platform reference: lease LEASE-MYS-0000001']));
  });

  it('passes the text checks against the lease terms', () => {
    const failing = agreementTextChecks('IJARAH', sections, { akad: 'IJARAH', terms: deal.terms, startDate: deal.startDate, endDate: deal.endDate }).filter((check) => check.status === 'FAIL');
    expect(failing).toEqual([]);
  });
});

describe('the utility and renovation deposits in a lease agreement', () => {
  const withDeposits = { ...deal, lease: { ...deal.lease, utilityDepositAmount: 25500, renovationDepositAmount: 10000, utilitiesPaidBy: 'OWNER_RECHARGE' } };
  const { sections } = buildAgreement({ contractType: 'IJARAH', title: 'Ijarah Agreement', projectName: 'Tingkat 7, Menara Hidayah', jurisdiction: 'Malaysia', wizardData: wizard, parties, deal: withDeposits }, [], []);
  const text = sections.map((section) => section.paragraphs.join(' ')).join(' ');

  it('holds each deposit in trust for its own purpose and says who pays electricity and water', () => {
    expect(text).toContain('Utility Deposit of RM 25,500.00');
    expect(text).toContain('Renovation Deposit of RM 10,000.00');
    expect(text).toContain('recovers from the Lessee the charges for the Lease Period at cost');
    const particulars = sections.find((section) => section.title === 'Particulars')!.paragraphs;
    expect(particulars).toEqual(expect.arrayContaining(['Utility Deposit: RM 25,500.00', 'Renovation Deposit: RM 10,000.00', 'Electricity and water: paid by the Lessor and recovered from the Lessee at cost']));
  });

  it('leaves out deposits that are not held', () => {
    const { sections: plain } = buildAgreement({ contractType: 'IJARAH', title: 'Ijarah Agreement', projectName: 'Tingkat 7', jurisdiction: 'Malaysia', wizardData: wizard, parties, deal }, [], []);
    const words = plain.map((section) => section.paragraphs.join(' ')).join(' ');
    expect(words).not.toContain('Utility Deposit');
    expect(words).toContain('opens the electricity, water and sewerage accounts for the Asset in its own name');
  });

  it('says nothing of electricity and water when a machine or vehicle is leased', () => {
    const machine = { ...deal, lease: { ...deal.lease, premises: false } };
    const { front, sections: rented } = buildAgreement({ contractType: 'IJARAH', title: 'Ijarah Agreement', projectName: 'Jentolak Komatsu PC200-8', jurisdiction: 'Malaysia', wizardData: wizard, parties, deal: machine }, [], []);
    const words = JSON.stringify(front) + rented.map((section) => section.paragraphs.join(' ')).join(' ');
    expect(words).not.toMatch(/electricity|premises/i);
    expect(words).toContain('the owner of the property described in Schedule 1');
  });
});

describe('the tenant side of a lease agreement', () => {
  const tenant = (role: AuthenticatedUser['role']): AuthenticatedUser => ({ userId: 'USR-TN', idpSubjectId: 'x', email: 'x', name: 'Hafiz', role, countryNodeId: 'CN-MYS', organisationId: 'ORG-TENANT', assignedRoles: [role] });
  const agreement = { status: 'DRAFT', createdBy: 'USR-AO', organisationId: 'ORG-AHG', countryNodeId: 'CN-MYS', approvals: [], latestVersion: 1, parties: [{ role: 'OWNER', organisationId: 'ORG-AHG', consentedVersion: 1, signedAt: null }, { role: 'TENANT', organisationId: 'ORG-TENANT', consentedVersion: null, signedAt: null }] };

  it('lets a tenant company agree through its Corporate Investor or Organization Admin account', () => {
    expect(partyActions(tenant('Corporate Investor'), agreement).map((item) => item.action)).toEqual(['CONSENT']);
    expect(partyActions(tenant('Organization Admin'), agreement).map((item) => item.action)).toEqual(['CONSENT']);
    expect(partyActions(tenant('Retail Investor'), agreement)).toEqual([]);
  });
});
