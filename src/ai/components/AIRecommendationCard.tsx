import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { AIConfidenceInfo } from '../types/aiCoreTypes';

interface AIRecommendationCardProps {
  title: string;
  subtitle?: string;
  matchScore?: number;
  recommendationText: string;
  confidence: AIConfidenceInfo;
  positiveFactors?: string[];
  concerns?: string[];
  disclaimer?: string;
  actions?: React.ReactNode;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  title,
  subtitle,
  matchScore,
  recommendationText,
  confidence,
  positiveFactors = [],
  concerns = [],
  disclaimer,
  actions
}) => {
  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 text-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              AI Decision Recommendation
            </span>
            <AIConfidenceBadge confidence={confidence} />
          </div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>

        {matchScore !== undefined && (
          <div className="px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center shrink-0">
            <span className="text-[9px] text-emerald-600 font-extrabold uppercase block">Match Score</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">{matchScore}%</span>
          </div>
        )}
      </div>

      {/* Main Text */}
      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">AI Summary</span>
        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {recommendationText}
        </p>
      </div>

      {/* Factors & Concerns */}
      {(positiveFactors.length > 0 || concerns.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {positiveFactors.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
              <span className="font-extrabold text-emerald-800 dark:text-emerald-300 text-[10px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Positive Drivers
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside">
                {positiveFactors.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {concerns.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
              <span className="font-extrabold text-amber-800 dark:text-amber-300 text-[10px] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Review Considerations
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside">
                {concerns.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {disclaimer && (
        <p className="text-[10px] text-slate-400 italic">
          * {disclaimer}
        </p>
      )}

      {actions && <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">{actions}</div>}
    </div>
  );
};
