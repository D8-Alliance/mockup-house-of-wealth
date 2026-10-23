/**
 * The full text of an Islamic finance agreement, laid out as Malaysian commercial agreements usually
 * are: a cover page, the parties and recitals, numbered clauses with sub-clauses, schedules, and an
 * execution page. Musharakah and Ijarah have their own operative clauses (AAOIFI Shariah Standards 12
 * and 9); the other akad types get their commercial terms and the common boilerplate. The approved
 * clause library is incorporated in Schedule 2.
 *
 * This is a template for review: each Party's lawyers and the Shariah adviser must review it.
 */

export type Section = { number: string; title: string; paragraphs: string[] };

export interface AgreementParty {
  name: string;
  /** Company or registration number; a bracketed blank when not known, so the text checks flag it. */
  registration: string;
  address: string;
  /** The defined term, e.g. "the Asset Owner". */
  defined: string;
  /** Shown on the cover, e.g. "as the asset owner and partner". */
  description: string;
}

/** The cover page and the opening (parties and recitals), kept with the version's content. */
export interface AgreementFront {
  title: string;
  projectName: string;
  parties: AgreementParty[];
  recitals: string[];
}

/** An approved asset partnership's terms, when the agreement documents one. */
export interface PartnershipDeal {
  engagementId: string;
  akad: string;
  terms: { rentAmount?: number; rentFrequency?: string; upkeepBy?: string; contributionValue?: number; profitSharePct?: number; pdpContributionValue?: number; currency?: string };
  startDate: string;
  endDate: string;
  assetName: string;
  approvedOn: string | null;
}

export interface AgreementInput {
  contractType: string;
  title: string;
  projectName: string;
  jurisdiction: string;
  wizardData: Record<string, unknown>;
  parties: AgreementParty[];
  deal?: PartnershipDeal | null;
}

interface LibraryClause { clauseTitle: string; clauseText: string; shariahReference: string | null }
interface LibraryRule { ruleName: string; description: string }

const text = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  return value == null ? '' : Array.isArray(value) ? value.join(', ') : String(value).trim();
};

const money = (amount: number | undefined, currency = 'MYR') => (amount === undefined ? undefined : `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`);

/** "1.1 text" lines from a list, numbered under a clause. */
const numbered = (clause: string, lines: string[]) => lines.map((line, index) => `${clause}.${index + 1} ${line}`);

/** The defined names of the two sides for each akad. */
export function definedNames(contractType: string, partnership: boolean): [string, string] {
  if (contractType === 'IJARAH') return ['the Lessor', 'the Lessee'];
  if (contractType === 'MUSHARAKAH') return partnership ? ['the Asset Owner', 'the Managing Partner'] : ['the First Partner', 'the Second Partner'];
  if (contractType === 'MUDARABAH') return ['the Capital Provider', 'the Mudarib'];
  if (contractType === 'WAKALAH') return ['the Principal', 'the Agent'];
  return ['the Issuer', 'the Trustee'];
}

/** Parties named in the wizard, for agreements that are not drafted from a partnership. */
export function partiesFromWizard(contractType: string, data: Record<string, unknown>): Array<{ name: string }> {
  const pick = (...keys: string[]) => keys.map((key) => text(data, key)).filter(Boolean);
  if (contractType === 'IJARAH') return pick('lessorName', 'lesseeName').map((name) => ({ name }));
  if (contractType === 'MUDARABAH') return pick('capitalProvider', 'manager').map((name) => ({ name }));
  if (contractType === 'WAKALAH') return pick('principal', 'agent').map((name) => ({ name }));
  if (contractType === 'SUKUK') return pick('issuer').map((name) => ({ name }));
  // "Al Hidayah Group Sdn Bhd (asset contributor); FELCRA (managing partner)" → the names before brackets.
  return text(data, 'partners').split(/;|\band\b/).map((part) => part.replace(/\(.*?\)/g, '').trim()).filter(Boolean).slice(0, 2).map((name) => ({ name }));
}

