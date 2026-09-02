import React, { useState } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  ShieldCheck, 
  Clock, 
  DollarSign, 
  PieChart as PieIcon, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ExitRequestModal, InvestmentPosition } from './investments/ExitRequestModal';

interface InvestmentsViewProps {
  lang: LanguageCode;
  onNavigateMarketplace: () => void;
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  lang,
  onNavigateMarketplace
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'profit' | 'exits'>('overview');
  const [showExitModal, setShowExitModal] = useState<InvestmentPosition | null>(null);
  const [exitReason, setExitReason] = useState('');
  const [exitSubmitted, setExitSubmitted] = useState(false);

  const [positions, setPositions] = useState<InvestmentPosition[]>([
    {
      id: 'INV-901',
      poolName: 'Kuala Lumpur Green Logistics Sukuk',
      category: 'Sukuk / Property',
      principal: 250000,
      currentValuation: 278500,
      returnsEarned: 28500,
      roiPct: '+11.4%',
      joinedDate: '2025-01-15',
      contractType: 'Mudarabah',
      status: 'Active'
    },
    {
      id: 'INV-902',
      poolName: 'Jakarta Micro-Agribusiness Liquidity Pool',
      category: 'Agriculture',
      principal: 100000,
      currentValuation: 109200,
      returnsEarned: 9200,
      roiPct: '+9.2%',
      joinedDate: '2025-03-01',
      contractType: 'Musharakah',
      status: 'Active'
    },
    {
      id: 'INV-903',
      poolName: 'Islamabad Enclave Luxury Tower Tokenized Yield',
      category: 'Real Estate',
      principal: 500000,
      currentValuation: 562000,
      returnsEarned: 62000,
      roiPct: '+12.4%',
      joinedDate: '2024-11-10',
      contractType: 'Ijarah',
      status: 'Active'
    },
    {
      id: 'INV-904',
      poolName: 'Istanbul Tech Waqf Endowment Pool',
      category: 'Waqf / Startup',
      principal: 50000,
      currentValuation: 50000,
      returnsEarned: 3500,
      roiPct: '+7.0%',
      joinedDate: '2024-08-20',
      contractType: 'Waqf',
      status: 'Exit Requested'
    }
  ]);

  const totalPrincipal = positions.reduce((acc, p) => acc + p.principal, 0);
  const totalValuation = positions.reduce((acc, p) => acc + p.currentValuation, 0);
  const totalReturns = positions.reduce((acc, p) => acc + p.returnsEarned, 0);

  const handleConfirmExit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showExitModal) return;
    setPositions(positions.map(p => p.id === showExitModal.id ? { ...p, status: 'Exit Requested' } : p));
    setExitSubmitted(true);
    setTimeout(() => {
      setExitSubmitted(false);
      setShowExitModal(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2 border border-indigo-500/20">
            Portfolio & Liquidity Engine
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Investment Portfolio & ROI Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track active pool participations, liquid exit requests, Mudarabah profit payouts, and ROI growth metrics.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onNavigateMarketplace}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Browse New Pools</span>
          </button>
        </div>
      </div>

      {/* High-level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Capital Deployed</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">${totalPrincipal.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 4 Active Pool Holdings
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Portfolio Valuation</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${totalValuation.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-emerald-500 mt-2 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> +11.8% Weighted Annualized
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Mudarabah Returns</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">${totalReturns.toLocaleString()}</div>
          <div className="text-[11px] font-semibold text-blue-500 mt-2 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5" /> Auto-Swept to Profit Wallet
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Exit Requests</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {positions.filter(p => p.status === 'Exit Requested').length} Pending
          </div>
          <div className="text-[11px] font-semibold text-amber-500 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Under Clearance Stage
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Active Positions
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Investment History
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profit'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Profit Distribution & ROI
        </button>
        <button
          onClick={() => setActiveTab('exits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exits'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Exit Requests
        </button>
      </div>

      {/* Table / Details */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
            {activeTab === 'overview' && 'My Active Pool Investments'}
            {activeTab === 'history' && 'Complete Historical Transactions'}
            {activeTab === 'profit' && 'Mudarabah Payout Distribution Schedule'}
            {activeTab === 'exits' && 'Exit Request Liquidation Queue'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                <th className="p-4">Pool & Asset</th>
                <th className="p-4">Contract Structure</th>
                <th className="p-4">Principal ($)</th>
                <th className="p-4">Current Value ($)</th>
                <th className="p-4">Profit Earned ($)</th>
                <th className="p-4">ROI %</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
              {positions.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 font-bold text-slate-900 dark:text-white">
                    <div>{p.poolName}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{p.id} • {p.category}</div>
                  </td>
                  <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10px]">
                      {p.contractType}
                    </span>
                  </td>
                  <td className="p-4 font-semibold">${p.principal.toLocaleString()}</td>
                  <td className="p-4 font-extrabold text-slate-900 dark:text-white">${p.currentValuation.toLocaleString()}</td>
                  <td className="p-4 font-extrabold text-emerald-600 dark:text-emerald-400">+${p.returnsEarned.toLocaleString()}</td>
                  <td className="p-4 font-extrabold text-emerald-600 dark:text-emerald-400">{p.roiPct}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                      p.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      p.status === 'Exit Requested' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      'bg-slate-500/10 text-slate-500 border-slate-500/20'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {p.status === 'Active' ? (
                      <button
                        onClick={() => setShowExitModal(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition-all cursor-pointer border border-rose-200 dark:border-rose-800/40"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Exit Request</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Processing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Exit Request Modal */}
      {showExitModal && (
        <ExitRequestModal
          position={showExitModal}
          exitReason={exitReason}
          setExitReason={setExitReason}
          exitSubmitted={exitSubmitted}
          onConfirmExit={handleConfirmExit}
          onClose={() => setShowExitModal(null)}
        />
      )}

    </div>
  );
};
