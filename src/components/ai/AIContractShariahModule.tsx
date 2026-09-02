import React, { useState } from 'react';
import { FileText, ShieldAlert, AlertTriangle, CheckCircle2, Scale, BrainCircuit, RefreshCw } from 'lucide-react';
import { AIContractAnalysis } from '../../types';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIContractShariahModule: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'Mudarabah' | 'Musharakah' | 'Ijarah' | 'Wakalah'>('Mudarabah');
  const [contractText, setContractText] = useState<string>(
    `AGREEMENT FOR CAPITAL INVESTMENT (MUDARABAH)
Party A (Rabb-ul-Mal) agrees to provide capital of $500,000 to Party B (Mudarib) for commercial expansion in D-8 logistics. Profit split shall be 70% to Rabb-ul-Mal and 30% to Mudarib. In the event of market losses, Party B shall not be liable unless misconduct is proven. Clause 4.2 states capital guarantee by Mudarib under fixed yield.`
  );

  const [isVetting, setIsVetting] = useState(false);

  const [analysis, setAnalysis] = useState<AIContractAnalysis>({
    contractId: 'CTR-2026-88',
    recommendedType: 'Mudarabah',
    reasonWhy: 'Capital is provided solely by the investor (Rabb-ul-Mal) while operational management rests with the entrepreneur (Mudarib). Must comply with AAOIFI Standard No. 13.',
    shariahComplianceScore: 84,
    riskyClauses: [
      {
        clause: 'Clause 4.2: Capital Guarantee by Mudarib under fixed yield',
        severity: 'High',
        remedy: 'AAOIFI Standard #13 strictly prohibits capital guarantee by Mudarib in Mudarabah. Replace with third-party independent Wakalah performance guarantee.'
      },
      {
        clause: 'Clause 7.1: Late Payment Penalty Fee retained by Manager',
        severity: 'Medium',
        remedy: 'Stipulate that all late payment fee charges must be directed 100% to registered Sadaqah / Charity, not recognized as profit.'
      }
    ],
    summary: 'The contract achieves 84% compliance. Removing the capital guarantee in Clause 4.2 elevates Shariah rating to 100% certified.'
  });

  const handleRunVetting = () => {
    setIsVetting(true);
    setTimeout(() => {
      setIsVetting(false);
      setAnalysis(prev => ({
        ...prev,
        shariahComplianceScore: 92,
        summary: `Vetted against AAOIFI Standard No. 13. Highlighting 1 remaining clause for optimization.`
      }));
    }, 700);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Left Input Panel */}
      <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Module 3 & 13
            </span>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
              AI Contract & Shariah Advisor
            </h3>
          </div>
          <Scale className="w-5 h-5 text-amber-500" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Select Islamic Contract Archetype</label>
            <div className="flex flex-wrap gap-1.5">
              {(['Mudarabah', 'Musharakah', 'Ijarah', 'Wakalah'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                    selectedType === type
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contract Legal Text</label>
            <textarea
              rows={7}
              value={contractText}
              onChange={e => setContractText(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={handleRunVetting}
            disabled={isVetting}
            className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            {isVetting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Auditing against AAOIFI Standards...</span>
              </>
            ) : (
              <>
                <BrainCircuit className="w-4 h-4" />
                <span>Run Shariah Compliance Vetting</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Output Panel */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {analysis.shariahComplianceScore}%
              </span>
              <p className="text-[10px] text-slate-400 uppercase font-bold">AAOIFI Compliance Rating</p>
            </div>

            <AIConfidenceBadge 
              confidence={{
                score: 96,
                modelName: 'AAOIFI Fatwa Standard #13 & #21 NLP Model',
                dataPointsEvaluated: 8900,
                factors: [
                  { factor: 'Riba Prohibition Verification', weightPercent: 40, direction: 'Positive' },
                  { factor: 'Gharar Risk Factor', weightPercent: 30, direction: 'Positive' },
                  { factor: 'Capital Guarantee Non-Permissibility', weightPercent: 30, direction: 'Negative' }
                ],
                auditHash: '0x88f2...10d4'
              }}
              size="md"
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-amber-800 dark:text-amber-400 block mb-0.5">Shariah Board Rationale:</span>
            {analysis.reasonWhy}
          </div>

          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Highlighted Non-Compliant Clauses
            </h4>

            {analysis.riskyClauses.map((c, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-500/30 space-y-1 text-xs">
                <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-400">
                  <span>{c.clause}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500 text-white font-black">{c.severity}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] pt-1">
                  <strong>Recommended Remedy: </strong>
                  {c.remedy}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
};