export function buildAgreement(input: AgreementInput, clauses: LibraryClause[], rules: LibraryRule[]): { front: AgreementFront; sections: Section[] } {
  const data = input.wizardData;
  const w = (key: string) => text(data, key) || `[${key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}]`;
  const [a, b] = input.parties;
  const first = a?.defined ?? 'the First Party';
  const second = b?.defined ?? 'the Second Party';
  const deal = input.deal ?? null;
  const period = deal ? `${deal.startDate} to ${deal.endDate}` : '';

  const front: AgreementFront = {
    title: input.title,
    projectName: input.projectName,
    parties: input.parties,
    recitals: recitalsFor(input, first, second),
  };

  const operative = input.contractType === 'MUSHARAKAH' ? musharakah(input, w, first, second, period, rules)
    : input.contractType === 'IJARAH' ? ijarah(input, w, first, second, period, rules)
      : generic(input, w, rules);
  const start = operative.length + 1;
  const stampBearer = input.contractType === 'IJARAH' ? cap(second) : 'the Parties in equal shares';
  const sections = [...operative, ...boilerplate(start, stampBearer), schedule1(input, w, first, second), schedule2(clauses)];
  return { front, sections };
}

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function recitalsFor(input: AgreementInput, first: string, second: string): string[] {
  const deal = input.deal;
  if (input.contractType === 'MUSHARAKAH') return [
    `${cap(first)} ${deal ? `is the registered owner of the asset described in Schedule 1 (the "Asset")` : 'wishes to contribute capital to the Project'}.`,
    `${cap(second)} is undertaking the project known as ${input.projectName} (the "Project").`,
    ...(deal ? [`The Parties negotiated the terms of their participation in the Project on the Wealth Pooling platform under asset partnership ${deal.engagementId}, and those terms were approved after Legal and Shariah review${deal.approvedOn ? ` on ${deal.approvedOn}` : ''}.`] : []),
    'The Parties wish to carry out the Project together as a Musharakah, sharing profit by an agreed ratio and loss by their capital, on the terms of this Agreement.',
  ];
  if (input.contractType === 'IJARAH') return [
    `${cap(first)} is the owner of the asset described in Schedule 1 (the "Asset").`,
    `${cap(second)} needs the use of the Asset for the project known as ${input.projectName} (the "Project").`,
    ...(deal ? [`The Parties negotiated the lease on the Wealth Pooling platform under asset partnership ${deal.engagementId}, and its terms were approved after Legal and Shariah review${deal.approvedOn ? ` on ${deal.approvedOn}` : ''}.`] : []),
    `${cap(first)} has agreed to lease the Asset to ${second} by way of Ijarah, for a known rent and period, on the terms of this Agreement.`,
  ];
  return [`The Parties have agreed to enter into a ${input.title} in connection with ${input.projectName} on the terms of this Agreement.`];
}

function definitions(clause: string, entries: Array<[string, string]>, extra: string[] = []): Section {
  return {
    number: clause,
    title: 'Definitions and interpretation',
    paragraphs: [
      `${clause}.1 In this Agreement, unless the context requires otherwise:`,
      ...entries.map(([term, meaning]) => `"${term}" means ${meaning}`),
      `${clause}.2 Headings are for convenience only and do not affect interpretation. Words in the singular include the plural and the other way round. A reference to a law includes that law as amended or re-enacted. A reference to a Clause or Schedule is to a clause of or schedule to this Agreement.`,
      ...extra,
    ],
  };
}

const COMMON_DEFINITIONS: Array<[string, string]> = [
  ['Agreement', 'this agreement, including its Schedules, as varied from time to time in accordance with its terms;'],
  ['Business Day', 'a day, other than a Saturday, Sunday or public holiday, on which banks are open for business in Kuala Lumpur;'],
  ['Platform', 'the Wealth Pooling platform, on which the Parties negotiated this Agreement and on which it was reviewed and signed;'],
  ['Shariah Adviser', 'the Shariah reviewer who approved this Agreement on the Platform, or any successor the Parties appoint in writing;'],
];

