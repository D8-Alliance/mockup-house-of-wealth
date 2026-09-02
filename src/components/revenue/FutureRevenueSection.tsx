import React from 'react';
import { 
  ShieldAlert, 
  Clock, 
  Building2, 
  Scale, 
  Coins, 
  Layers, 
  ExternalLink 
} from 'lucide-react';
import { FUTURE_REVENUE_CONFIG } from '../../revenue/revenueConfig';

export const FutureRevenueSection: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Regulatory Governance Sandbox
            </span>
            <span className="text-xs text-slate-400 font-mono">Phase 2 & Phase 3 Pipeline</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Future & Regulatory-Dependent Revenue Streams
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            The following revenue models are subject to regional financial authority licensing, regulatory sandbox clearance, and cross-border Shariah capital market approvals.
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-right shrink-0">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Status:</span>
          <span className="text-xs font-black text-rose-400 font-mono">PENDING SANDBOX</span>
        </div>
      </div>

      {/* Grid of Future Items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FUTURE_REVENUE_CONFIG.map(item => (
          <div
            key={item.id}
            className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.regulatoryStatus}
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{item.category}</span>
              </div>

              <div>
                <h4 className="font-black text-base text-white">
                  {item.name}
                </h4>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Target Timeline: <strong className="text-slate-200">{item.projectedTimeline}</strong></span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Target Regulatory Authorities:</span>
                <div className="flex flex-wrap gap-1">
                  {item.targetJurisdictions.map((jur, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono">
                      {jur}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
