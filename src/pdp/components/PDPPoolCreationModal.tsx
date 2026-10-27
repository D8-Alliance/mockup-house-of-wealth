import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Layers, X } from 'lucide-react';
import { apiClient, BackendPool, BackendProject, ProjectSafeguards } from '../../services/apiClient';
import { PDPApplication } from '../pdpTypes';

type PoolAkad = 'MUDARABAH' | 'MUSHARAKAH' | 'WAKALAH' | 'IJARAH';
/** Investor share of net profit each akad allows (mirrors AKAD_RULES on the server). */
const AKAD: Record<PoolAkad, { label: string; min: number; max: number; manager: string }> = {
  MUDARABAH: { label: 'Mudarabah', min: 1, max: 99, manager: 'the manager (mudarib)' },
  MUSHARAKAH: { label: 'Musharakah', min: 1, max: 99, manager: 'the managing partner' },
  WAKALAH: { label: 'Wakalah', min: 1, max: 100, manager: 'the agent (wakil) as incentive' },
  IJARAH: { label: 'Ijarah', min: 1, max: 100, manager: 'the lessor' },
};
/** Statuses in which an approved project may take a pool (mirrors FUNDABLE_PROJECT_STATUSES on the server). */
const FUNDABLE = ['APPROVED', 'FUNDING_OPEN', 'POOLING', 'FUNDED'];
const INPUT = 'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs';
const LABEL = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300';

const akadOf = (contract: string): PoolAkad => {
  const lower = contract.toLowerCase();
  return (Object.keys(AKAD) as PoolAkad[]).find((key) => lower.includes(key.toLowerCase())) ?? 'MUSHARAKAH';
};

interface PDPPoolCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdpApplication?: PDPApplication;
  /** Opens with this project chosen, e.g. from a project's roadmap. */
  projectId?: string;
  onCreated?: (pool: BackendPool) => void;
}

/**
 * Opens a wealth pool for one of the organisation's approved projects. The server checks everything again:
 * the project approved, the organisation an approved PDP, the sponsor's capital proved, the akad's profit range.
 */
