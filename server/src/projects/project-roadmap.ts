/**
 * The steps that take a project from registration to completion, worked out from the platform's
 * records, so the sponsor sees what is done, what to do next and what waits on someone else.
 */
export type RoadmapStatus = 'DONE' | 'TODO' | 'WAITING' | 'LOCKED' | 'OPTIONAL' | 'BLOCKED';
export type RoadmapAction = 'pdp-dossier' | 'milestones' | 'project-analyzer' | 'contract-advisor' | 'asset-partnerships' | 'submit' | 'contracts' | 'launch-pool';

export interface RoadmapStep {
  key: string;
  phase: 'PREPARE' | 'REVIEW' | 'FUND';
  title: string;
  status: RoadmapStatus;
  detail: string;
  /** Who acts at this step. */
  who: string;
  action?: RoadmapAction;
}

export interface RoadmapFacts {
  status: string;
  currency: string;
  fundingRequired: number;
  allocated: number;
  kybStatus: string;
  pdpStatus: string | null;
  evidence: { required: number; uploaded: number };
  /** The latest feasibility analysis and the review stage it has reached. */
  feasibility: { reviewStage: string } | null;
  termSheetReview: string | null;
  needs: { open: number; total: number };
  engagements: Array<{ status: string }>;
  agreements: Array<{ status: string }>;
  pools: number;
}

export const PROJECT_APPROVED_STATUSES = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED'];
const FUNDED = ['FUNDED', 'EXECUTION', 'PROFIT_DISTRIBUTION', 'COMPLETED'];
const PDP_APPROVED = ['APPROVED', 'ACTIVE'];

/** Who decides each stage of the feasibility review (mirrors the reviewer roles in the AI service). */
const REVIEW_STAGE: Record<string, { label: string; who: string }> = {
  DRAFT: { label: 'Send the feasibility analysis to review', who: 'Project Sponsor' },
  FINANCE_REVIEW: { label: 'Finance review', who: 'Finance Officer or Country Admin' },
  RISK_REVIEW: { label: 'Risk review', who: 'Risk Officer or Country Admin' },
  COMPLIANCE_REVIEW: { label: 'Compliance review', who: 'Compliance Officer or Country Admin' },
  SHARIAH_REVIEW: { label: 'Shariah review', who: 'Shariah Reviewer or Country Admin' },
  INVESTMENT_COMMITTEE_REVIEW: { label: 'Investment committee', who: 'Shariah Committee' },
  FINAL_DECISION: { label: 'Final decision', who: 'Shariah Committee' },
};

const money = (amount: number, currency: string) => `${currency === 'MYR' ? 'RM' : currency} ${Math.round(amount).toLocaleString('en-MY')}`;

