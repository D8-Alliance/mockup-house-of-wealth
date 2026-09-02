import React, { useState } from 'react';
import { Sparkles, Info, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { AIConfidenceData } from './AITypes';
import { ExplainableAIModal } from './ExplainableAIModal';

interface AIConfidenceBadgeProps {
  confidence: AIConfidenceData;
  size?: 'sm' | 'md' | 'lg';
}

export const AIConfidenceBadge: React.FC<AIConfidenceBadgeProps> = ({
  confidence,
  size = 'md'
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    if (score >= 75) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={`inline-flex items-center gap-1.5 font-black rounded-full border transition-all cursor-pointer hover:scale-105 ${getScoreColor(
          confidence.score
        )} ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
        }`}
        title="Click to inspect Explainable AI Decision Model"
      >
        <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        <span>{confidence.score}% AI Confidence</span>
        <Info className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {modalOpen && (
        <ExplainableAIModal
          confidence={confidence}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};
