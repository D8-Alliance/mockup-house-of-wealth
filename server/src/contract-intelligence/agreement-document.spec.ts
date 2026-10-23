import { buildAgreement, partiesFromWizard } from './agreement-document';
import { agreementTextChecks } from './agreement-text-checks';

const parties = [
  { name: 'Al Hidayah Group Sdn Bhd', registration: '201901012345 (1234567-A)', address: 'Semenyih, Selangor', defined: 'the Asset Owner', description: 'as the asset owner and partner' },
  { name: 'FELCRA', registration: '199701001234 (412345-K)', address: 'Kuala Lumpur', defined: 'the Managing Partner', description: 'as the managing partner' },
];
const deal = { engagementId: 'ENG-MYS-1', akad: 'MUSHARAKAH', terms: { contributionValue: 450000, pdpContributionValue: 300000, profitSharePct: 60, currency: 'MYR' }, startDate: '2026-11-01', endDate: '2027-10-31', assetName: 'Kebun sawit Lot 4321', approvedOn: '22 October 2026' };
const wizard = { projectType: 'Agriculture', partners: 'Al Hidayah Group Sdn Bhd (asset contributor); FELCRA (managing partner)', contributions: 'Land at an agreed value of RM 450,000; FELCRA RM 300,000 in capital.', profitSharing: 'Al Hidayah 60%; FELCRA 40% of distributable profit.', lossAllocation: 'Losses are borne in proportion to capital.', managementRights: 'FELCRA manages.', exitMechanism: 'Runs 2026-11-01 to 2027-10-31.' };

describe('agreement document', () => {
  it('lays out a Musharakah with its parties, recitals, clauses and schedules, and passes the text checks', () => {
    const { front, sections } = buildAgreement({ contractType: 'MUSHARAKAH', title: 'Musharakah Joint Venture Agreement', projectName: 'Replanting', jurisdiction: 'Malaysia', wizardData: wizard, parties, deal }, [{ clauseTitle: 'Loss', clauseText: 'Losses by capital.', shariahReference: null }], [{ ruleName: 'Loss by capital', description: 'Losses follow capital.' }]);
    expect(front.parties.map((party) => party.defined)).toEqual(['the Asset Owner', 'the Managing Partner']);
    expect(front.recitals.join(' ')).toContain('ENG-MYS-1');
    expect(sections.map((section) => section.title)).toEqual(expect.arrayContaining(['Definitions and interpretation', 'Capital contributions', 'Profit and loss', 'Exit and dissolution', 'Governing law and disputes', 'Costs and stamp duty', 'Particulars', 'Approved clauses incorporated']));
    expect(sections.find((section) => section.title === 'Capital contributions')?.paragraphs.join(' ')).toContain('60% for the Asset Owner and 40% for the Managing Partner');
    const failing = agreementTextChecks('MUSHARAKAH', sections, { akad: 'MUSHARAKAH', terms: deal.terms, startDate: deal.startDate, endDate: deal.endDate }).filter((check) => check.status !== 'PASS');
    expect(failing).toEqual([]);
  });

  it('flags unknown company numbers as blanks, and reads the parties of a non-partnership agreement from the wizard', () => {
    const { sections } = buildAgreement({ contractType: 'IJARAH', title: 'Ijarah Agreement', projectName: 'Depot', jurisdiction: 'Malaysia', wizardData: { lessorName: 'A Sdn Bhd', lesseeName: 'B Sdn Bhd', assetDescription: 'Warehouse', ownershipMaintained: 'Yes.', rentalAmount: 'RM 9,000', rentalFrequency: 'monthly', leaseTerm: 'Two years' }, parties: [{ ...parties[0], registration: '[company number]', defined: 'the Lessor' }, { ...parties[1], defined: 'the Lessee' }] }, [], []);
    expect(agreementTextChecks('IJARAH', sections).find((check) => check.key === 'blanks')).toMatchObject({ status: 'FAIL', detail: expect.stringContaining('[company number]') });
    expect(partiesFromWizard('MUSHARAKAH', wizard).map((party) => party.name)).toEqual(['Al Hidayah Group Sdn Bhd', 'FELCRA']);
  });
});
