import React, { useState } from 'react';
import { X, Save, Layers, Lock } from 'lucide-react';
import { poolService } from './poolService';
import { Project } from '../projects/projectTypes';
import { useRBAC } from '../rbac/RBACContext';

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

  if (!isOpen || !project) return null;

  const handleCreatePool = () => {
    poolService.createPool({
      poolName: poolName || `${project.projectName} Sukuk Pool`,
      projectId: project.projectId,
      projectName: project.projectName,
      organisationId: project.organisationId,
      organisationName: project.organisationName,
      countryNodeId: project.countryNodeId,
      poolType: project.sector as any,
      investmentStructure: project.proposedShariahContract as any,
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

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
            <strong>Segregation of Duties & Multi-Sig Requirements:</strong>
            <p>Pool creation requires 4 independent governance approvals (Shariah Board, Compliance Officer, Chief Risk Officer, Authorised Executive) before the pool can be opened for investor subscriptions.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 text-xs pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-700">Cancel</button>
          <button onClick={handleCreatePool} className="px-4 py-2 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" />
            Create Pool Draft
          </button>
        </div>
      </div>
    </div>
  );
};
