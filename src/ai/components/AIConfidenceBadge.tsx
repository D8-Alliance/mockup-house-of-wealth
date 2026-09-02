import React from 'react';
import { AIConfidenceInfo } from '../types/aiCoreTypes';
import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

export const AIConfidenceBadge: React.FC<{ confidence: AIConfidenceInfo }> = ({ confidence }) => {
  const getBadgeStyle = () => {
    switch (confidence.level) {
      case 'HIGH':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'LOW':
      default:
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="group relative inline-flex items-center">
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border flex items-center gap-1 cursor-help ${getBadgeStyle()}`}>
        <ShieldCheck className="w-3 h-3" />
        AI Confidence: {confidence.level} ({confidence.scorePercent}%)
        <HelpCircle className="w-3 h-3 opacity-60" />
      </span>

      {/* Tooltip */}
      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl z-50 pointer-events-none leading-normal">
        <p className="font-bold text-amber-300 mb-1">Confidence Disclaimer</p>
        <p>{confidence.disclaimer}</p>
      </div>
    </div>
  );
};
