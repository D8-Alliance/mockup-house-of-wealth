import React, { useEffect, useState } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetStructuringGuidance, BackendAiRun, PartnershipAkad, ProjectAssetNeed } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { AKAD_LABELS, PREFERRED_AKAD_LABELS } from './partnershipLabels';

const FIT: Record<string, { label: string; className: string }> = {
  RECOMMENDED: { label: 'Recommended', className: 'bg-emerald-500/10 text-emerald-700' },
  POSSIBLE: { label: 'Possible', className: 'bg-slate-500/10 text-slate-600' },
  NOT_SUITABLE: { label: 'Not suitable', className: 'bg-rose-500/10 text-rose-600' },
};

/** The question for the AI adviser: the need the asset is offered for, so its advice fits this project. */
function questionFor(need: ProjectAssetNeed): string {
  const period = need.startDate || need.endDate ? `from ${need.startDate ?? '?'} to ${need.endDate ?? '?'}` : 'for a period still open';
  return [
    `I want to offer this asset to a delivery partner's project: ${need.project.projectName} (${need.project.sector}), run by ${need.project.organisationName}.`,
    `They need ${need.quantity} x ${ASSET_TYPE_LABELS[need.assetType].toLowerCase()} ${period}${need.location ? ` at ${need.location}` : ''}: ${need.title}.`,
    `They prefer ${PREFERRED_AKAD_LABELS[need.preferredAkad ?? 'EITHER']}.`,
    'In a few sentences: which akad (Ijarah or Musharakah) suits offering this asset to this need, what indicative terms to propose (a rent range and frequency, or a profit share), and what to watch out for. Indicative only; the parties agree the terms.',
  ].join(' ').slice(0, 1000);
}

/**
 * A short suggestion while offering an asset: free contract options from the platform's Shariah
 * rules for this asset, and, for members whose plan includes it, the AI adviser's view of this need.
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
  const recommendation = (advice?.output?.recommendation ?? {}) as Record<string, unknown>;
  // Small models often repeat the structure in the rationale; show each sentence once.
  const adviceText = [...new Set([recommendation.primaryStructure, recommendation.rationale ?? recommendation.summary].filter((item): item is string => typeof item === 'string' && item.length > 0))];

  const concerns = (advice?.output?.reasoningSummary?.concerns ?? []).filter((concern) => !adviceText.includes(concern));

  const ask = async () => {
    setAsking(true);
    setError(null);
    try {
      setAdvice(await apiClient.askAssetAdvisor(assetId, questionFor(need)));
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
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900 space-y-1">
          <div className="text-[11px] font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />AI adviser</div>
          {adviceText.length ? adviceText.map((text) => <p key={text} className="text-slate-700 dark:text-slate-200">{text}</p>) : <p className="text-slate-500">No suggestion was returned.</p>}
          {concerns.length > 0 && <ul className="list-disc pl-4 text-amber-700 dark:text-amber-300">{concerns.map((concern) => <li key={concern}>{concern}</li>)}</ul>}
          <p className="text-[10px] text-slate-400">Indicative only; you and the delivery partner agree the terms, and Legal and Shariah review them.</p>
        </div>
      ) : (
        <button type="button" disabled={asking} onClick={() => void ask()} className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><Sparkles className="w-3.5 h-3.5" />{asking ? 'Asking the AI adviser…' : 'Ask AI for suggested terms (20 credits)'}</button>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
};
