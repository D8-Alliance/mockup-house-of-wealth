import React from 'react';
import { Sparkles } from 'lucide-react';

interface AIInsightCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  badgeText?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({ title, subtitle, children, badgeText = 'AI Insight' }) => {
  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-md space-y-4 relative overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {badgeText}
            </span>
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
        </div>
        {subtitle && <span className="text-xs font-semibold text-slate-500">{subtitle}</span>}
      </div>

      <div>{children}</div>
    </div>
  );
};
