import { AuthenticatedUser } from '../auth/identity.service';
import { AgreementForReview, availableActions, canSeeAgreement, reviewBlocker } from './agreement-review-rules';

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
