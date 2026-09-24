import React from 'react';
import { 
  X, 
  Code2, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  ShieldCheck, 
  Building2, 
  Globe, 
  FileCheck, 
  Layers, 
  Lock,
  Cpu
} from 'lucide-react';
import { CODE_REVIEW_FINDINGS } from '../data/initialData';

interface CodeReviewModalProps {
  onClose: () => void;
}

export const CodeReviewModal: React.FC<CodeReviewModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                Full Technical Audit
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                Wealth Pooling Codebase & Architecture Review
              </h2>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executive Summary */}
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/20 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Executive Code Review Summary</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
             The provided <strong>Wealth Pooling</strong> monorepo codebase displays high architectural maturity. It successfully combines a modern Next.js 16 SSR/App Router frontend, a NestJS micro-module API backend, Turborepo package orchestration, and AAOIFI-compliant Shariah smart contract governance with 100% RTL and multi-language support across all 9 D-8 nations.
          </p>
        </div>

        {/* Audit Sections */}
        <div className="space-y-6">
          {CODE_REVIEW_FINDINGS.map(section => (
            <div key={section.id} className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{section.title}</h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Score: {section.score}/100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {section.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                
                {/* Strengths */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    {section.strengths.map((str, idx) => (
                      <li key={idx}>{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5" /> Recommendations
                  </span>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside">
                    {section.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            Close Code Review
          </button>
        </div>

      </div>
    </div>
  );
};
