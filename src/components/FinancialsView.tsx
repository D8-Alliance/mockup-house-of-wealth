import React, { useState } from 'react';
import { 
  Coins, 
  FileText, 
  Calculator, 
  Download, 
  Search, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Building, 
  Globe2, 
  Clock, 
  FileSpreadsheet,
  HelpCircle
} from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ZakatCalculatorCard } from './financials/ZakatCalculatorCard';
import { StatementsPanel } from './financials/StatementsPanel';
import { TaxStatementPanel } from './financials/TaxStatementPanel';

interface FinancialTransaction {
  id: string;
  type: 'Profit Disbursement' | 'Capital Injection' | 'Zakat Channeling' | 'SWIFT Settlement' | 'Fee Deduction';
  amount: number;
  date: string;
  counterparty: string;
  status: 'Settled' | 'Pending Clearance' | 'Processing';
  referenceHash: string;
}

export const FinancialsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'statements' | 'profit' | 'zakat' | 'settlement'>('transactions');
  const [searchTerm, setSearchTerm] = useState('');


  // Transactions list
  const [transactions] = useState<FinancialTransaction[]>([
    {
      id: 'TX-8081',
      type: 'Profit Disbursement',
      amount: 28500,
      date: '2026-07-28 14:22',
      counterparty: 'KL Logistics Sukuk Mudarib',
      status: 'Settled',
      referenceHash: '0x9a8f...32b1'
    },
    {
      id: 'TX-8082',
      type: 'Zakat Channeling',
      amount: 12500,
      date: '2026-07-20 09:15',
      counterparty: 'D-8 Central Zakat & Waqf Foundation',
      status: 'Settled',
      referenceHash: '0x4c21...87e9'
    },
    {
      id: 'TX-8083',
      type: 'Capital Injection',
      amount: 250000,
      date: '2026-07-15 11:00',
      counterparty: 'Malayan Islamic Banking Corp',
      status: 'Settled',
      referenceHash: '0x1e55...09a4'
    },
    {
      id: 'TX-8084',
      type: 'SWIFT Settlement',
      amount: 50000,
      date: '2026-08-01 16:40',
      counterparty: 'Meezan Bank - SWIFT OUT',
      status: 'Pending Clearance',
      referenceHash: '0x7b34...12c8'
    }
  ]);

  const filteredTx = transactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.counterparty.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 mb-2 border border-cyan-500/20">
            Islamic Financial Accounting & Audit
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Module & Zakat Reporting
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Complete transaction accounting, Mudarabah profit sharing splits, Nisab-verified Zakat calculations, and SWIFT settlements.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('statements')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Statement</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'transactions' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Transactions Ledger
        </button>
        <button
          onClick={() => setActiveTab('zakat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'zakat' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Zakat
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profit' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Profit Sharing Calculator
        </button>
        <button
          onClick={() => setActiveTab('settlement')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settlement' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          SWIFT Clearance Queue
        </button>
        <button
          onClick={() => setActiveTab('statements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'statements' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Statements
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search transactions..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-bold">{filteredTx.length} Entries Found</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                  <th className="p-3.5">ID & Reference</th>
                  <th className="p-3.5">Transaction Type</th>
                  <th className="p-3.5">Counterparty</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Amount ($)</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                {filteredTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      <div>{tx.id}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.referenceHash}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-700 dark:text-slate-300">{tx.type}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{tx.counterparty}</td>
                    <td className="p-3.5 text-slate-500">{tx.date}</td>
                    <td className="p-3.5 font-black text-slate-900 dark:text-white">${tx.amount.toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        tx.status === 'Settled' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'zakat' && (
        <ZakatCalculatorCard />
      )}

      {activeTab === 'profit' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm max-w-2xl space-y-5">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Mudarabah Profit Split Calculator</h3>
          <p className="text-xs text-slate-500">Calculate profit sharing ratios between Capital Provider (Rab-ul-Mal) and Enterprise Manager (Mudarib).</p>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-400 mb-1">Capital Provider Share</div>
              <div className="text-xl font-black text-emerald-600">70%</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-400 mb-1">Mudarib Manager Share</div>
              <div className="text-xl font-black text-blue-600">30%</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settlement' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">SWIFT Interbank Settlement Clearance</h3>
          <p className="text-xs text-slate-500">Cross-border transfers cleared via central D-8 node clearance network.</p>
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">SWIFT Transfer #SW-9021</div>
              <div className="text-slate-400">$50,000 USD → Malayan Banking Berhad</div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
              Clearing Stage 2/3
            </span>
          </div>
        </div>
      )}

      {activeTab === 'statements' && <div className="space-y-6"><StatementsPanel /><TaxStatementPanel /></div>}

    </div>
  );
};
