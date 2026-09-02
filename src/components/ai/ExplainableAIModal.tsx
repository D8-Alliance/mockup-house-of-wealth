import React from 'react';
import { X, Sparkles, ShieldCheck, Cpu, BarChart3, Lock, CheckCircle2 } from 'lucide-react';
import { AIConfidenceData } from './AITypes';

interface ExplainableAIModalProps {
  confidence: AIConfidenceData;
  onClose: () => void;
}

export const ExplainableAIModal: React.FC<ExplainableAIModalProps> = ({
  confidence,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Explainable AI (XAI) Matrix
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                AI Model Decision Breakdown
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Metrics Bar */}
        <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Confidence Score</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{confidence.score}%</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Neural Model</span>
            <span className="font-extrabold text-slate-900 dark:text-white">{confidence.modelName}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Data Points Analyzed</span>
            <span className="font-extrabold text-purple-600 dark:text-purple-400 font-mono">{confidence.dataPointsEvaluated.toLocaleString()}</span>
          </div>
        </div>

        {/* Feature Impact Weights */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Key Feature Weighting Factors
          </h4>

          <div className="space-y-2 text-xs">
            {confidence.factors.map((f, i) => (
              <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-slate-800 dark:text-slate-200">{f.factor}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    f.direction === 'Positive' 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}>
                    {f.direction} Impact ({f.weightPercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${f.direction === 'Positive' ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                    style={{ width: `${f.weightPercent}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cryptographic Audit Trail */}
        <div className="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-1 text-xs">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-extrabold">
            <Lock className="w-4 h-4" />
            <span>AAOIFI Shariah Governance Audit Hash</span>
          </div>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 break-all">
            {confidence.auditHash}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer hover:bg-slate-800"
        >
          Close Decision Breakdown
        </button>
      </div>
    </div>
  );
};