function musharakah(input: AgreementInput, w: (key: string) => string, first: string, second: string, period: string, rules: LibraryRule[]): Section[] {
  const deal = input.deal;
  const ownerValue = deal ? money(deal.terms.contributionValue, deal.terms.currency) : undefined;
  const pdpValue = deal ? money(deal.terms.pdpContributionValue, deal.terms.currency) : undefined;
  const total = (deal?.terms.contributionValue ?? 0) + (deal?.terms.pdpContributionValue ?? 0);
  const ownerShare = total > 0 ? Math.round(((deal?.terms.contributionValue ?? 0) / total) * 1000) / 10 : 0;
  const ratio = deal && deal.terms.pdpContributionValue !== undefined && total > 0 ? `${ownerShare}% for ${first} and ${Math.round((100 - ownerShare) * 10) / 10}% for ${second}` : 'as set out in Schedule 1';
  return [
    definitions('1', [
      ...COMMON_DEFINITIONS,
      ...(deal ? [['Asset', `the asset described in Schedule 1, contributed by ${first} in kind;`] as [string, string]] : []),
      ['Capital', 'the contributions of the Partners under Clause 3;'],
      ['Capital Ratio', "each Partner's Capital as a share of the total Capital;"],
      ['Distributable Profit', 'the profit of the Venture for a period, after deducting all costs and expenses properly incurred in the Project, determined under Clause 4;'],
      ['Musharakah Period', `the period ${period || 'set out in Schedule 1'};`],
      ['Partners', `${first} and ${second}, and "Partner" means either of them;`],
      ['Profit Sharing Ratio', 'the ratio in which Distributable Profit is shared, set out in Schedule 1;'],
      ['Project', `${input.projectName};`],
      ['Venture', 'the Musharakah constituted by this Agreement.'],
    ]),
    { number: '2', title: 'The Musharakah', paragraphs: numbered('2', [
      'The Partners enter into a Musharakah (a partnership under Shariah, sharikat al-\'aqd) to carry out the Project on the terms of this Agreement.',
      `The Venture runs for the Musharakah Period${period ? `, from ${period}` : ''}, unless it ends earlier under Clause 10 or Clause 11.`,
      `The business of the Venture is: ${w('projectType')}.`,
      'Apart from the Shariah partnership described in this Agreement, nothing in it creates a partnership within the meaning of the Partnership Act 1961, or makes either Partner the agent of the other.',
    ]) },
    { number: '3', title: 'Capital contributions', paragraphs: numbered('3', [
      `The Partners contribute Capital as follows: ${w('contributions')}`,
      `A contribution in kind is valued at the agreed value in Schedule 1${ownerValue ? ` (${ownerValue})` : ''}, which the Partners accept as that Partner's Capital. The value is supported by a valuation by a registered valuer, a copy of which forms part of the records of the Venture.`,
      `${pdpValue ? `${cap(second)} contributes ${pdpValue} in cash. ` : ''}The Capital Ratio is ${ratio}.`,
      'No Partner may withdraw any Capital during the Musharakah Period except under Clause 11.',
      ...(deal ? [`Unless the Partners agree otherwise in writing, registered title to the Asset remains with ${first}. The Asset is held for and used by the Venture during the Musharakah Period, and may not be sold, charged, leased or otherwise dealt with without the prior written consent of both Partners.`] : []),
    ]) },
    { number: '4', title: 'Profit and loss', paragraphs: numbered('4', [
      `Distributable Profit is shared in the Profit Sharing Ratio: ${w('profitSharing')}`,
      'Profit is shared as a proportion of actual Distributable Profit. No Partner is entitled to a fixed amount, or to a return calculated as a percentage of its Capital.',
      `Losses are borne by the Partners in proportion to their Capital Ratio.${/proportion/i.test(w('lossAllocation')) ? '' : ` ${w('lossAllocation')}`}`,
      'A Partner bears a loss beyond its Capital Ratio only if the loss results from its negligence, misconduct or breach of this Agreement.',
      'No Partner guarantees the Capital or any profit of the other Partner. Any undertaking to pay a fixed return, or to repay Capital whatever the results of the Venture, is void.',
      'Distributable Profit is determined from the accounts of the Venture for each distribution period set out in Schedule 1, and paid to the Partners within 30 days after those accounts are agreed.',
      'At the time of a distribution, a Partner may waive part of its share of profit in favour of the other Partner (tanazul). A waiver agreed in advance is not binding.',
    ]) },
    { number: '5', title: 'Management', paragraphs: numbered('5', [
      `Management of the Venture: ${w('managementRights')}`,
      `${cap(second)} manages the Project with the skill and care of a prudent manager, in accordance with applicable law and Shariah.`,
      'The following require the prior written consent of both Partners: selling, charging, leasing or otherwise dealing with any asset of the Venture; borrowing, or giving security, in the name of the Venture; changing the business of the Venture; admitting a new partner; and any transaction with a person related to either Partner.',
      `${cap(second)} is rewarded for managing the Venture through its share of Distributable Profit, and may charge the Venture a management fee only under a separate written agreement approved by the Shariah Adviser.`,
    ]) },
    { number: '6', title: 'Accounts, reporting and audit', paragraphs: numbered('6', [
      `${cap(second)} keeps proper books and accounts of the Venture, separate from its own.`,
      `${cap(second)} gives ${first} a report on the progress of the Project and the accounts of the Venture at least once every three months, and the annual accounts of the Venture within four months after the end of each financial year.`,
      `${cap(first)} may inspect the books of the Venture and the Asset on reasonable notice, and may at its own cost appoint an auditor to audit the accounts of the Venture.`,
    ]) },
    representations('7', first, second, Boolean(deal), 'Partner'),
    { number: '8', title: 'Covenants', paragraphs: numbered('8', [
      'The Venture carries on only activities that comply with Shariah.',
      `${cap(second)} keeps the assets of the Venture in good condition, uses them only for the Project, and complies with every law, licence and condition of land use that applies to them.`,
      'Each Partner promptly tells the other of any event that is, or may become, an Event of Default, and of any claim or proceedings concerning the Venture.',
    ]) },
    { number: '9', title: 'Takaful', paragraphs: numbered('9', [
      'The assets of the Venture are covered by takaful for their replacement value against the risks usual for assets of their kind, throughout the Musharakah Period. Unless Schedule 1 says otherwise, the takaful contribution is a cost of the Venture.',
      `Proceeds of a takaful claim on the Asset are applied to its repair or replacement or, failing that, credited to the Capital of ${first}.`,
    ]) },
    defaults('10', 'Partner', 'the Venture is dissolved under Clause 11'),
    { number: '11', title: 'Exit and dissolution', paragraphs: numbered('11', [
      `Exit: ${w('exitMechanism')}`,
      'When the Musharakah Period ends, or the Venture is dissolved earlier, the assets of the Venture are valued, its liabilities are paid, any undistributed profit is shared in the Profit Sharing Ratio, and the remainder is returned to the Partners in their Capital Ratio.',
      deal ? `The Asset is returned to ${first} or, if the Partners so agree at the time, bought by ${second} at its market value at that time as determined by a registered valuer.` : 'An asset contributed in kind is returned to the Partner that contributed it, or bought by the other Partner at its market value at the time.',
      'No Partner may be required to buy the share of the other Partner at the original value of its Capital.',
    ]) },
    shariah('12', rules),
  ];
}

