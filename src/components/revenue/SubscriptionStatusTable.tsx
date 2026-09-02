import React from 'react';
import { 
  Users, 
  Building2, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Calendar,
  Activity
} from 'lucide-react';
import { SubscriptionRecord } from '../../revenue/revenueManagementTypes';

interface SubscriptionStatusTableProps {
  subscriptions: SubscriptionRecord[];
  currency: 'MYR' | 'USD';
}

export const SubscriptionStatusTable: React.FC<SubscriptionStatusTableProps> = ({
  subscriptions,
  currency
}) => {
  const sym = currency === 'MYR' ? 'RM ' : '$';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-500" />
            Active Subscriptions & Recurring Run-Rate Registry
          </h3>
          <p className="text-xs text-slate-500">
            Lifecycle monitoring for Memberships, Project Sponsor (PDP) Tiers, and Enterprise Sovereign Nodes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20">
            Retention Rate: 94.2%
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5">Subscriber & Org</th>
              <th className="p-3.5">Category & Plan</th>
              <th className="p-3.5">Billing Cycle</th>
              <th className="p-3.5 text-right">Recurring Rate</th>
              <th className="p-3.5">Next Renewal</th>
              <th className="p-3.5 text-center">Auto-Renew</th>
              <th className="p-3.5 text-center">Health</th>
              <th className="p-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {subscriptions.map(sub => {
              const amount = currency === 'MYR' ? sub.monthlyAmountMYR : sub.monthlyAmountUSD;
              return (
                <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 max-w-[200px]">
                    <span className="font-bold text-slate-900 dark:text-white block truncate">{sub.subscriberName}</span>
                    <span className="text-[10px] text-slate-400 truncate block">{sub.subscriberOrg} • {sub.country}</span>
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{sub.planName}</span>
                    <span className="text-[10px] text-slate-500">{sub.type} ({sub.tier})</span>
                  </td>

                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {sub.billingCycle}
                    </span>
                  </td>

                  <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {sym}{amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </td>

                  <td className="p-3.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                    {sub.nextBillingDate}
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sub.autoRenew ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sub.autoRenew ? 'Enabled' : 'Manual'}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sub.healthScore === 'Good'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {sub.healthScore}
                    </span>
                  </td>

                  <td className="p-3.5 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                      {sub.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
