import { FEASIBILITY_REVIEW_STAGES, FEASIBILITY_REVIEWER_ROLES } from '../ai/project-feasibility.dto';
import { LEGAL_REVIEWERS, SHARIAH_REVIEWERS } from '../asset-partnerships/asset-partnerships.service';
import { ASSET_REVIEWER_ROLES } from '../assets/assets.service';
import { CAPITAL_REVIEWER_ROLES, TAKAFUL_REVIEWER_ROLES } from '../capital-takaful/capital-takaful.service';
import { LEGAL_ROLES, SHARIAH_ROLES } from '../contract-intelligence/agreement-review-rules';
import { OPERATORS as DISTRIBUTION_OPERATORS } from '../distribution/distribution.service';
import { APPROVERS as FUNDING_APPROVERS } from '../funding/funding.controller';
import { SETTLEMENT_ROLES } from '../investments/investments.service';
import { KYC_REVIEWER_ROLES } from '../kyc/kyc-workflow';
import { KYB_REVIEWER_ROLES } from '../organisation-kyb/organisation-kyb.service';

/** One decision in a workflow, who may take it, and the rules the server enforces on it. */
export interface ApprovalStep {
  process: string;
  step: string;
  roles: string[];
  rules: string[];
}

const stageLabel = (stage: string) => stage.toLowerCase().split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const list = (roles: Iterable<string>) => [...new Set(roles)];

/**
 * The approval matrix as the server code enforces it, built from the same role lists the services check,
 * so it cannot drift from what actually happens. It is read-only: changing it means changing the code.
 */
export function approvalMatrix(): ApprovalStep[] {
  return [
    ...FEASIBILITY_REVIEW_STAGES.map((stage) => ({
      process: 'Project feasibility review',
      step: stage === 'DRAFT' ? 'Send to review' : stageLabel(stage),
      roles: list(FEASIBILITY_REVIEWER_ROLES[stage]),
      rules: stage === 'DRAFT' ? ['Only the project\'s own organisation sends it.'] : [
        'Not by anyone from the organisation running the project.',
        'One person decides at most one stage of an analysis.',
      ],
    })),
    { process: 'Investor KYC', step: 'Approve, return or reject', roles: list(KYC_REVIEWER_ROLES), rules: ['Same country as the applicant.', 'Approval records the KYC level, which sets the investment limit.', 'One ID number per account.'] },
    { process: 'Organisation KYB', step: 'Verify, request changes or reject', roles: list(KYB_REVIEWER_ROLES), rules: ['Same country.', 'Never for the reviewer\'s own organisation.', 'A note is required.'] },
    { process: 'Asset registration', step: 'Verify, request changes or reject', roles: list(ASSET_REVIEWER_ROLES), rules: ['Same country.', 'Never for the reviewer\'s own organisation.'] },
    { process: 'Asset partnership', step: 'Legal approval', roles: list(LEGAL_REVIEWERS), rules: ['From neither party.', 'A different person from the Shariah approver; Super Admin may sign only one of the two.'] },
    { process: 'Asset partnership', step: 'Shariah approval', roles: list(SHARIAH_REVIEWERS), rules: ['From neither party.', 'A reason is required to approve despite failed checks.'] },
    { process: 'Agreement', step: 'Legal review', roles: list(LEGAL_ROLES), rules: ['From neither party.', 'Records the version fingerprint reviewed.'] },
    { process: 'Agreement', step: 'Shariah review', roles: list(SHARIAH_ROLES), rules: ['From neither party.', 'After Legal approval.'] },
    { process: 'Sponsor capital', step: 'Prove and record deposit', roles: list(CAPITAL_REVIEWER_ROLES), rules: ['A pool opens only once the minimum capital is proved; funds are released only once it is deposited.'] },
    { process: 'Mandatory takaful', step: 'Verify cover', roles: list(TAKAFUL_REVIEWER_ROLES), rules: ['Conventional insurance only with the Shariah adviser\'s written approval.'] },
    { process: 'Investor payment', step: 'Confirm transfer (settle order)', roles: list(SETTLEMENT_ROLES), rules: ['Against the bank reference of the transfer.', 'Never the person\'s own order.'] },
    { process: 'Tranche release', step: 'Approve and release funds', roles: list(FUNDING_APPROVERS), rules: ['Not the person who requested it.', 'Only after sponsor capital is deposited and mandatory takaful is in force.'] },
    { process: 'Profit distribution', step: 'Calculate, approve and pay out', roles: list(DISTRIBUTION_OPERATORS), rules: ['Maker-checker: the approver is not the person who calculated it.', 'Payouts only to verified bank accounts.'] },
  ];
}
