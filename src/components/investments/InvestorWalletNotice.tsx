import React from 'react';
import { Wallet } from 'lucide-react';

/**
 * Investors have no wallet yet: their money is booked in the pool's accounts when Finance confirms the transfer,
 * not in an account of their own. Until investor accounts are designed (PENDING_ACTIVITIES), the tab says so.
 */
export const InvestorWalletNotice: React.FC<{ onOpenInvestments: () => void; onOpenFinancials: () => void }> = ({ onOpenInvestments, onOpenFinancials }) => (
  <div className="space-y-6 animate-fade-in">
    <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Wallet className="w-6 h-6 text-emerald-600" />Multi-Wallet</h2>
    <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-sm text-amber-900 dark:text-amber-100 space-y-3">
      <p className="font-black">Not available yet for investors.</p>
      <p>You do not hold a cash balance on the platform. You transfer money for each order to the platform's trust account; once Finance confirms it, it is booked in the pool you invested in, and your profit is paid to your verified bank account. A wallet with your own balances per currency is planned but needs the investor accounts to be designed with Finance first.</p>
      <p>Meanwhile your holdings and profit are here:</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onOpenInvestments} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">Investments: positions and profit</button>
        <button type="button" onClick={onOpenFinancials} className="px-4 py-2 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer">Financials: my transactions and statements</button>
      </div>
    </div>
  </div>
);
