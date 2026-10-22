import { AuthenticatedUser } from '../auth/identity.service';
import { AgreementForReview, AgreementParty, availableActions, canSeeAgreement, partyActions, reviewBlocker, agreementTypeBlocker } from './agreement-review-rules';

function actor(userId: string, role: AuthenticatedUser['role'], organisationId = 'ORG-FELDA', countryNodeId = 'CN-MYS'): AuthenticatedUser {
  return { userId, idpSubjectId: userId, email: `${userId}@example.test`, name: userId, role, countryNodeId, organisationId, assignedRoles: [role] };
}

const sponsor = actor('USR-SPONSOR', 'Project Sponsor');
const legal = actor('USR-LEGAL', 'Legal Officer', 'ORG-LAW-FIRM');
const shariah = actor('USR-SHARIAH', 'Shariah Reviewer', 'ORG-ISLAMIC-BANK');
const orgAdmin = actor('USR-ORGADMIN', 'Organization Admin');
const at = (minute: number) => new Date(Date.UTC(2026, 9, 8, 9, minute));

function agreement(status: string, approvals: AgreementForReview['approvals'] = []): AgreementForReview {
  return { status, createdBy: 'USR-SPONSOR', organisationId: 'ORG-FELDA', countryNodeId: 'CN-MYS', approvals };
}

describe('agreement review rules', () => {
  it('lets the drafting organisation submit, legal approve, Shariah approve and the organisation execute', () => {
    expect(reviewBlocker(sponsor, agreement('DRAFT'), 'LEGAL_REVIEW')).toBeNull();
    const submitted = [{ approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(1) }];
    expect(reviewBlocker(legal, agreement('LEGAL_REVIEW', submitted), 'SHARIAH_REVIEW')).toBeNull();
    const legalDone = [...submitted, { approverId: 'USR-LEGAL', status: 'SHARIAH_REVIEW', decidedAt: at(2) }];
    expect(reviewBlocker(shariah, agreement('SHARIAH_REVIEW', legalDone), 'APPROVED')).toBeNull();
    const approved = [...legalDone, { approverId: 'USR-SHARIAH', status: 'APPROVED', decidedAt: at(3) }];
    expect(reviewBlocker(orgAdmin, agreement('APPROVED', approved), 'EXECUTION')).toBeNull();
  });

  it('lets reviewers from other organisations in the same country see and review, but not another country', () => {
    expect(canSeeAgreement(shariah, agreement('SHARIAH_REVIEW'))).toBe(true);
    expect(canSeeAgreement(actor('USR-X', 'Legal Officer', 'ORG-X', 'CN-IDN'), agreement('LEGAL_REVIEW'))).toBe(false);
    expect(canSeeAgreement(actor('USR-OTHER', 'Project Sponsor', 'ORG-OTHER'), agreement('DRAFT'))).toBe(false);
  });

  it('refuses the wrong role at each step, including administrators as reviewers', () => {
    expect(reviewBlocker(sponsor, agreement('LEGAL_REVIEW'), 'SHARIAH_REVIEW')).toMatch(/cannot take this step/);
    expect(reviewBlocker(legal, agreement('SHARIAH_REVIEW'), 'APPROVED')).toMatch(/cannot take this step/);
    expect(reviewBlocker(actor('USR-CA', 'Country Admin'), agreement('SHARIAH_REVIEW'), 'APPROVED')).toMatch(/cannot take this step/);
    expect(reviewBlocker(actor('USR-INV', 'Retail Investor'), agreement('DRAFT'), 'LEGAL_REVIEW')).toMatch(/cannot take this step/);
  });

  it('separates duties: no self-review, no double approval, no executing what you reviewed', () => {
    const legalSponsor = { ...legal, userId: 'USR-SPONSOR' };
    expect(reviewBlocker(legalSponsor, agreement('LEGAL_REVIEW', [{ approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(1) }]), 'SHARIAH_REVIEW')).toMatch(/drafted or submitted/);
    const legalDone = [{ approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(1) }, { approverId: 'USR-BOTH', status: 'SHARIAH_REVIEW', decidedAt: at(2) }];
    expect(reviewBlocker(actor('USR-BOTH', 'Shariah Advisor', 'ORG-ISLAMIC-BANK'), agreement('SHARIAH_REVIEW', legalDone), 'APPROVED')).toMatch(/legal approval/);
    const approved = [...legalDone, { approverId: 'USR-SHARIAH', status: 'APPROVED', decidedAt: at(3) }];
    expect(reviewBlocker({ ...orgAdmin, userId: 'USR-BOTH' }, agreement('APPROVED', approved), 'EXECUTION')).toMatch(/reviewed this agreement/);
  });

  it('starts a fresh review round after changes are requested and the draft is resubmitted', () => {
    const history = [
      { approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(1) },
      { approverId: 'USR-BOTH', status: 'SHARIAH_REVIEW', decidedAt: at(2) },
      { approverId: 'USR-SHARIAH', status: 'CHANGES_REQUESTED', decidedAt: at(3) },
      { approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(4) },
      { approverId: 'USR-LEGAL', status: 'SHARIAH_REVIEW', decidedAt: at(5) },
    ];
    // USR-BOTH gave the legal approval only in the previous round, so may decide on Shariah now.
    expect(reviewBlocker(actor('USR-BOTH', 'Shariah Advisor', 'ORG-ISLAMIC-BANK'), agreement('SHARIAH_REVIEW', history), 'APPROVED')).toBeNull();
  });

  it('explains an invalid move instead of failing', () => {
    expect(reviewBlocker(legal, agreement('EXECUTION'), 'LEGAL_REVIEW')).toMatch(/cannot move to LEGAL_REVIEW/);
  });

  it('lists only the buttons the person can use now', () => {
    const submitted = [{ approverId: 'USR-SPONSOR', status: 'LEGAL_REVIEW', decidedAt: at(1) }];
    expect(availableActions(legal, agreement('LEGAL_REVIEW', submitted)).map((item) => item.action)).toEqual(['SHARIAH_REVIEW', 'CHANGES_REQUESTED']);
    expect(availableActions(sponsor, agreement('LEGAL_REVIEW', submitted))).toEqual([]);
  });
});