function ijarah(input: AgreementInput, w: (key: string) => string, first: string, second: string, period: string, rules: LibraryRule[]): Section[] {
  const deal = input.deal;
  const rent = deal ? money(deal.terms.rentAmount, deal.terms.currency) : undefined;
  const upkeep = deal?.terms.upkeepBy === 'OWNER' ? first : second;
  return [
    definitions('1', [
      ...COMMON_DEFINITIONS,
      ['Asset', `the asset described in Schedule 1: ${w('assetDescription')};`],
      ['Lease Period', `the period ${period || w('leaseTerm')};`],
      ['Rent', 'the rent (ujrah) for the use of the Asset set out in Clause 4 and Schedule 1;'],
      ['Project', `${input.projectName};`],
      ['Total Loss', 'the destruction of the Asset, or damage to it so that it can no longer be used for its purpose, without the fault of the Lessee.'],
    ]),
    { number: '2', title: 'The lease', paragraphs: numbered('2', [
      `${cap(first)} leases the Asset to ${second}, and ${second} takes the Asset on lease, for the Lease Period in return for the Rent, by way of Ijarah.`,
      `The Lease Period is ${period || w('leaseTerm')}, unless the lease ends earlier under this Agreement.`,
      `This Agreement is a lease of the use of the Asset. It is not a sale or a loan, and nothing in it transfers ownership of the Asset to ${second}.`,
    ]) },
    { number: '3', title: 'Delivery and condition', paragraphs: numbered('3', [
      `${cap(first)} delivers the Asset to ${second} on the first day of the Lease Period, in a condition fit for its intended use. The Parties record its condition in a joint inspection report, which forms part of the records of the lease.`,
      `Rent is payable only from the day the Asset is delivered and can be used.`,
    ]) },
    { number: '4', title: 'Rent', paragraphs: numbered('4', [
      `The Rent is ${rent ? `${rent} ${deal?.terms.rentFrequency === 'WHOLE_PERIOD' ? 'for the whole Lease Period' : 'a month'}` : w('rentalAmount')}, payable ${w('rentalFrequency')}.`,
      `${cap(second)} pays the Rent on its due date, without set-off or deduction, to the account of ${first} recorded on the Platform.`,
      'The Rent is fixed for the Lease Period. Rent for any renewal period may be reviewed only on a basis agreed in writing before that period starts.',
      `No Rent is payable for any time the Asset cannot be used for a reason not attributable to ${second}.`,
    ]) },
    { number: '5', title: 'Ownership and risk', paragraphs: numbered('5', [
      `${w('ownershipMaintained')} ${cap(first)} remains the owner of the Asset throughout the Lease Period and bears the risks of ownership.`,
      `${cap(first)} may transfer the Asset only subject to this lease, and must tell ${second} in writing beforehand.`,
    ]) },
    { number: '6', title: 'Maintenance', paragraphs: numbered('6', [
      `${cap(first)} bears major maintenance, structural repairs and any repair needed to keep the Asset fit for its purpose.`,
      `Day-to-day upkeep (such as fuel, operators, cleaning and routine servicing) is borne by ${upkeep}.`,
      `${cap(second)} takes reasonable care of the Asset and is liable for damage caused by its negligence or misuse.`,
    ]) },
    { number: '7', title: 'Takaful', paragraphs: numbered('7', [
      `${cap(first)} keeps the Asset covered by takaful for its replacement value throughout the Lease Period. The contribution may be reflected in the Rent but is not charged to ${second} separately.`,
    ]) },
    { number: '8', title: 'Use of the Asset', paragraphs: numbered('8', [
      `${cap(second)} uses the Asset only for the Project, for purposes that comply with Shariah, and in accordance with every law, licence and condition of land use that applies.`,
      `${cap(second)} may not sub-lease, charge or part with possession of the Asset without the prior written consent of ${first}.`,
    ]) },
    { number: '9', title: 'Late payment', paragraphs: numbered('9', [
      `If ${second} pays Rent late, it undertakes to compensate ${first} for the actual loss caused (ta'widh) only. Any further late-payment charge (gharamah) is paid to charity through the Platform and is not income of ${first}.`,
    ]) },
    { number: '10', title: 'Total loss', paragraphs: numbered('10', [
      'On a Total Loss the lease ends and Rent stops from the date of the Total Loss. Rent paid in advance for the period after that date is refunded.',
    ]) },
    defaults('11', 'Party', 'the lease ends and the Asset is returned under Clause 12'),
    { number: '12', title: 'Return of the Asset', paragraphs: numbered('12', [
      `When the lease ends, ${second} returns the Asset to ${first} in the condition in which it was delivered, fair wear and tear excepted. The Parties record its condition in a joint inspection report.`,
    ]) },
    representations('13', first, second, Boolean(deal), 'Party'),
    shariah('14', rules),
  ];
}

