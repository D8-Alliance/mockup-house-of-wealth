import React from 'react';
import { Building2, Briefcase, Info } from 'lucide-react';
import { OrganisationKybQueue } from '../../organisations/OrganisationKybQueue';
import { PdpKybReviewPanel } from '../../pdp/components/PdpKybReviewPanel';

export type OrganisationVerificationTab = 'kyb' | 'pdp';

const TABS: Array<{ id: OrganisationVerificationTab; label: string; icon: React.ReactNode; who: string; checks: string; unlocks: string }> = [
  {
    id: 'kyb',
    label: 'Organisation KYB',
    icon: <Building2 className="w-4 h-4" />,
    who: 'Every organisation on the platform, delivery partner or not (for example an asset owner).',
    checks: 'The company exists: SSM registration number and registered address against the SSM documents.',
    unlocks: 'Roadmap step "Organisation verified (KYB)". An asset owner needs it before offering assets to projects.',
  },
  {
    id: 'pdp',
    label: 'PDP applications',
    icon: <Briefcase className="w-4 h-4" />,
    who: 'Organisations that want to deliver projects and raise investor money, from "Register as PDP" in the Sponsor Portal.',
    checks: 'Fit to receive investor funds: the entity, its beneficial owners (UBOs), the settlement bank account and Shariah governance.',
    unlocks: 'Roadmap step "Registered as delivery partner (PDP)". Only an approved PDP registers projects for funding and opens pools.',
  },
];

/**
 * The two organisation checks in one place. KYB says an organisation is real; a PDP application says it may take
 * investor money and deliver projects. Every delivery partner passes both; most other organisations need KYB only.
 */
export const OrganisationVerificationPanel: React.FC<{ initialTab?: OrganisationVerificationTab }> = ({ initialTab = 'kyb' }) => {
  const [tab, setTab] = React.useState<OrganisationVerificationTab>(initialTab);
  const current = TABS.find(item => item.id === tab)!;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Organisation Verification</h2>
          <p className="text-xs text-slate-500">Two separate checks. KYB confirms an organisation is real; a PDP application confirms it may take investor money and deliver projects. A delivery partner needs both.</p>
        </div>

        <div role="tablist" className="flex flex-wrap gap-2">
          {TABS.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all ${tab === item.id ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>

        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><p className="font-black text-purple-800 dark:text-purple-200 flex items-center gap-1"><Info className="w-3.5 h-3.5" />Who applies</p><p className="text-slate-600 dark:text-slate-300 mt-0.5">{current.who}</p></div>
          <div><p className="font-black text-purple-800 dark:text-purple-200">What you check</p><p className="text-slate-600 dark:text-slate-300 mt-0.5">{current.checks}</p></div>
          <div><p className="font-black text-purple-800 dark:text-purple-200">What approval unlocks</p><p className="text-slate-600 dark:text-slate-300 mt-0.5">{current.unlocks}</p></div>
        </div>
        <p className="text-[11px] text-slate-500">The list opens on what is waiting for review. Organisations already verified are under Verified (KYB) or Approved (PDP), or All. You cannot review your own organisation.</p>
      </div>

      {tab === 'kyb' ? <OrganisationKybQueue /> : <PdpKybReviewPanel />}
    </div>
  );
};
