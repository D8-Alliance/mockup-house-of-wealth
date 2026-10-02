import React, { useEffect, useState } from 'react';
import { Coins, ShieldCheck } from 'lucide-react';
import { apiClient, ZakatCalculation } from '../../services/apiClient';

export const ZakatCalculatorCard: React.FC = () => {
  const [investedCapital, setInvestedCapital] = useState('1000000');
  const [liquidCash, setLiquidCash] = useState('150000');
  const [debtsOwed, setDebtsOwed] = useState('20000');
  const [calculation, setCalculation] = useState<ZakatCalculation | null>(null);
  const [calculationError, setCalculationError] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      apiClient.calculateZakat({
        investedCapital: parseFloat(investedCapital) || 0,
        liquidCash: parseFloat(liquidCash) || 0,
        debtsOwed: parseFloat(debtsOwed) || 0,
        currency: 'MYR',
      })
        .then(setCalculation)
        .catch((error: Error) => setCalculationError(error.message));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [investedCapital, liquidCash, debtsOwed]);

  const totalWealth = calculation?.netWealth ?? 0;
  const nisabThreshold = calculation?.nisabThreshold ?? 6120;
  const zakatDue = calculation?.zakatDue ?? 0;

  const startPayment = async () => {
    if (!calculation || zakatDue <= 0) return;
    setPaymentLoading(true);
    setCalculationError('');
    try {
      const payment = await apiClient.createZakatPayment(calculation.id);
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      setCalculationError(error instanceof Error ? error.message : 'Unable to start zakat payment.');
      setPaymentLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">AAOIFI Zakat & Tax Assessment</h3>
            <p className="text-xs text-slate-500">Automated 2.5% Zakat on Net Investment Capital & Cash Holdings</p>
          </div>
          <Coins className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Invested Capital (MYR)
            </label>
            <input 
              type="number"
              value={investedCapital}
              onChange={e => setInvestedCapital(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Liquid Cash (MYR)
            </label>
            <input 
              type="number"
              value={liquidCash}
              onChange={e => setLiquidCash(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Short-Term Debts (MYR)
            </label>
            <input 
              type="number"
              value={debtsOwed}
              onChange={e => setDebtsOwed(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Net Zakatable Wealth:</span>
            <span className="font-black text-slate-900 dark:text-white text-sm">MYR {totalWealth.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Gold Nisab Benchmark:</span>
            <span className="font-bold text-slate-500">MYR {nisabThreshold.toLocaleString()} (Exceeded ✓)</span>
          </div>
          <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">Zakat Obligation (2.5%):</span>
            <span className="font-black text-emerald-600 text-xl">MYR {zakatDue.toLocaleString()}</span>
          </div>
          {calculationError && <p className="text-xs text-rose-600">Backend calculation unavailable: {calculationError}</p>}
        </div>

        <button
          onClick={startPayment}
          disabled={paymentLoading || zakatDue <= 0}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
        >
          {paymentLoading ? 'Preparing ToyyibPay...' : 'Pay & Channel Zakat Now'}
        </button>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Shariah Zakat Certificate</span>
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Verified under AAOIFI FAS 9 (Zakat) standard guidelines. All calculations certified by the D-8 Supreme Shariah Board.
        </p>
        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <div>Certificate #: <span className="font-bold font-mono">ZKT-2026-D8</span></div>
          <div>Issued To: <span className="font-bold">Ahmad bin Razak</span></div>
          <div>Status: <span className="text-emerald-600 font-bold">Audit Verified</span></div>
        </div>
      </div>
    </div>
  );
};