describe('agreement visibility', () => {
  it('keeps an unsubmitted draft private to its organisation', () => {
    expect(canSeeAgreement(sponsor, agreement('DRAFT'))).toBe(true);
    expect(canSeeAgreement(shariah, agreement('DRAFT'))).toBe(false);
    expect(canSeeAgreement(shariah, agreement('LEGAL_REVIEW'))).toBe(true);
  });
});

describe('agreement types by role', () => {
  it('lets a delivery partner draft project financing and leases, and an asset owner draft asset contracts', () => {
    expect(agreementTypeBlocker('Project Sponsor', 'MUDARABAH')).toBeNull();
    expect(agreementTypeBlocker('Project Sponsor', 'IJARAH')).toBeNull();
    expect(agreementTypeBlocker('Asset Owner', 'IJARAH')).toBeNull();
    expect(agreementTypeBlocker('Asset Owner', 'MUSHARAKAH')).toBeNull();
    expect(agreementTypeBlocker('Asset Owner', 'MUDARABAH')).toMatch(/IJARAH, MUSHARAKAH/);
  });

  it('leaves administrators free to draft any type', () => {
    expect(agreementTypeBlocker('Country Admin', 'SUKUK')).toBeNull();
  });
});

describe('asset partnership agreements', () => {
  const owner = actor('USR-AMRAN', 'Asset Owner', 'ORG-ALHIDAYAH');
  const pdp = actor('USR-UMAR', 'Project Sponsor', 'ORG-FELCRA');
  const party = (role: string, organisationId: string, consentedVersion: number | null, signedAt: Date | null = null): AgreementParty => ({ role, organisationId, consentedVersion, signedAt });
  const deal = (status: string, latestVersion: number, parties: AgreementParty[], approvals: AgreementForReview['approvals'] = []): AgreementForReview => ({ status, createdBy: 'USR-AMRAN', organisationId: 'ORG-ALHIDAYAH', countryNodeId: 'CN-MYS', approvals, parties, latestVersion });

  it('lets the other side see and act on the agreement the first side drafted', () => {
    const draft = deal('DRAFT', 1, [party('OWNER', 'ORG-ALHIDAYAH', 1), party('PDP', 'ORG-FELCRA', null)]);
    expect(canSeeAgreement(pdp, draft)).toBe(true);
    expect(partyActions(pdp, draft)).toEqual([{ action: 'CONSENT', label: 'Agree to version 1' }]);
    expect(partyActions(owner, draft)).toEqual([]);
  });

  it('goes to legal review only when both sides agreed to the latest version', () => {
    expect(reviewBlocker(owner, deal('DRAFT', 2, [party('OWNER', 'ORG-ALHIDAYAH', 2), party('PDP', 'ORG-FELCRA', 1)]), 'LEGAL_REVIEW')).toBe('Both parties must agree to version 2 before it goes to legal review.');
    expect(reviewBlocker(pdp, deal('DRAFT', 2, [party('OWNER', 'ORG-ALHIDAYAH', 2), party('PDP', 'ORG-FELCRA', 2)]), 'LEGAL_REVIEW')).toBeNull();
  });

  it('keeps reviewers from either party out of the review', () => {
    const lawyerAtOwner = actor('USR-IN-HOUSE', 'Legal Officer', 'ORG-ALHIDAYAH');
    const submitted = deal('LEGAL_REVIEW', 1, [party('OWNER', 'ORG-ALHIDAYAH', 1), party('PDP', 'ORG-FELCRA', 1)], [{ approverId: 'USR-AMRAN', status: 'LEGAL_REVIEW', decidedAt: at(1) }]);
    expect(reviewBlocker(lawyerAtOwner, submitted, 'SHARIAH_REVIEW')).toMatch(/one of the parties/);
    expect(reviewBlocker(legal, submitted, 'SHARIAH_REVIEW')).toBeNull();
  });

  it('goes back to legal review after changes only as a new version', () => {
    const parties = [party('OWNER', 'ORG-ALHIDAYAH', 1), party('PDP', 'ORG-FELCRA', 1)];
    const sentBack = { ...deal('CHANGES_REQUESTED', 1, parties, [{ approverId: 'USR-AMRAN', status: 'LEGAL_REVIEW', decidedAt: at(1) }, { approverId: 'USR-LEGAL', status: 'CHANGES_REQUESTED', decidedAt: at(5) }]), latestVersionAt: at(0) };
    expect(reviewBlocker(pdp, sentBack, 'LEGAL_REVIEW')).toMatch(/drafts a revision/);
    const revised = { ...sentBack, latestVersion: 2, latestVersionAt: at(9), parties: [party('OWNER', 'ORG-ALHIDAYAH', 2), party('PDP', 'ORG-FELCRA', 2)] };
    expect(reviewBlocker(pdp, revised, 'LEGAL_REVIEW')).toBeNull();
  });

  it('is executed by both signatures, not by one side marking it executed', () => {
    const approved = deal('APPROVED', 1, [party('OWNER', 'ORG-ALHIDAYAH', 1, at(5)), party('PDP', 'ORG-FELCRA', 1)]);
    expect(reviewBlocker(pdp, approved, 'EXECUTION')).toMatch(/Each party signs/);
    expect(partyActions(pdp, approved)).toEqual([{ action: 'SIGN', label: 'Sign the agreement' }]);
    expect(partyActions(owner, approved)).toEqual([]);
  });
});
