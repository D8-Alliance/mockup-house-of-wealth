import React, { useState } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
  frequency: string;
  desc: string;
}

interface AdminReportsViewProps {
  reportTemplates: ReportTemplate[];
}

export const AdminReportsView: React.FC<AdminReportsViewProps> = ({ reportTemplates }) => {
  const [reportFormat, setReportFormat] = useState<'PDF' | 'CSV' | 'XLSX'>('PDF');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedSuccess, setGeneratedSuccess] = useState<string | null>(null);

  const handleGenerateReport = (title: string) => {
    setIsGeneratingReport(true);
    setGeneratedSuccess(null);
    setTimeout(() => {
      setIsGeneratingReport(false);
      setGeneratedSuccess(`Successfully generated '${title}' in ${reportFormat} format!`);
      setTimeout(() => setGeneratedSuccess(null), 4000);
    }, 800);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Enterprise Regulatory & Governance Report Generator</h3>
          <p className="text-xs text-slate-500">Generate certified regulatory compliance reports, AAOIFI Fatwa audit packages, and treasury ledger exports.</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-600 dark:text-slate-300">Format:</span>
          {(['PDF', 'CSV', 'XLSX'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => setReportFormat(fmt)}
              className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer ${
                reportFormat === fmt 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {generatedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{generatedSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTemplates.map(rep => (
          <div key={rep.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-purple-600 font-bold text-[11px]">{rep.id}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600">{rep.category}</span>
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug mt-1">{rep.name}</h4>
              <p className="text-xs text-slate-500">{rep.desc}</p>
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Frequency: {rep.frequency}</span>
              <button 
                onClick={() => handleGenerateReport(rep.name)}
                disabled={isGeneratingReport}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate {reportFormat}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
