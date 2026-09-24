import React, { useState } from 'react';
import { 
  FileText, 
  Lock, 
  Unlock, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  TrendingUp, 
  ChevronRight, 
  X,
  Coins
} from 'lucide-react';
import { PremiumReportItem, MembershipTier } from '../../revenue/revenueTypes';

interface PremiumReportsCatalogProps {
  reports: PremiumReportItem[];
  userTier: MembershipTier;
  availableCredits: number;
  onUnlockReport: (reportId: string) => void;
  onOpenUpgradeModal: () => void;
}

export const PremiumReportsCatalog: React.FC<PremiumReportsCatalogProps> = ({
  reports,
  userTier,
  availableCredits,
  onUnlockReport,
  onOpenUpgradeModal
}) => {
  const [selectedReport, setSelectedReport] = useState<PremiumReportItem | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Premium Islamic Intelligence Reports
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Curated Research
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Deep algorithmic due diligence, AAOIFI Shariah compliance scoring, and macroeconomic risk matrices.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Available Wealth Pooling Credits: <strong className="text-amber-500 font-mono">{availableCredits}</strong>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map(report => (
          <div
            key={report.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {report.category}
                </span>
                {report.isUnlocked ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Unlock className="w-3.5 h-3.5" />
                    Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Lock className="w-3.5 h-3.5" />
                    {report.creditsToUnlock} Credits
                  </span>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors line-clamp-2">
                  {report.title}
                </h3>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">
                  Target: {report.targetEntity}
                </div>
              </div>

              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                {report.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-400">
                {report.rating}
              </span>

              {report.isUnlocked ? (
                <button
                  onClick={() => setSelectedReport(report)}
                  className="font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Full Report</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => onUnlockReport(report.id)}
                  disabled={availableCredits < report.creditsToUnlock}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-300" />
                  <span>Unlock ({report.creditsToUnlock} Cr)</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {selectedReport.category}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {selectedReport.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>Entity: <strong>{selectedReport.targetEntity}</strong></span>
                <span>•</span>
                <span>Published: <strong>{selectedReport.publishedDate}</strong></span>
                <span>•</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {selectedReport.shariahAuditStatus}
                </span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Executive Synthesis
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedReport.executiveSummary}
              </p>
            </div>

            {/* Risk Metrics */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Multifactor Risk Matrix
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedReport.riskMetrics.map((rm, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{rm.label}</div>
                      <div className="text-[10px] text-emerald-600 font-semibold">{rm.verdict}</div>
                    </div>
                    <div className="font-mono font-black text-slate-700 dark:text-slate-300">
                      Score: {rm.score}/100
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Forecast */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Yield Projections & Confidence
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedReport.financialForecast.map((ff, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <span className="font-bold text-purple-600 font-mono">{ff.year}</span>
                    <div className="font-extrabold text-slate-900 dark:text-white">{ff.projection}</div>
                    <div className="text-[10px] text-slate-400">Confidence: {ff.confidence}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shariah Considerations */}
            <div className="space-y-2 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600">
                Shariah Compliance Analysis
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                {selectedReport.shariahConsiderations.map((sc, idx) => (
                  <li key={idx}>{sc}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="space-y-2 text-xs">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Strategic Recommendations
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-300">
                {selectedReport.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => alert(`Simulated PDF Export generated for ${selectedReport.title}`)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer hover:opacity-90"
              >
                <Download className="w-4 h-4" />
                <span>Export Official PDF Dossier</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