function generic(input: AgreementInput, w: (key: string) => string, rules: LibraryRule[]): Section[] {
  const keys = Object.keys(input.wizardData).filter((key) => key !== 'projectName');
  const label = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  return [
    definitions('1', [...COMMON_DEFINITIONS, ['Project', `${input.projectName}.`]]),
    { number: '2', title: 'Commercial terms', paragraphs: numbered('2', keys.map((key) => `${label(key)}: ${w(key)}`)) },
    { number: '3', title: 'No guaranteed return', paragraphs: numbered('3', ['No Party guarantees the capital or any return of another Party, except as Shariah permits for the akad of this Agreement and as approved by the Shariah Adviser.']) },
    shariah('4', rules),
  ];
}

function representations(clause: string, first: string, second: string, asset: boolean, word: string): Section {
  return { number: clause, title: 'Representations and warranties', paragraphs: numbered(clause, [
    `Each ${word} represents and warrants to the other that it is duly incorporated and validly existing; that it has the power and has taken all action needed to enter into and perform this Agreement; that its signatory is authorised to sign it; that this Agreement does not breach its constitution, any law or any agreement binding on it; and that the information it gave on the Platform, including for identity verification, is true and complete.`,
    ...(asset ? [`${cap(first)} represents and warrants that it is the registered owner of the Asset; that the Asset is free of any charge, caveat, claim or restriction other than those disclosed on the Platform; and that it has obtained every consent needed to commit the Asset under this Agreement.`] : []),
    `The representations and warranties are repeated on each day of the term of this Agreement by reference to the facts then existing.`,
  ]) };
}