export const PDPPoolCreationModal: React.FC<PDPPoolCreationModalProps> = ({ isOpen, onClose, pdpApplication, projectId, onCreated }) => {
  const [projects, setProjects] = useState<BackendProject[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [safeguards, setSafeguards] = useState<ProjectSafeguards | null>(null);
  const [poolName, setPoolName] = useState('');
  const [akadType, setAkadType] = useState<PoolAkad>('MUSHARAKAH');
  const [investorShare, setInvestorShare] = useState('70');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<BackendPool | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCreated(null);
    setError('');
    apiClient.getProjects().then((items) => {
      setProjects(items);
      const fundable = items.filter((item) => FUNDABLE.includes(item.status));
      setSelectedId((current) => current || (projectId && fundable.some((item) => item.projectId === projectId) ? projectId : fundable[0]?.projectId ?? ''));
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Projects could not be loaded.'));
  }, [isOpen, projectId]);

  const project = useMemo(() => projects?.find((item) => item.projectId === selectedId), [projects, selectedId]);
  useEffect(() => {
    if (!project) { setSafeguards(null); return; }
    setPoolName(`${project.projectName} Pool`);
    setAkadType(akadOf(project.proposedShariahContract));
    setExpectedReturn(project.expectedYieldPct === null || project.expectedYieldPct === undefined || project.expectedYieldPct === '' ? '' : String(Number(project.expectedYieldPct)));
    apiClient.getProjectSafeguards(project.projectId).then(setSafeguards).catch(() => setSafeguards(null));
  }, [project]);

  if (!isOpen) return null;
  const fundable = (projects ?? []).filter((item) => FUNDABLE.includes(item.status));
  const pdpApproved = pdpApplication?.status === 'APPROVED' || pdpApplication?.status === 'ACTIVE';
  const rule = AKAD[akadType];
  const share = Number(investorShare);
  const shareProblem = !Number.isFinite(share) || share < rule.min || share > rule.max ? `${rule.label} allows an investor share between ${rule.min}% and ${rule.max}%.` : '';
  const blockers = [
    ...(!pdpApproved ? ['Your organisation must be an approved delivery partner (PDP).'] : []),
    ...(safeguards?.facts?.blockers.pool ?? []),
  ];
  const currency = project?.countryNode?.currency || pdpApplication?.bankInfo?.currency || 'MYR';
  const canLaunch = Boolean(project) && !blockers.length && !shareProblem && poolName.trim().length >= 3 && expectedReturn !== '' && Number(expectedReturn) >= 0;

  const launch = async () => {
    if (!project) return;
    setBusy(true);
    setError('');
    try {
      const pool = await apiClient.createPool({ projectId: project.projectId, poolName: poolName.trim(), currency, indicativeExpectedReturn: Number(expectedReturn), organisationId: project.organisationId, countryNodeId: project.countryNodeId, akadType, investorProfitSharePct: share });
      setCreated(pool);
      onCreated?.(pool);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pool was not created.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative my-8 text-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"><Layers className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Launch a wealth pool</h3>
              <p className="text-slate-500">For one of your approved projects. Investors accept the akad terms when they invest.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        {created ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold"><CheckCircle2 className="w-5 h-5" />{created.poolName} is open ({created.poolId}).</p>
            <p className="text-slate-500">Version 1 of its akad terms is published; investors see the pool under Wealth Pooling.</p>
            <div className="flex justify-end"><button type="button" onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer">Done</button></div>
          </div>
        ) : projects && !fundable.length ? (
          <div className="space-y-2">
            <p className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold">None of your projects is approved yet.</p>
            <p className="text-slate-500">A project can take a pool once it passes the review (Finance, Risk, Compliance, Shariah, Investment Committee, Final Decision). Open the project to see its roadmap.</p>
            <p className="text-slate-500">Your projects: {(projects ?? []).map((item) => `${item.projectName} (${item.status.replace('_', ' ').toLowerCase()})`).join(', ') || 'none'}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className={LABEL}>Project
              <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={`${INPUT} mt-1`}>
                {fundable.map((item) => <option key={item.projectId} value={item.projectId}>{item.projectName} ({item.projectCode})</option>)}
              </select>
            </label>
            {project && <p className="text-slate-500">Funding required: <strong>{currency} {Number(project.fundingRequired).toLocaleString('en-MY')}</strong> · Project structure: {project.proposedShariahContract}</p>}

            {blockers.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 space-y-1">
                <p className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300"><AlertTriangle className="w-4 h-4" />Before the pool can open</p>
                {blockers.map((line) => <p key={line} className="text-slate-700 dark:text-slate-300">{line}</p>)}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <label className={LABEL}>Pool name<input value={poolName} onChange={(event) => setPoolName(event.target.value)} maxLength={160} className={`${INPUT} mt-1`} /></label>
              <label className={LABEL}>Akad with investors
                <select value={akadType} onChange={(event) => setAkadType(event.target.value as PoolAkad)} className={`${INPUT} mt-1`}>
                  {(Object.keys(AKAD) as PoolAkad[]).map((key) => <option key={key} value={key}>{AKAD[key].label}</option>)}
                </select>
              </label>
              <label className={LABEL}>Investors' share of net profit (%)
                <input type="number" min={rule.min} max={rule.max} step="0.01" value={investorShare} onChange={(event) => setInvestorShare(event.target.value)} className={`${INPUT} mt-1`} />
                <span className="font-normal text-slate-500">{shareProblem || `The rest (${(100 - share).toFixed(2).replace(/\.00$/, '')}%) goes to ${rule.manager}. A share of actual profit, never a fixed return.`}</span>
              </label>
              <label className={LABEL}>Indicative expected return (% a year)
                <input type="number" min={0} max={100} step="0.01" value={expectedReturn} onChange={(event) => setExpectedReturn(event.target.value)} className={`${INPUT} mt-1`} />
                <span className="font-normal text-slate-500">From the project; a projection shown to investors, not a promise.</span>
              </label>
            </div>

            {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 font-bold">{error}</p>}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold cursor-pointer">Cancel</button>
              <button type="button" disabled={busy || !canLaunch} onClick={() => void launch()} className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer disabled:opacity-50">{busy ? 'Opening…' : 'Launch pool'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
