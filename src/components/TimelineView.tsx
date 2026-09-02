import React from 'react';
import { Activity, ShieldCheck, Coins, FileCheck, Landmark, Users } from 'lucide-react';

export const TimelineView: React.FC = () => {
  const events = [
    {
      id: 1,
      title: 'Pool Created: Malaysia SME Export Sukuk',
      category: 'Pooling Engine',
      time: 'Today, 14:30',
      user: 'Super Admin',
      description: 'Capital mobilization pool initiated under Mudarabah contract structure.'
    },
    {
      id: 2,
      title: 'Shariah Advisory Approval Granted',
      category: 'Shariah Board',
      time: 'Yesterday, 11:15',
      user: 'Shariah Advisor',
      description: 'AAOIFI compliance certification issued for Islamabad Enclave Real Estate Pool.'
    },
    {
      id: 3,
      title: 'Wasiyyah Allocation Updated',
      category: 'Beneficiary Module',
      time: '2026-08-01',
      user: 'Asset Owner',
      description: 'Beneficiary preferences modified with 25% allocated to D-8 Waqf Foundation.'
    },
    {
      id: 4,
      title: 'Zakat Disbursement Executed',
      category: 'Financial Module',
      time: '2026-07-28',
      user: 'Finance Officer',
      description: '$12,500 transferred to regional Zakat institution pool.'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">System Activity Timeline</h1>
        <p className="text-sm text-slate-500">Real-time audit log of all contract actions, Shariah approvals, and asset events.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm relative">
        <div className="space-y-6 relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-6">
          {events.map(ev => (
            <div key={ev.id} className="relative group">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-800" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{ev.category} • {ev.user}</span>
                <span>{ev.time}</span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{ev.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ev.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