function defaults(clause: string, word: string, consequence: string): Section {
  return { number: clause, title: 'Events of default and termination', paragraphs: numbered(clause, [
    `Each of the following is an Event of Default in relation to a ${word}: it fails to perform a material obligation under this Agreement and does not remedy the failure within 30 days after written notice; a representation it made proves untrue in a material respect; it becomes insolvent, is wound up, or has a receiver or similar officer appointed over its assets; or it uses this Agreement for an activity that does not comply with Shariah.`,
    `On an Event of Default, the other ${word} may end this Agreement by written notice, and ${consequence}. The defaulting ${word} bears any loss caused by its default.`,
    'Termination does not affect any right or obligation that accrued before it.',
  ]) };
}

function shariah(clause: string, rules: LibraryRule[]): Section {
  return { number: clause, title: 'Shariah compliance', paragraphs: [
    `${clause}.1 The Parties intend this Agreement to comply with Shariah. A ruling of the Shariah Adviser on a Shariah question arising under it binds the Parties.`,
    `${clause}.2 Any income from a source that does not comply with Shariah is paid to charity and is not distributed to or retained by either Party.`,
    rules.length
      ? `${clause}.3 The following approved Shariah rules apply to this Agreement: ${rules.map((rule) => `${rule.ruleName} (${rule.description.replace(/\.$/, '')})`).join('; ')}.`
      : `${clause}.3 No approved Shariah rules were found. Shariah review is required before approval.`,
  ] };
}

function boilerplate(start: number, stampBearer: string): Section[] {
  const n = (offset: number) => String(start + offset);
  return [
    { number: n(0), title: 'Confidentiality and personal data', paragraphs: numbered(n(0), [
      'Each Party keeps confidential the terms of this Agreement and all information it receives about the other Party, except as required by law or a regulator, or when disclosed to its professional advisers who are bound to keep it confidential.',
      'Each Party processes personal data received under this Agreement in accordance with the Personal Data Protection Act 2010.',
    ]) },
    { number: n(1), title: 'Notices', paragraphs: numbered(n(1), [
      'A notice under this Agreement is given in writing through the Platform, which records when it is sent and seen, or delivered by hand or courier to the address of the Party on the first page. A notice through the Platform is received when the Platform records its delivery.',
    ]) },
    { number: n(2), title: 'Governing law and disputes', paragraphs: numbered(n(2), [
      'This Agreement is governed by the laws of Malaysia.',
      'The Parties first try to settle any dispute amicably within 30 days. A dispute not settled is referred to arbitration at the Asian International Arbitration Centre under its i-Arbitration Rules, before one arbitrator, seated in Kuala Lumpur and conducted in English. A Shariah question arising in the arbitration is referred as those Rules provide.',
    ]) },
    { number: n(3), title: 'Costs and stamp duty', paragraphs: numbered(n(3), [
      'Each Party bears its own costs of negotiating and entering into this Agreement.',
      `Stamp duty on this Agreement is borne by ${stampBearer}, unless Schedule 1 says otherwise, and is paid within 30 days after the date of this Agreement.`,
    ]) },
    { number: n(4), title: 'General', paragraphs: numbered(n(4), [
      'Entire agreement: this Agreement is the whole agreement between the Parties on its subject. The record of its negotiation on the Platform may be used to interpret it.',
      'Variation: this Agreement may be varied only in writing agreed by both Parties, as a new version agreed and approved on the Platform.',
      'Severability: if a provision is invalid or unenforceable, the rest of this Agreement remains in force.',
      'Assignment: neither Party may assign or transfer its rights or obligations without the prior written consent of the other Party.',
      'Waiver: a failure or delay in exercising a right is not a waiver of it.',
      'Force majeure: a Party is not liable for a failure caused by an event beyond its reasonable control. If the event continues for more than 90 days, either Party may end this Agreement by written notice.',
      'Electronic signature: this Agreement may be signed electronically on the Platform. Each Party agrees that its electronic signature, verified by a one-time code and preserved with the seal and time-stamp of the Platform, is its signature for the purposes of the Electronic Commerce Act 2006.',
      'Time is of the essence of this Agreement.',
    ]) },
  ];
}

