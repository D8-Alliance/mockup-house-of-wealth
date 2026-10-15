import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { poolService } from './poolService';
import { Project } from '../projects/projectTypes';
import { useRBAC } from '../rbac/RBACContext';
import { AKAD_LABELS, AKAD_MAX_INVESTOR_PCT, akadApi, AkadType } from '../services/akadApi';

const akadFromContract = (contract: string): AkadType => (['Musharakah', 'Wakalah', 'Ijarah'].includes(contract) ? contract.toUpperCase() : 'MUDARABAH') as AkadType;

interface PoolCreationModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

export const PoolCreationModal: React.FC<PoolCreationModalProps> = ({ isOpen, project, onClose, onSaved }) => {
  const { activeUser, currentRole } = useRBAC();

  const [poolName, setPoolName] = useState('');
  const [targetAmount, setTargetAmount] = useState(8000000);
  const [minimumInvestment, setMinimumInvestment] = useState(10000);
  const [maximumInvestment, setMaximumInvestment] = useState(1000000);
  const [durationMonths, setDurationMonths] = useState(60);
  const [indicativeExpectedReturn, setIndicativeExpectedReturn] = useState(8.5);
  const [distributionFrequency, setDistributionFrequency] = useState<'Quarterly' | 'Semi-Annually' | 'Annually'>('Quarterly');
  const [akadType, setAkadType] = useState<AkadType | null>(null);
  const [investorProfitSharePct, setInvestorProfitSharePct] = useState(70);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !project) return null;
  const akad = akadType || akadFromContract(project.proposedShariahContract);

  // The server creates the pool with version 1 of its akad terms; the local list mirrors it.
  const handleCreatePool = async () => {
    setBusy(true);
    setError('');
    let created: { poolId: string; status: string };
    try {
      created = await akadApi.createPool({ projectId: project.projectId, poolName: poolName || `${project.projectName} Sukuk Pool`, currency: project.currency, indicativeExpectedReturn, organisationId: project.organisationId, countryNodeId: project.countryNodeId, akadType: akad, investorProfitSharePct });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The pool could not be created.');
      setBusy(false);
      return;
    }
    setBusy(false);
    poolService.createPool({
      poolId: created.poolId,
      status: created.status as any,
      poolName: poolName || `${project.projectName} Sukuk Pool`,
      projectId: project.projectId,
      projectName: project.projectName,
      organisationId: project.organisationId,
      organisationName: project.organisationName,
      countryNodeId: project.countryNodeId,
      poolType: project.sector as any,
      investmentStructure: AKAD_LABELS[akad] as any,
      targetAmount,
      minimumAmount: targetAmount * 0.6,
      maximumAmount: targetAmount * 1.2,
      minimumInvestment,
      maximumInvestment,
      currency: project.currency,
      durationMonths,
      indicativeExpectedReturn,
      distributionFrequency
    }, activeUser.id, currentRole);

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
              POOL MANAGER DESK
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Structure Wealth Pool</h2>
            <p className="text-xs text-slate-500">Project: {project.projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pool Name</label>
            <input
              type="text"
              value={poolName}
              onChange={e => setPoolName(e.target.value)}
              placeholder={`e.g. ${project.projectName} Sukuk Pool A`}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Capital ({project.currency})</label>
              <input
                type="number"
                value={targetAmount}
                onChange={e => setTargetAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Indicative Return (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                value={indicativeExpectedReturn}
                onChange={e => setIndicativeExpectedReturn(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Min. Investment per Order</label>
              <input
                type="number"
                value={minimumInvestment}
                onChange={e => setMinimumInvestment(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Distribution Frequency</label>
              <select
                value={distributionFrequency}
                onChange={e => setDistributionFrequency(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Quarterly">Quarterly</option>
                <option value="Semi-Annually">Semi-Annually</option>
                <option value="Annually">Annually</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Akad</label>
              <select value={akad} onChange={e => { const type = e.target.value as AkadType; setAkadType(type); setInvestorProfitSharePct(Math.min(investorProfitSharePct, AKAD_MAX_INVESTOR_PCT[type])); }} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">
                {(Object.keys(AKAD_LABELS) as AkadType[]).map(type => <option key={type} value={type}>{AKAD_LABELS[type]}</option>)}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Investor profit share (%)</label>
              <input type="number" min={1} max={AKAD_MAX_INVESTOR_PCT[akad]} step={0.01} value={investorProfitSharePct} onChange={e => setInvestorProfitSharePct(Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
              <span className="text-[10px] text-slate-500">Manager share: {Math.max(0, 100 - investorProfitSharePct)}%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
            <strong>Before the pool opens</strong>
            <p>The server only creates a pool for a project whose feasibility has a final approval (including the Shariah Committee decision). The pool opens with these akad terms as version 1; they cannot change once an investor accepts them.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-[11px] font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 text-xs pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-700">Cancel</button>
          <button onClick={() => void handleCreatePool()} disabled={busy || investorProfitSharePct < 1 || investorProfitSharePct > AKAD_MAX_INVESTOR_PCT[akad]} className="px-4 py-2 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1.5 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />
            {busy ? 'Creating…' : 'Create pool'}
          </button>
        </div>
      </div>
    </div>
  );
};