export function projectRoadmap(facts: RoadmapFacts): RoadmapStep[] {
  const approved = PROJECT_APPROVED_STATUSES.includes(facts.status);
  const draft = facts.status === 'DRAFT';
  const pdpApproved = facts.pdpStatus !== null && PDP_APPROVED.includes(facts.pdpStatus);
  const steps: RoadmapStep[] = [];

  steps.push({
    key: 'kyb', phase: 'PREPARE', title: 'Organisation verified (KYB)', who: 'Your organisation, then a KYB reviewer', action: 'pdp-dossier',
    status: facts.kybStatus === 'APPROVED' || pdpApproved ? 'DONE' : facts.kybStatus === 'SUBMITTED' ? 'WAITING' : 'TODO',
    detail: facts.kybStatus === 'APPROVED' || pdpApproved ? 'Registration number and address verified; they appear on your agreements.' : facts.kybStatus === 'SUBMITTED' ? 'With a KYB reviewer.' : facts.kybStatus === 'CHANGES_REQUESTED' ? 'The reviewer asked for changes.' : 'Give the SSM number, registered address and company profile.',
  });
  steps.push({
    key: 'pdp', phase: 'PREPARE', title: 'Registered as delivery partner (PDP)', who: 'Your organisation, then a KYB reviewer', action: 'pdp-dossier',
    status: pdpApproved ? 'DONE' : facts.pdpStatus && ['SUBMITTED', 'UNDER_REVIEW'].includes(facts.pdpStatus) ? 'WAITING' : facts.pdpStatus === 'SUSPENDED' ? 'BLOCKED' : 'TODO',
    detail: pdpApproved ? 'Approved: you can launch wealth pools.' : facts.pdpStatus === 'ADDITIONAL_INFORMATION_REQUIRED' ? 'The reviewer asked for more information.' : facts.pdpStatus === 'REJECTED' ? 'The application was rejected; see the reviewer\'s note.' : facts.pdpStatus && ['SUBMITTED', 'UNDER_REVIEW'].includes(facts.pdpStatus) ? 'With a KYB reviewer.' : facts.pdpStatus === 'SUSPENDED' ? 'Suspended: contact the Country Admin.' : 'Needed before a wealth pool can be launched.',
  });
  steps.push({ key: 'registered', phase: 'PREPARE', title: 'Project registered', who: 'Project Sponsor', status: 'DONE', detail: `Funding required ${money(facts.fundingRequired, facts.currency)}.` });
  const allocatedAll = facts.allocated >= facts.fundingRequired - 0.5;
  steps.push({
    key: 'tranches', phase: 'PREPARE', title: 'Disbursement tranches', who: 'Project Sponsor', action: 'milestones',
    status: allocatedAll ? 'DONE' : approved ? 'BLOCKED' : 'TODO',
    detail: allocatedAll ? `All ${money(facts.fundingRequired, facts.currency)} allocated to tranches.` : `${money(facts.allocated, facts.currency)} of ${money(facts.fundingRequired, facts.currency)} allocated: say when and for what the funds are released.`,
  });
  steps.push({
    key: 'evidence', phase: 'PREPARE', title: 'Evidence uploaded', who: 'Project Sponsor', action: 'project-analyzer',
    status: facts.evidence.uploaded >= facts.evidence.required ? 'DONE' : 'TODO',
    detail: `${facts.evidence.uploaded} of ${facts.evidence.required} documents: financial model, cashflow forecast, asset valuation, legal ownership.`,
  });
  steps.push({
    key: 'feasibility', phase: 'PREPARE', title: 'Feasibility analysis run', who: 'Project Sponsor', action: 'project-analyzer',
    status: facts.feasibility ? 'DONE' : 'TODO',
    detail: facts.feasibility ? 'Reviewers decide on the latest analysis.' : 'Run it after uploading the evidence: reviewers approve the project on this analysis.',
  });
  steps.push({
    key: 'term-sheet', phase: 'PREPARE', title: 'Investor term sheet (Shariah structure)', who: 'Project Sponsor, then the Shariah board', action: 'contract-advisor',
    status: facts.termSheetReview === 'APPROVED' ? 'DONE' : facts.termSheetReview && ['PROPOSED', 'UNDER_REVIEW'].includes(facts.termSheetReview) ? 'WAITING' : facts.termSheetReview === 'CHANGES_REQUESTED' ? 'TODO' : 'OPTIONAL',
    detail: facts.termSheetReview === 'APPROVED' ? 'Approved by the Shariah board.' : facts.termSheetReview === 'CHANGES_REQUESTED' ? 'The Shariah board asked for changes.' : facts.termSheetReview ? 'With the Shariah board.' : 'Advice on the structure offered to investors; recommended before pooling.',
  });
  const engagementsApproved = facts.engagements.filter((item) => item.status === 'APPROVED').length;
  const engagementsLive = facts.engagements.filter((item) => ['PROPOSED', 'ACCEPTED'].includes(item.status)).length;
  steps.push({
    key: 'assets', phase: 'PREPARE', title: 'Assets from asset owners', who: 'Project Sponsor and asset owners, then Legal and Shariah', action: 'asset-partnerships',
    status: !facts.needs.total && !facts.engagements.length ? 'OPTIONAL' : facts.needs.open === 0 && engagementsApproved > 0 && engagementsLive === 0 ? 'DONE' : engagementsLive > 0 ? 'WAITING' : 'TODO',
    detail: !facts.needs.total && !facts.engagements.length ? 'If the project needs land, machinery or buildings, post a need and compare the offers.' : `${facts.needs.open} open need(s); ${engagementsLive} offer(s) in negotiation or review; ${engagementsApproved} partnership(s) approved.`,
  });
  steps.push({
    key: 'submit', phase: 'PREPARE', title: 'Project submitted for review', who: 'Project Sponsor', action: draft ? 'submit' : undefined,
    status: draft ? 'TODO' : 'DONE',
    detail: draft ? 'Submit once the details, tranches and evidence are complete; the project can no longer be edited unless returned to draft.' : 'Submitted.',
  });

  const stage = facts.feasibility ? REVIEW_STAGE[facts.feasibility.reviewStage] : undefined;
  steps.push({
    key: 'approval', phase: 'REVIEW', title: 'Project approved', who: stage?.who ?? 'Reviewers', action: stage && facts.feasibility?.reviewStage === 'DRAFT' && !approved ? 'project-analyzer' : undefined,
    status: approved ? 'DONE' : facts.status === 'REJECTED' ? 'BLOCKED' : draft ? 'LOCKED' : !facts.feasibility ? 'TODO' : facts.feasibility.reviewStage === 'DRAFT' ? 'TODO' : 'WAITING',
    detail: approved ? 'Approved: agreements can be signed and the project can be funded.' : facts.status === 'REJECTED' ? 'Rejected. A Country Admin can reopen it.' : draft ? 'After you submit: Finance, Risk, Compliance, Shariah, Investment committee, Final decision.' : !facts.feasibility ? 'Run the feasibility analysis: the review works on it.' : `Now at: ${stage?.label ?? facts.feasibility.reviewStage} (${stage?.who ?? 'reviewers'}).`,
  });
  if (facts.engagements.length) {
    const executed = facts.agreements.filter((item) => item.status === 'EXECUTION').length;
    steps.push({
      key: 'agreements', phase: 'REVIEW', title: 'Asset agreements reviewed', who: 'Both sides, then Legal and Shariah', action: 'contracts',
      status: facts.agreements.length && facts.agreements.every((item) => ['APPROVED', 'EXECUTION'].includes(item.status)) ? 'DONE' : engagementsApproved > facts.agreements.length ? 'TODO' : facts.agreements.length ? 'WAITING' : 'LOCKED',
      detail: engagementsApproved > facts.agreements.length ? 'An approved partnership has no agreement yet: generate it from the partnership.' : facts.agreements.length ? `${facts.agreements.length} agreement(s); ${executed} signed by both sides.` : 'Each approved partnership gets one agreement, agreed by both sides and reviewed by Legal and Shariah.',
    });
    steps.push({
      key: 'sign', phase: 'FUND', title: 'Asset agreements signed', who: 'Both sides', action: 'contracts',
      status: facts.agreements.length && executed === facts.agreements.length ? 'DONE' : !approved ? 'LOCKED' : 'TODO',
      detail: !approved ? 'Signing opens once the project is approved.' : `${executed} of ${facts.agreements.length} signed (one-time code and sealed PDF).`,
    });
  }
  steps.push({
    key: 'pool', phase: 'FUND', title: 'Wealth pool launched', who: 'Project Sponsor', action: approved && pdpApproved ? 'launch-pool' : undefined,
    status: facts.pools > 0 ? 'DONE' : approved && pdpApproved ? 'TODO' : 'LOCKED',
    detail: facts.pools > 0 ? `${facts.pools} pool(s) open to investors.` : !approved ? 'Needs the project approved.' : !pdpApproved ? 'Needs your PDP registration approved.' : 'Open the project to investors through a wealth pool.',
  });
  steps.push({
    key: 'funded', phase: 'FUND', title: 'Funding raised', who: 'Investors',
    status: FUNDED.includes(facts.status) ? 'DONE' : facts.pools > 0 ? 'WAITING' : 'LOCKED',
    detail: FUNDED.includes(facts.status) ? 'Funded.' : facts.pools > 0 ? 'Investors are subscribing to the pool.' : 'After the pool is launched.',
  });
  steps.push({
    key: 'execution', phase: 'FUND', title: 'Execution and tranche releases', who: 'Project Sponsor, Shariah and audit sign-off', action: 'milestones',
    status: ['PROFIT_DISTRIBUTION', 'COMPLETED'].includes(facts.status) ? 'DONE' : facts.status === 'EXECUTION' ? 'TODO' : 'LOCKED',
    detail: facts.status === 'EXECUTION' ? 'Report each milestone; funds are released tranche by tranche after sign-off.' : 'After funding.',
  });
  steps.push({
    key: 'completed', phase: 'FUND', title: 'Profit distributed and project completed', who: 'Project Sponsor and Finance',
    status: facts.status === 'COMPLETED' ? 'DONE' : facts.status === 'PROFIT_DISTRIBUTION' ? 'WAITING' : 'LOCKED',
    detail: facts.status === 'COMPLETED' ? 'Completed.' : 'Profit is distributed to investors under the akad.',
  });
  return steps;
}