function schedule1(input: AgreementInput, w: (key: string) => string, first: string, second: string): Section {
  const deal = input.deal;
  const [a, b] = input.parties;
  const lines: string[] = [];
  if (a) lines.push(`${cap(first)}: ${a.name} (${a.registration})`);
  if (b) lines.push(`${cap(second)}: ${b.name} (${b.registration})`);
  lines.push(`Project: ${input.projectName}`);
  if (deal) {
    lines.push(`Asset: ${deal.assetName}`);
    lines.push(`Period: ${deal.startDate} to ${deal.endDate}`);
    if (input.contractType === 'MUSHARAKAH') {
      lines.push(`Agreed value of the Asset (Capital of ${first}): ${money(deal.terms.contributionValue, deal.terms.currency) ?? '-'}`);
      lines.push(`Capital of ${second}: ${money(deal.terms.pdpContributionValue, deal.terms.currency) ?? '-'}`);
      lines.push(`Profit Sharing Ratio: ${first} ${deal.terms.profitSharePct ?? '-'}%; ${second} ${deal.terms.profitSharePct !== undefined ? Math.round((100 - deal.terms.profitSharePct) * 100) / 100 : '-'}%`);
      lines.push('Distribution period: every three months, unless the Partners agree otherwise in writing');
      lines.push('Takaful contribution: a cost of the Venture');
      lines.push('Stamp duty: borne by the Parties in equal shares');
    } else {
      lines.push(`Rent: ${money(deal.terms.rentAmount, deal.terms.currency) ?? '-'} ${deal.terms.rentFrequency === 'WHOLE_PERIOD' ? 'for the whole period' : 'a month'}`);
      lines.push(`Day-to-day upkeep: ${deal.terms.upkeepBy === 'OWNER' ? first : second}`);
      lines.push(`Stamp duty: borne by ${second}`);
    }
    lines.push(`Platform reference: asset partnership ${deal.engagementId}`);
  } else {
    for (const key of Object.keys(input.wizardData).filter((item) => item !== 'projectName')) lines.push(`${key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().replace(/^./, (c) => c.toUpperCase())}: ${w(key)}`);
  }
  return { number: 'Schedule 1', title: 'Particulars', paragraphs: lines };
}

function schedule2(clauses: LibraryClause[]): Section {
  return {
    number: 'Schedule 2',
    title: 'Approved clauses incorporated',
    paragraphs: clauses.length
      ? ['The following clauses from the approved clause library of the Platform form part of this Agreement. If one of them conflicts with the Clauses above, the Clauses above prevail.', ...clauses.map((clause, index) => `${index + 1}. ${clause.clauseTitle}${clause.shariahReference ? ` (${clause.shariahReference})` : ''}: ${clause.clauseText}`)]
      : ['No approved clauses were found. Legal administrator review is required before approval.'],
  };
}
