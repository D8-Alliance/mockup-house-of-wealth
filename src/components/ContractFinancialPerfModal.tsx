import React from 'react';
import { 
  X, 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  HeartHandshake, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  Download
} from 'lucide-react';
import { ContractItem } from '../types';

interface ContractFinancialPerfModalProps {
  contract: ContractItem;
  onClose: () => void;
}

export const ContractFinancialPerfModal: React.FC<ContractFinancialPerfModalProps> = ({
  contract,
  onClose
}) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                Financial Performance Analysis
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {contract.title}
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-400 text-xs font-bold block mb-1">Total Portfolio Value</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${contract.currentValue.toLocaleString()}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-400 text-xs font-bold block mb-1">YTD Profit Realized</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+${contract.ytdProfit.toLocaleString()}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-slate-400 text-xs font-bold block mb-1">Agreement Ratio</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{contract.profitRatio}</span>
          </div>
        </div>

        {/* Distribution Breakdown Pie Chart Representation */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Yield & Distribution Breakdown</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Visual Conic Representation */}
            <div className="w-36 h-36 rounded-full conic-chart relative shrink-0 flex items-center justify-center shadow-inner">
              <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex flex-col items-center justify-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Net Return</span>
                <span className="text-base font-black text-slate-900 dark:text-white">100%</span>
              </div>
            </div>

            <div className="space-y-2.5 w-full text-xs font-medium">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-700 dark:text-slate-300">Investor Net Profit ({contract.mySharePercent}%)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">${(contract.ytdProfit * 0.65).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-700" />
                  <span className="text-slate-700 dark:text-slate-300">Manager Reinvestment (20%)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">${(contract.ytdProfit * 0.20).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-700 dark:text-slate-300">Auto Zakat Allocation (2.5%)</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">${(contract.ytdProfit * 0.025).toFixed(2)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Shariah Verification Status */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>Verified and audited under AAOIFI Shariah standards by Amanah Shariah Advisors on Aug 01, 2026.</span>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={() => alert("Downloading PDF performance report...")}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Audit PDF</span>
          </button>

          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
