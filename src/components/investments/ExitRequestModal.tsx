import React from 'react';
import { LogOut, CheckCircle2, X } from 'lucide-react';

export interface InvestmentPosition {
  id: string;
  poolName: string;
  category: string;
  principal: number;
  currentValuation: number;
  returnsEarned: number;
  roiPct: string;
  joinedDate: string;
  contractType: string;
  status: 'Active' | 'Exit Requested' | 'Liquidated';
}

interface ExitRequestModalProps {
  position: InvestmentPosition;
  exitReason: string;
  setExitReason: (val: string) => void;
  exitSubmitted: boolean;
  onConfirmExit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ExitRequestModal: React.FC<ExitRequestModalProps> = ({
  position,
  exitReason,
  setExitReason,
  exitSubmitted,
  onConfirmExit,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <LogOut className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Request Investment Exit</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {exitSubmitted ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Exit Request Logged</h4>
            <p className="text-xs text-slate-500">Your liquidity exit request has been sent to the Pool Manager for settlement.</p>
          </div>
        ) : (
          <form onSubmit={onConfirmExit} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="text-slate-400 font-bold">Target Pool</div>
              <div className="font-extrabold text-slate-900 dark:text-white">{position.poolName}</div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span>Principal to Liquidate:</span>
                <span className="font-bold">${position.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Current Market Value:</span>
                <span className="font-bold text-emerald-600">${position.currentValuation.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Exit / Redemption
              </label>
              <textarea 
                rows={3}
                required
                value={exitReason}
                onChange={e => setExitReason(e.target.value)}
                placeholder="e.g. Rebalancing capital into new Waqf Sukuk pool..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300">
              Notice: Under Mudarabah rules, early liquidations undergo a 3-day notice clearance period to protect pool stability.
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Submit Exit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
