import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, Layers } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { AIConfidenceData } from './AITypes';

interface AIRecommendationCardProps {
  id: string;
  title: string;
  category: string;
  contractType: string;
  expectedROI: string;
  riskGrade: string;
  matchScore: number;
  reason: string;
  confidence: AIConfidenceData;
  onSelectAction?: (id: string) => void;
  actionText?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  id,
  title,
  category,
  contractType,
  expectedROI,
  riskGrade,
  matchScore,
  reason,
  confidence,
  onSelectAction,
  actionText = "Invest in Pool"
}) => {
  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded">
              {id}
            </span>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {matchScore}% Match
            </span>
          </div>

          <AIConfidenceBadge confidence={confidence} size="sm" />
        </div>

        {/* Title */}
        <div>
          <span className="text-[10px] font-extrabold uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
            {category} • {contractType}
          </span>
          <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 leading-snug">
            {title}
          </h4>
        </div>

        {/* Metrics Box */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/60">
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Expected Return</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{expectedROI}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block">Risk Rating</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{riskGrade}</span>
          </div>
        </div>

        {/* Rationale */}
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/15">
          <strong className="text-emerald-700 dark:text-emerald-400 font-bold">AI Rationale: </strong>
          {reason}
        </p>
      </div>

      {/* Action */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
        <button
          onClick={() => onSelectAction && onSelectAction(id)}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
