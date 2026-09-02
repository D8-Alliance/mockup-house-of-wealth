import React, { useState } from 'react';
import { 
  Building2, 
  Sparkles, 
  Layers, 
  Zap, 
  Star, 
  CheckCircle2, 
  ArrowUpRight, 
  Check, 
  X 
} from 'lucide-react';
import { PDPPlan } from '../../revenue/revenueTypes';
import { PDP_PLANS_CONFIG } from '../../revenue/revenueConfig';

interface PDPSubscriptionCardProps {
  currentTierId?: string;
  activeProjectsCount: number;
  onSelectPDPPlan?: (plan: PDPPlan) => void;
}

export const PDPSubscriptionCard: React.FC<PDPSubscriptionCardProps> = ({
  currentTierId = 'pdp_pro',
  activeProjectsCount,
  onSelectPDPPlan
}) => {
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(currentTierId);
  const currentPlan = PDP_PLANS_CONFIG.find(p => p.id === selectedPlanId) || PDP_PLANS_CONFIG[1];

  const handleUpgrade = (plan: PDPPlan) => {
    setSelectedPlanId(plan.id);
    if (onSelectPDPPlan) onSelectPDPPlan(plan);
    setShowPlansModal(false);
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl text-white space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Sponsor PDP Tier
            </span>
            <span className="text-xs text-slate-400 font-mono">FELDA / GLC Master Plan</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl sm:text-2xl font-black text-white">
              {currentPlan.name}
            </h3>
            <span className="text-xs text-amber-300 font-bold">
              {currentPlan.priceMYR === 0 ? 'Free Tier' : `RM ${currentPlan.priceMYR} / month`}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowPlansModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer transform hover:scale-105 shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Manage PDP Plan</span>
        </button>
      </div>

      {/* Quotas & Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Projects Quota */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              Active Projects
            </span>
            <span className="font-mono text-white">{activeProjectsCount} / {currentPlan.activeProjectLimit}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-400 h-2 rounded-full" 
              style={{ width: `${Math.min(100, Math.round((activeProjectsCount / currentPlan.activeProjectLimit) * 100))}%` }} 
            />
          </div>
          <div className="text-[10px] text-slate-400">
            {currentPlan.activeProjectLimit - activeProjectsCount} campaign slots remaining
          </div>
        </div>

        {/* Featured Promotion Slots */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" />
              Featured Slots
            </span>
            <span className="font-mono text-white">{currentPlan.featuredAllowanceMonthly} Included</span>
          </div>
          <div className="text-xs text-white font-semibold">
            {currentPlan.featuredAllowanceMonthly > 0 ? '1 Active Promotion Active' : 'Upgrade for Featured Slots'}
          </div>
          <div className="text-[10px] text-slate-400">
            Boost visibility on D-8 Marketplace
          </div>
        </div>

        {/* AI Drafting Credits */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Prospectus AI Credits
            </span>
            <span className="font-mono text-white">{currentPlan.aiCreditsMonthly} / mo</span>
          </div>
          <div className="text-xs text-white font-semibold">
            Automated Prospectus & Sukuk Drafts
          </div>
          <div className="text-[10px] text-slate-400">
            Refreshes monthly
          </div>
        </div>
      </div>

      {/* Modal to Switch PDP Plans */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative text-slate-900 dark:text-white">
            
            <button
              onClick={() => setShowPlansModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-xl font-black">
                Select PDP Sponsor Tier
              </h3>
              <p className="text-xs text-slate-500">
                Choose the optimal project development & capital pooling plan for your organisation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PDP_PLANS_CONFIG.map(plan => (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl border-2 flex flex-col justify-between space-y-3 ${
                    plan.id === selectedPlanId
                      ? 'border-amber-500 bg-amber-500/5'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm">{plan.name}</h4>
                    <div className="text-lg font-black text-amber-600">
                      {plan.priceMYR === 0 ? 'Free' : `RM ${plan.priceMYR}/mo`}
                    </div>
                    <ul className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={plan.id === selectedPlanId}
                    className="w-full py-2 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 cursor-pointer"
                  >
                    {plan.id === selectedPlanId ? 'Current Plan' : 'Switch Plan'}
                  </button>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
