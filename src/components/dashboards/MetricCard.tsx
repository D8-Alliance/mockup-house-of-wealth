import React, { ReactNode } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, icon }) => {
  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          {label}
        </span>
        <div className="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
          {icon}
        </div>
      </div>

      <div>
        <span className="text-xl font-black text-slate-900 dark:text-white block tracking-tight">
          {value}
        </span>
        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
          {sub}
        </span>
      </div>
    </div>
  );
};
