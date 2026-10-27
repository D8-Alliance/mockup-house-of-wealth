import { projectRoadmap, RoadmapFacts } from './project-roadmap';

const base: RoadmapFacts = {
  status: 'DRAFT', currency: 'MYR', fundingRequired: 1200000, allocated: 0, kybStatus: 'APPROVED', pdpStatus: null,
  evidence: { required: 4, uploaded: 0 }, feasibility: null, termSheetReview: null, needs: { open: 0, total: 0 }, engagements: [], agreements: [], pools: 0,
  capital: { pct: 10, required: 120000, pledged: 0, evidenced: 0, deposited: 0 }, cover: [],
};
const statusOf = (facts: RoadmapFacts) => Object.fromEntries(projectRoadmap(facts).map((step) => [step.key, step.status]));

describe('project roadmap', () => {
  it('lists what a new draft still needs, and locks what comes after approval', () => {
    const steps = statusOf(base);
    expect(steps).toMatchObject({ kyb: 'DONE', pdp: 'TODO', registered: 'DONE', tranches: 'TODO', evidence: 'TODO', feasibility: 'TODO', 'term-sheet': 'OPTIONAL', assets: 'OPTIONAL', submit: 'TODO', approval: 'LOCKED', pool: 'LOCKED', funded: 'LOCKED' });
    expect(steps.agreements).toBeUndefined();
    expect(projectRoadmap({ ...base, allocated: 300000 }).find((step) => step.key === 'tranches')?.detail).toContain('RM 300,000 of RM 1,200,000 allocated');
  });

  it('names who holds a submitted project, and asks the sponsor to send the analysis on from its draft stage', () => {
    const submitted = { ...base, status: 'DUE_DILIGENCE', allocated: 1200000, evidence: { required: 4, uploaded: 4 } };
    expect(projectRoadmap({ ...submitted, feasibility: { reviewStage: 'DRAFT' } }).find((step) => step.key === 'approval')).toMatchObject({ status: 'TODO', action: 'project-analyzer' });
    expect(projectRoadmap({ ...submitted, feasibility: { reviewStage: 'RISK_REVIEW' } }).find((step) => step.key === 'approval')).toMatchObject({ status: 'WAITING', who: 'Risk Officer or Country Admin' });
  });

  it('opens signing and pooling only once the project and the PDP registration are approved', () => {
    const partnership = { ...base, status: 'DUE_DILIGENCE', needs: { open: 0, total: 1 }, engagements: [{ status: 'APPROVED' }], agreements: [{ status: 'APPROVED' }] };
    expect(statusOf(partnership)).toMatchObject({ assets: 'DONE', agreements: 'DONE', sign: 'LOCKED', pool: 'LOCKED' });
    expect(statusOf({ ...partnership, status: 'APPROVED' })).toMatchObject({ approval: 'DONE', sign: 'TODO', pool: 'LOCKED' });
    expect(statusOf({ ...partnership, status: 'APPROVED', pdpStatus: 'APPROVED' })).toMatchObject({ pool: 'LOCKED' });
    const proved = { pct: 10, required: 120000, pledged: 120000, evidenced: 120000, deposited: 0 };
    expect(statusOf({ ...partnership, status: 'APPROVED', pdpStatus: 'APPROVED', capital: proved })).toMatchObject({ pool: 'TODO', capital: 'WAITING' });
    expect(statusOf({ ...partnership, status: 'POOLING', pdpStatus: 'APPROVED', agreements: [{ status: 'EXECUTION' }], pools: 1 })).toMatchObject({ sign: 'DONE', pool: 'DONE', funded: 'WAITING' });
  });

  it('asks for the sponsor capital step by step, and lists cover that is not in force', () => {
    const detail = (facts: RoadmapFacts, key: string) => projectRoadmap(facts).find((step) => step.key === key)?.detail;
    expect(detail(base, 'capital')).toContain('Pledge at least RM 120,000 (10% of the project cost)');
    expect(detail({ ...base, capital: { ...base.capital, pledged: 120000 } }, 'capital')).toContain('Upload a bank statement');
    const withFinance = { ...base, capital: { ...base.capital, pledged: 120000, submitted: 120000 } };
    expect(statusOf(withFinance).capital).toBe('WAITING');
    expect(detail(withFinance, 'capital')).toContain('Finance is checking it');
    expect(statusOf({ ...base, capital: { ...base.capital, pledged: 120000, submitted: 0 } }).capital).toBe('TODO');
    expect(statusOf({ ...base, capital: { ...base.capital, pledged: 120000, evidenced: 120000, deposited: 120000 } }).capital).toBe('DONE');
    expect(statusOf({ ...base, cover: [{ label: 'Public liability', state: 'PENDING_REVIEW' }] }).takaful).toBe('WAITING');
    expect(detail({ ...base, cover: [{ label: 'Public liability', state: 'COVERED' }, { label: 'Machinery all-risk / breakdown: Excavator', state: 'MISSING' }] }, 'takaful')).toContain('Excavator (missing)');
  });
});
