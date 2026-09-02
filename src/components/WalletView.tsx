import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  RefreshCw, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  TrendingUp, 
  Send, 
  Download, 
  PlusCircle,
  X
} from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface SubWallet {
  id: string;
  name: string;
  type: 'investment' | 'cash' | 'profit' | 'locked' | 'withdrawal';
  balance: number;
  currency: string;
  description: string;
  color: string;
  badgeBg: string;
}

export const WalletView: React.FC = () => {
  const [wallets, setWallets] = useState<SubWallet[]>([
    {
      id: 'WAL-01',
      name: 'Investment Wallet',
      type: 'investment',
      balance: 1240500,
      currency: 'USD',
      description: 'Capital currently deployed in active Sukuk, Waqf, and RWA Pools.',
      color: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    },
    {
      id: 'WAL-02',
      name: 'Cash Wallet',
      type: 'cash',
      balance: 184250,
      currency: 'USD',
      description: 'Liquid funds available for instant pool investments or bank transfers.',
      color: 'from-emerald-600 to-teal-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      id: 'WAL-03',
      name: 'Profit Wallet',
      type: 'profit',
      balance: 42800,
      currency: 'USD',
      description: 'Accumulated Mudarabah and Musharakah dividend returns ready for payout.',
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
      id: 'WAL-04',
      name: 'Locked Wallet',
      type: 'locked',
      balance: 150000,
      currency: 'USD',
      description: 'Collateral reserves and lock-up capital under active contract tenure.',
      color: 'from-purple-600 to-pink-600',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    {
      id: 'WAL-05',
      name: 'Withdrawal Wallet',
      type: 'withdrawal',
      balance: 25000,
      currency: 'USD',
      description: 'Funds currently clearing SWIFT / D-8 interbank settlement channels.',
      color: 'from-slate-700 to-slate-900',
      badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
    }
  ]);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromWallet, setFromWallet] = useState('WAL-03');
  const [toWallet, setToWallet] = useState('WAL-02');
  const [transferAmount, setTransferAmount] = useState('10000');
  const [autoReinvest, setAutoReinvest] = useState(true);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount) || 0;
    if (amt <= 0) return;

    setWallets(wallets.map(w => {
      if (w.id === fromWallet) return { ...w, balance: Math.max(0, w.balance - amt) };
      if (w.id === toWallet) return { ...w, balance: w.balance + amt };
      return w;
    }));
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2 border border-emerald-500/20">
            D-8 Enterprise Treasury & Multi-Wallet
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Multi-Wallet Treasury System
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Segmented Islamic wealth wallets for Investment, Cash, Profit Dividends, Collateral Lock-up, and SWIFT Withdrawals.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Transfer / Reinvest Profits</span>
          </button>
        </div>
      </div>

      {/* Global Net Worth Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-1">Total Vault Net Assets</div>
          <div className="text-4xl font-black tracking-tight">${totalBalance.toLocaleString()} USD</div>
          <div className="text-xs text-emerald-100 mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-300" /> Segregated Custody under Central Bank & AAOIFI Standards
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
          <div className="text-xs">
            <div className="text-emerald-200 font-bold">Auto-Reinvest Profits</div>
            <div className="text-[11px] text-emerald-100">Automatically sweep Mudarabah yields into Cash</div>
          </div>
          <button
            onClick={() => setAutoReinvest(!autoReinvest)}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
              autoReinvest ? 'bg-emerald-400' : 'bg-white/30'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-slate-900 transition-transform ${
              autoReinvest ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* 5 Sub-Wallets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map(w => (
          <div 
            key={w.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg transition-all"
          >
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase tracking-wider ${w.badgeBg}`}>
                  {w.id} • {w.type}
                </span>
                <Wallet className="w-5 h-5 text-slate-400" />
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">
                {w.name}
              </h3>

              <div className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                ${w.balance.toLocaleString()} <span className="text-xs font-bold text-slate-400">{w.currency}</span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {w.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <button
                onClick={() => {
                  setFromWallet(w.id);
                  setShowTransferModal(true);
                }}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Move Balance</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => alert(`Generating statement for ${w.name}...`)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Statement
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Transfer / Sweeping Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 relative space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Inter-Wallet Internal Transfer</h3>
                  <p className="text-xs text-slate-500">Zero-Fee Internal Treasury Transfer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Source Wallet
                  </label>
                  <select
                    value={fromWallet}
                    onChange={e => setFromWallet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (${w.balance.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Wallet
                  </label>
                  <select
                    value={toWallet}
                    onChange={e => setToWallet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {wallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (${w.balance.toLocaleString()})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Transfer Amount ($)
                </label>
                <input 
                  type="number"
                  required
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-700 dark:text-emerald-300">
                Transfers between internal wallets execute instantaneously on the House of Wealth cryptographic ledger.
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
