import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  Layers, 
  Play, 
  Filter, 
  Plus, 
  Crown,
  Info,
  Calendar,
  FileText,
  Scale
} from 'lucide-react';
import { AIOperationKey, AIOperationConfig, AICreditBalanceBreakdown, AIUsageLogEntry } from './aiMonetisationTypes';
import { aiMonetisationService } from './aiMonetisationService';
import { apiClient, BackendCreditSummary, BackendCreditTransaction } from '../../services/apiClient';
import { AICreditConfirmationModal } from './AICreditConfirmationModal';
import { BuyAICreditsModal } from './BuyAICreditsModal';
import { 
  AI_INFORMATIONAL_DISCLAIMER, 
  AI_NON_ADVICE_DISCLAIMER 
} from './aiCreditPricingConfig';

interface AIUsageDashboardProps {
  userId?: string;
  onNavigateToMembership?: () => void;
}

export const AIUsageDashboard: React.FC<AIUsageDashboardProps> = ({
  userId = 'USR-8821',
  onNavigateToMembership
}) => {
  const [balance, setBalance] = useState<AICreditBalanceBreakdown>({ userId, availableBalance: 0, usedCredits: 0, remainingCredits: 0, usedThisMonth: 0, monthlyAllowance: 0, additionalCredits: 0, totalPoolCredits: 0, resetDate: '', userTier: 'FREE' });
  const [history, setHistory] = useState<AIUsageLogEntry[]>([]);
  const [operations] = useState<AIOperationConfig[]>(aiMonetisationService.getAIOperations());
  const [activeTestOp, setActiveTestOp] = useState<AIOperationKey | null>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');
  const [lastExecutedMessage, setLastExecutedMessage] = useState<string | null>(null);

  const refresh = async () => {
    const [summary, transactions] = await Promise.all([apiClient.getMembershipCreditSummary(), apiClient.getMembershipCreditUsage()]);
    setBalance(summary as BackendCreditSummary);
    setHistory(transactions.filter((item) => item.type === 'CONSUMPTION').map((item: BackendCreditTransaction) => { const operation = aiMonetisationService.getOperationConfig((item.operationKey || 'SIMPLE_QUERY') as AIOperationKey); return { id: item.id, userId, userName: 'Authenticated User', userTier: summary.userTier, operationKey: (item.operationKey || 'SIMPLE_QUERY') as AIOperationKey, operationName: operation.name, category: operation.category, targetEntity: item.targetEntity || undefined, creditCost: Math.abs(item.credits), timestamp: item.createdAt, status: 'SUCCESS', balanceBefore: item.balanceBefore, balanceAfter: item.balanceAfter, tokensConsumedEstimate: Math.abs(item.credits) * 480 }; }));
  };

  useEffect(() => { refresh().catch(() => undefined); }, [userId]);

  const usedPercent = Math.min(100, Math.round((balance.usedThisMonth / (balance.monthlyAllowance || 1)) * 100));

  const filteredHistory = history.filter(h => {
    if (historyFilter === 'ALL') return true;
    return h.operationKey === historyFilter;
  });

  const handleTestOpConfirm = () => {
    if (activeTestOp) {
      const opConfig = aiMonetisationService.getOperationConfig(activeTestOp);
      setLastExecutedMessage(`Successfully executed "${opConfig.name}" (-${opConfig.creditCost} credits deducted).`);
      refresh().catch(() => undefined);
      setTimeout(() => setLastExecutedMessage(null), 5000);
    }
    setActiveTestOp(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans text-xs">
      {/* Toast Notification */}
      {lastExecutedMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{lastExecutedMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-600">Balance Updated</span>
        </div>
      )}

      {/* Credit Balance 4-Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-200 uppercase tracking-wider">Remaining Balance</span>
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30">
              <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono tracking-tight text-white">
              {balance.availableBalance}
            </div>
            <span className="text-[10px] text-purple-200">AI Credits Available</span>
          </div>
          <div className="pt-2 border-t border-purple-800/60 flex items-center justify-between text-[10.5px]">
            <span className="text-purple-300">Tier: <strong className="text-white">{balance.userTier}</strong></span>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              + Top Up
            </button>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Used This Month</span>
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700">
              <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {balance.usedThisMonth}
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full transition-all" style={{ width: `${usedPercent}%` }} />
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10.5px] text-slate-500">
            <span>{usedPercent}% of allowance</span>
            <span>{history.length} ops logged</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Allowance</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {balance.monthlyAllowance}
            </div>
            <span className="text-[10px] text-slate-400">Granted automatically each cycle</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10.5px] text-slate-500">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Resets: {balance.resetDate}</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Additional Credits</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {balance.additionalCredits}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold">Non-expiring purchased pack</span>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10.5px]">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
            >
              Buy More Credits →
            </button>
          </div>
        </div>
      </div>

      {/* Operation Pricing & Interactive Runner Grid */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase">
                Configurable Credit Schedule
              </span>
              <span className="text-[11px] text-slate-400">7 Core AI Capabilities</span>
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
              AI Operations & Credit Consumption Schedule
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTopUpModal(true)}
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Buy Additional Credits
            </button>
            {onNavigateToMembership && (
              <button
                onClick={onNavigateToMembership}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Upgrade Plan
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {operations.map(op => {
            const hasCredits = balance.availableBalance >= op.creditCost;
            return (
              <div
                key={op.key}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
                      {op.category}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      {op.creditCost} Credits
                    </span>
                  </div>

                  <h3 className="font-extrabold text-xs text-slate-900 dark:text-white mt-2 group-hover:text-purple-600 transition-colors">
                    {op.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {op.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">~{op.avgExecutionTimeSec}s avg</span>
                  <button
                    onClick={() => setActiveTestOp(op.key)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold text-[10.5px] flex items-center gap-1 cursor-pointer transition-all ${
                      hasCredits 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3 h-3" /> Test & Consume
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Usage History Ledger */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              AI Credit Consumption Ledger & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable audit log of all AI operations executed with associated token consumption estimates.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>
            {[
              { id: 'ALL', label: 'All Operations' },
              { id: 'DUE_DILIGENCE', label: 'Due Diligence (30)' },
              { id: 'CONTRACT_ANALYSIS', label: 'Contract (20)' },
              { id: 'RISK_ANALYSIS', label: 'Risk (15)' },
              { id: 'INVESTMENT_ANALYSIS', label: 'Investment (10)' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setHistoryFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                  historyFilter === f.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-[10.5px] uppercase font-bold text-slate-500">
                <th className="p-3">Log ID & Date</th>
                <th className="p-3">AI Operation</th>
                <th className="p-3">Target Scope</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Cost (Credits)</th>
                <th className="p-3 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filteredHistory.map(entry => (
                <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-900 dark:text-white">{entry.id}</div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" /> {entry.timestamp}
                    </span>
                  </td>
                  <td className="p-3 font-sans">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {entry.operationName}
                    </div>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">
                      {entry.category} • ~{entry.tokensConsumedEstimate} tokens
                    </span>
                  </td>
                  <td className="p-3 font-sans text-slate-600 dark:text-slate-300">
                    {entry.targetEntity || 'Shariah Wealth Matrix'}
                  </td>
                  <td className="p-3 font-sans">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {entry.status}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-purple-600 dark:text-purple-400">
                    -{entry.creditCost}
                  </td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                    {entry.balanceAfter}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Disclaimers Banner */}
      <div className="p-5 rounded-3xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Regulatory Shariah & Financial Decision Support Disclaimers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20">
            <strong>Informational Notice:</strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
              "{AI_INFORMATIONAL_DISCLAIMER}"
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-amber-500/20">
            <strong>Non-Advisory Mandate:</strong>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed">
              "{AI_NON_ADVICE_DISCLAIMER}"
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeTestOp && (
        <AICreditConfirmationModal
          operationKey={activeTestOp}
          userId={userId}
          targetEntity="FELDA Agri Expansion & Shariah Audit"
          onClose={() => setActiveTestOp(null)}
          onConfirm={handleTestOpConfirm}
          onOpenTopUpModal={() => setShowTopUpModal(true)}
          onOpenMembershipModal={onNavigateToMembership}
        />
      )}

      {/* Top Up Modal */}
      {showTopUpModal && (
        <BuyAICreditsModal
          userId={userId}
          onClose={() => setShowTopUpModal(false)}
        />
      )}
    </div>
  );
};
