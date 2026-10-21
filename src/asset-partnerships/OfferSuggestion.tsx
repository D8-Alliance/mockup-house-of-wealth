import React, { useEffect, useState } from 'react';
import { Info, Lightbulb, Sparkles } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetStructuringGuidance, BackendAiRun, PartnershipAkad, ProjectAssetNeed } from '../services/apiClient';
import { AKAD_LABELS, PREFERRED_AKAD_LABELS } from './partnershipLabels';

const FIT: Record<string, { label: string; className: string }> = {
  RECOMMENDED: { label: 'Recommended', className: 'bg-emerald-500/10 text-emerald-700' },
  POSSIBLE: { label: 'Possible', className: 'bg-slate-500/10 text-slate-600' },
  NOT_SUITABLE: { label: 'Not suitable', className: 'bg-rose-500/10 text-rose-600' },
};

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'null' ? value.trim() : null);

/** The akad the model named, if it named one we offer; "Review Required" and anything else is not an akad. */
function akadOf(value: unknown): PartnershipAkad | null {
  const name = text(value)?.toLowerCase() ?? '';
  if (name.includes('ijarah')) return 'IJARAH';
  if (name.includes('musharakah')) return 'MUSHARAKAH';
  return null;
}

/**
 * A short suggestion while offering an asset: free contract options from the platform's Shariah
 * rules for this asset, and, for members whose plan includes it, the AI adviser's view of this need
 * (akad, indicative terms, points to watch).
 */
export const OfferSuggestion: React.FC<{ assetId: string; need: ProjectAssetNeed; onUseAkad: (akad: PartnershipAkad) => void }> = ({ assetId, need, onUseAkad }) => {
  const [guidance, setGuidance] = useState<AssetStructuringGuidance | null>(null);
  const [advice, setAdvice] = useState<BackendAiRun | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGuidance(null);
    setAdvice(null);
    setError(null);
    if (!assetId) return;
    apiClient.getAssetStructuring(assetId).then(setGuidance).catch(() => setGuidance(null));
  }, [assetId]);

  if (!assetId) return null;
  const options = (guidance?.options ?? []).filter((option): option is typeof option & { contract: PartnershipAkad } => option.contract === 'IJARAH' || option.contract === 'MUSHARAKAH');
  const ruleAkad = options.find((option) => option.fit === 'RECOMMENDED')?.contract ?? null;

  const recommendation = (advice?.output?.recommendation ?? {}) as Record<string, unknown>;
  const aiAkad = akadOf(recommendation.primaryStructure);
  const rationale = text(recommendation.rationale) ?? text(recommendation.summary);
  const terms = (recommendation.indicativeTerms && typeof recommendation.indicativeTerms === 'object' ? recommendation.indicativeTerms : {}) as Record<string, unknown>;
  const termLines = [['Rent', text(terms.rent)], ['Owner\'s profit share', text(terms.profitShare)], ['Period', text(terms.period)]].filter((line): line is [string, string] => Boolean(line[1]));
  // Points to watch, without the "Review Required" placeholder and without repeating the rationale.
  const points = [...new Set([...(Array.isArray(recommendation.keyConsiderations) ? recommendation.keyConsiderations : []), ...(advice?.output?.reasoningSummary?.concerns ?? [])]
    .map((item) => text(item)).filter((item): item is string => Boolean(item) && item !== rationale && !/^review required$/i.test(item as string)))].slice(0, 4);

  const ask = async () => {
    setAsking(true);
    setError(null);
    try {
      setAdvice(await apiClient.askOfferAdvisor(need.id, assetId));
    } catch (cause) {
      const message = apiErrorMessage(cause, 'The AI adviser is not available.');
      setError(/plan|credit/i.test(message) ? `${message} AI suggestions come with a paid membership plan (Membership & Pricing).` : message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="p-3 rounded-2xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/10 space-y-2 text-xs">
      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Lightbulb className="w-4 h-4 text-amber-500" />Suggestion for this offer</div>
      {options.length > 0 && (
        <ul className="space-y-1.5">
          {options.map((option) => (
            <li key={option.contract} className="flex items-start justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-300">
                <span className={`mr-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${FIT[option.fit].className}`}>{FIT[option.fit].label}</span>
                <strong>{AKAD_LABELS[option.contract]}</strong>{option.reasons[0] ? `: ${option.reasons[0]}` : ''}
              </span>
              {option.fit !== 'NOT_SUITABLE' && <button type="button" onClick={() => onUseAkad(option.contract)} className="shrink-0 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">Use</button>}
            </li>
          ))}
        </ul>
      )}
      {advice ? (
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI adviser</span>
            {aiAkad ? (
              <span className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-black">Suggests {AKAD_LABELS[aiAkad]}</span>
                <button type="button" onClick={() => onUseAkad(aiAkad)} className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer">Use</button>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-black" title="The adviser could not settle on an akad from the facts given">Review required</span>
            )}
          </div>
          {rationale && <p className="text-slate-700 dark:text-slate-200">{rationale}</p>}
          {termLines.length > 0 && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-slate-700 dark:text-slate-200">
              {termLines.map(([label, value]) => <React.Fragment key={label}><dt className="font-bold text-slate-500">{label}</dt><dd>{value}</dd></React.Fragment>)}
            </dl>
          )}
          {points.length > 0 && <ul className="list-disc pl-4 text-amber-700 dark:text-amber-300">{points.map((point) => <li key={point}>{point}</li>)}</ul>}
          {aiAkad && ruleAkad && aiAkad !== ruleAkad && (
            <p className="flex items-start gap-1 text-[11px] text-slate-500"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />The adviser weighed this project's preference ({PREFERRED_AKAD_LABELS[need.preferredAkad ?? 'EITHER']}); the platform's Shariah rules recommend {AKAD_LABELS[ruleAkad]} for this asset. Either may be offered; Legal and Shariah review the final terms.</p>
          )}
          <p className="text-[10px] text-slate-400">Indicative only; you and the delivery partner agree the terms, and Legal and Shariah review them.</p>
        </div>
      ) : (
        <button type="button" disabled={asking} onClick={() => void ask()} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><Sparkles className="w-3.5 h-3.5" />{asking ? 'Asking the AI adviser (can take a few minutes)…' : 'Ask AI for suggested terms (20 credits)'}</button>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
};
