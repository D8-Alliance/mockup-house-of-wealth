import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  DollarSign, 
  PieChart, 
  Calendar, 
  Percent, 
  BookOpen, 
  ArrowRight,
  ArrowLeft,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { poolService } from '../../pooling/poolService';
import { useRBAC } from '../../rbac/RBACContext';
import { PDPApplication } from '../pdpTypes';

interface PDPPoolCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdpApplication?: PDPApplication;
  onCreated?: () => void;
}

export const PDPPoolCreationModal: React.FC<PDPPoolCreationModalProps> = ({
  isOpen,
  onClose,
  pdpApplication,
  onCreated
}) => {
  const { currentUserId, currentRole } = useRBAC();
  const [step, setStep] = useState<number>(1);

  // Pool Details State
  const [poolName, setPoolName] = useState('');
  const [sector, setSector] = useState('Agri-Industrial & Clean Energy');
  const [shariahStructure, setShariahStructure] = useState<'MUDARABAH' | 'MUSHARAKAH' | 'IJARAH' | 'WAKALAH' | 'MURABAHAH' | 'WAQF'>('IJARAH');
  const [targetAmount, setTargetAmount] = useState<number>(5000000);
  const [currency, setCurrency] = useState(pdpApplication?.bankInfo?.currency || 'MYR');
  const [minimumInvestment, setMinimumInvestment] = useState<number>(5000);
  const [maximumInvestment, setMaximumInvestment] = useState<number>(500000);
  const [durationMonths, setDurationMonths] = useState<number>(36);
  const [expectedYieldPct, setExpectedYieldPct] = useState<number>(8.5);
  const [sponsorProfitSharePct, setSponsorProfitSharePct] = useState<number>(20);
  const [investorProfitSharePct, setInvestorProfitSharePct] = useState<number>(80);
  const [distributionFrequency, setDistributionFrequency] = useState<'Monthly' | 'Quarterly' | 'Semi-Annually' | 'Annually'>('Quarterly');
  const [managementFeePct, setManagementFeePct] = useState<number>(1.2);
  const [performanceFeePct, setPerformanceFeePct] = useState<number>(5.0);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orgName = pdpApplication?.organisationName || 'FELDA Technoplant Sdn Bhd';
    const orgId = pdpApplication?.id || 'ORG-FELDA-MYS';
    const countryCode = pdpApplication?.countryCode || 'MYS';

    poolService.createPool({
      poolName: poolName || `${orgName} Capital Pool Alpha`,
      projectId: `PROJ-${countryCode}-${Math.floor(100 + Math.random() * 900)}`,
      projectName: poolName || `${orgName} Expansion Project`,
      organisationId: orgId,
      organisationName: orgName,
      countryNodeId: `CN-${countryCode}`,
      poolType: sector as any,
      investmentStructure: shariahStructure as any,
      targetAmount,
      minimumAmount: targetAmount * 0.7,
      maximumAmount: targetAmount * 1.2,
      minimumInvestment,
      maximumInvestment,
      currency,
      durationMonths,
      indicativeExpectedReturn: expectedYieldPct,
      distributionFrequency: distributionFrequency as any
    }, currentUserId || 'USR-8821', currentRole);

    if (onCreated) onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-600 text-white">
                PDP WEALTH POOL STRUCTURING
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                Launch Shariah Wealth Pool
              </h3>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className={step >= 1 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>1. Pool Overview</span>
          <span>→</span>
          <span className={step >= 2 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>2. Financials & Yield</span>
          <span>→</span>
          <span className={step >= 3 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>3. Review & Launch</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wealth Pool Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FELDA Sustainable Palm Oil Biomass & Solar Infrastructure Pool"
                  value={poolName}
                  onChange={e => setPoolName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Shariah Contract Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={shariahStructure}
                    onChange={e => setShariahStructure(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="IJARAH">Ijarah (Lease & Asset Securitization)</option>
                    <option value="MUDARABAH">Mudarabah (Profit-Sharing Partnership)</option>
                    <option value="MUSHARAKAH">Musharakah (Joint Venture Equity)</option>
                    <option value="WAKALAH">Wakalah bi Al-Istithmar (Agency Investment)</option>
                    <option value="MURABAHAH">Murabahah (Cost-Plus Trade Syndication)</option>
                    <option value="WAQF">Cash Waqf Productive Endowment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sector Classification <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={sector}
                    onChange={e => setSector(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pool Investment Thesis & Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Outline underlying tangible assets, revenue generation model, and risk mitigations..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Capital Raise ({currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    required
                    value={targetAmount}
                    onChange={e => setTargetAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Indicative Yield (% p.a.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.1"
                    required
                    value={expectedYieldPct}
                    onChange={e => setExpectedYieldPct(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Minimum Ticket Size ({currency})
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={minimumInvestment}
                    onChange={e => setMinimumInvestment(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pool Duration (Months)
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="120"
                    value={durationMonths}
                    onChange={e => setDurationMonths(parseInt(e.target.value, 10) || 36)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Distribution Frequency
                  </label>
                  <select
                    value={distributionFrequency}
                    onChange={e => setDistributionFrequency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annually">Semi-Annually</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Profit Sharing (Sponsor : Investor)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={sponsorProfitSharePct}
                      onChange={e => {
                        const sp = parseFloat(e.target.value) || 0;
                        setSponsorProfitSharePct(sp);
                        setInvestorProfitSharePct(100 - sp);
                      }}
                      className="w-1/2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-center"
                    />
                    <input
                      type="number"
                      readOnly
                      value={investorProfitSharePct}
                      className="w-1/2 px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-center text-purple-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="font-extrabold text-slate-900 dark:text-white">{poolName || 'Untitled Wealth Pool'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
                    {shariahStructure}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                  <p>Target Capital: <span className="font-bold text-slate-900 dark:text-white">{currency} {targetAmount.toLocaleString()}</span></p>
                  <p>Expected Yield: <span className="font-bold text-emerald-600">{expectedYieldPct}% p.a.</span></p>
                  <p>Duration: <span className="font-bold text-slate-900 dark:text-white">{durationMonths} Months</span></p>
                  <p>Distributions: <span className="font-bold text-slate-900 dark:text-white">{distributionFrequency}</span></p>
                  <p>Profit Split: <span className="font-bold text-slate-900 dark:text-white">{sponsorProfitSharePct}% / {investorProfitSharePct}%</span></p>
                  <p>Originator (PDP): <span className="font-bold text-purple-600">{pdpApplication?.organisationName || 'FELDA Technoplant'}</span></p>
                </div>
              </div>

              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
                <p className="text-purple-900 dark:text-purple-200 text-[11px]">
                  Submitted pools enter the 17-step D-8 multi-sig governance approval pipeline (Shariah Board sign-off, Due Diligence audit, and Risk Assessment) before public discovery.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Pool for Multi-Sig Approval</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
