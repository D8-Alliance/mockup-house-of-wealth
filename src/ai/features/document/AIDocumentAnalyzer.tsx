import React, { useState } from 'react';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { FileText, Sparkles, Calendar, Users, DollarSign, AlertTriangle } from 'lucide-react';

export const AIDocumentAnalyzer: React.FC = () => {
  const [selectedDoc, setSelectedDoc] = useState('Business_Plan_FELDA_Expansion_v3.pdf');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyzeDoc = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setResult({
        documentName: selectedDoc,
        confidence: { level: 'HIGH' as const, scorePercent: 95, disclaimer: 'OCR & text analysis results.' },
        parties: ['FELDA Holdings Berhad (Sponsor)', 'House of Wealth MYS Node (Platform)'],
        importantDates: ['Effective Date: 2026-09-01', 'First Distribution Cutoff: 2026-12-31', 'Maturity Date: 2031-08-31'],
        extractedFigures: [
          'Target Capital: $8,000,000 USD',
          'Sponsor Equity Contribution: $2,000,000 USD',
          'Projected Annual Operating Yield: $2,100,000 USD'
        ],
        keyTerms: [
          'Mudarabah Profit Split: 80% Investors / 20% Mudarib',
          '1.5% Annual Mudarib Management Fee',
          'Quarterly Distribution Cycle'
        ]
      });
      setAnalyzing(false);
    }, 500);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <FileText className="w-3.5 h-3.5" />
            AI Document OCR & Intelligence Extractor
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Automated Document Legal Term & Financial Extraction
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedDoc}
            onChange={e => setSelectedDoc(e.target.value)}
            className="flex-grow p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
          >
            <option value="Business_Plan_FELDA_Expansion_v3.pdf">Business_Plan_FELDA_Expansion_v3.pdf</option>
            <option value="Audited_Financial_Statements_2025.pdf">Audited_Financial_Statements_2025.pdf</option>
            <option value="Shariah_Fatwa_Approval_Certificate.pdf">Shariah_Fatwa_Approval_Certificate.pdf</option>
          </select>

          <button
            onClick={handleAnalyzeDoc}
            disabled={analyzing}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            {analyzing ? 'Extracting Text...' : 'Analyze Document'}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-white">
            <h3 className="font-black text-sm text-purple-300">Extraction Results: {result.documentName}</h3>
            <AIConfidenceBadge confidence={result.confidence} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Users className="w-4 h-4 text-emerald-600" /> Identified Parties
              </span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                {result.parties.map((p: string, idx: number) => <li key={idx}>{p}</li>)}
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
                <Calendar className="w-4 h-4 text-blue-600" /> Key Dates
              </span>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-300">
                {result.importantDates.map((d: string, idx: number) => <li key={idx}>{d}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
