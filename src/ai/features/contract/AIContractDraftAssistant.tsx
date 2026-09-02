import React, { useState } from 'react';
import { AIService } from '../../services/AIService';
import { AIConfidenceBadge } from '../../components/AIConfidenceBadge';
import { FileText, Sparkles, Copy, Download, RefreshCw, Send, AlertTriangle } from 'lucide-react';

export const AIContractDraftAssistant: React.FC<{ user: any }> = ({ user }) => {
  const [contractType, setContractType] = useState('Mudarabah');
  const [capital, setCapital] = useState(8000000);
  const [sponsorName, setSponsorName] = useState('FELDA Holdings Berhad');
  const [loading, setLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  const handleGenerateDraft = async () => {
    setLoading(true);
    const res = await AIService.generateContractDraft({ contractType, capital, sponsorName }, user);
    setDraftResult(res);
    setLoading(false);
  };

  return (
    <div className="space-y-6 text-xs animate-fadeIn">
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1.5 w-fit">
            <FileText className="w-3.5 h-3.5" />
            AI Contract Draft Assistant
          </span>
          <h2 className="text-base font-black text-slate-900 dark:text-white mt-1">
            Automated Shariah Legal Term Sheet Generator
          </h2>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Generates standardized term sheet drafts. All generated outputs are explicitly labeled as drafts and require legal counsel and Shariah board sign-off.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Islamic Contract Structure</label>
            <select
              value={contractType}
              onChange={e => setContractType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            >
              <option value="Mudarabah">Mudarabah (Trust Investment)</option>
              <option value="Musharakah">Musharakah (Joint Capital Venture)</option>
              <option value="Wakalah">Wakalah bil Istithmar (Agency Investment)</option>
              <option value="Ijarah">Ijarah (Lease Backing)</option>
              <option value="Murabaha">Murabaha (Cost-Plus Trade Financing)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Capital Investment ($ USD)</label>
            <input
              type="number"
              value={capital}
              onChange={e => setCapital(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Managing Partner / Sponsor</label>
            <input
              type="text"
              value={sponsorName}
              onChange={e => setSponsorName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold"
            />
          </div>
        </div>

        <button
          onClick={handleGenerateDraft}
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'Drafting Agreement...' : 'Generate Draft Term Sheet'}
        </button>
      </div>

      {draftResult && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white space-y-4 relative border border-slate-700 shadow-2xl">
          {/* Watermark Banner */}
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            {draftResult.recommendation.watermark}
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-black text-sm text-emerald-400">{draftResult.recommendation.title}</h3>
            <AIConfidenceBadge confidence={draftResult.confidence} />
          </div>

          <pre className="p-4 rounded-2xl bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap border border-slate-800 overflow-x-auto">
            {draftResult.recommendation.draftText}
          </pre>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => alert('Draft copied to clipboard!')}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Text
              </button>
              <button
                onClick={() => handleGenerateDraft()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
            </div>

            <button
              onClick={() => alert('Submitted draft term sheet to Shariah Advisory Committee for formal review.')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Submit to Shariah Advisory Board
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
