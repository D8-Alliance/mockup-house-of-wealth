import React, { useEffect, useState } from 'react';
import { Bot, FileSignature, Scale } from 'lucide-react';
import { openAgreementFor } from '../ai/aiEngineNavigation';
import { startFromAsset } from '../ai/features/contract/agreementPrefill';
import { apiClient, apiErrorMessage, AssetStructuringGuidance, BackendAiRun, RegisteredAsset } from '../services/apiClient';
import { ASSET_TYPE_LABELS, formatMoney } from './assetLabels';

const CONTRACT_LABELS: Record<AssetStructuringGuidance['options'][number]['contract'], string> = {
  IJARAH: 'Ijarah (lease)',
  MUSHARAKAH: 'Musharakah (partnership)',
  MURABAHAH: 'Murabahah (sale)',
};

const FIT_STYLES: Record<AssetStructuringGuidance['options'][number]['fit'], { label: string; className: string }> = {
  RECOMMENDED: { label: 'Recommended', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  POSSIBLE: { label: 'Possible', className: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  NOT_SUITABLE: { label: 'Not suitable now', className: 'bg-rose-500/10 text-rose-600' },
};

/** Contracts an asset owner may draft on the platform (mirrors the server's agreement rules). */
const DRAFTABLE = new Set(['IJARAH', 'MUSHARAKAH']);

interface AssetStructuringPanelProps {
  asset: RegisteredAsset;
  /** The owner, who may ask the AI adviser and draft an agreement. */
  canAct: boolean;
  /** Opens the AI Wealth Engine (Agreement Generation is chosen there). */
  onOpenAgreement?: () => void;
}

/** Which Islamic contract suits the asset (rules, free), the AI adviser (paid), and drafting from a verified asset. */
export const AssetStructuringPanel: React.FC<AssetStructuringPanelProps> = ({ asset, canAct, onOpenAgreement }) => {
  const [guidance, setGuidance] = useState<AssetStructuringGuidance | null>(null);
  const [advice, setAdvice] = useState<BackendAiRun | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGuidance(null);
    setAdvice(null);
    apiClient.getAssetStructuring(asset.id).then(setGuidance).catch((cause) => setError(apiErrorMessage(cause, 'Contract options could not be loaded.')));
  }, [asset.id, asset.status, asset.updatedAt]);

  const ask = async () => {
    setAsking(true);
    setError(null);
    try {
      setAdvice(await apiClient.askAssetAdvisor(asset.id));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The AI adviser is not available.'));
    } finally {
      setAsking(false);
    }
  };

  const draft = (contract: 'IJARAH' | 'MUSHARAKAH') => {
    openAgreementFor(startFromAsset(asset, contract));
    onOpenAgreement?.();
  };

  const recommendation = (advice?.output?.recommendation ?? {}) as Record<string, unknown>;
  const adviceText = [recommendation.primaryStructure, recommendation.rationale ?? recommendation.summary].filter((item): item is string => typeof item === 'string' && item.length > 0);

  return (
    <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
      <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5"><Scale className="w-4 h-4 text-emerald-600" />Islamic contract options</h3>
      {error && <p className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
      {!guidance && !error && <p className="text-xs text-slate-400">Loading…</p>}
      {guidance && (
        <>
          {guidance.concerns.length > 0 && (
            <ul className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs space-y-1 list-disc pl-6">
              {guidance.concerns.map((concern) => <li key={concern}>{concern}</li>)}
            </ul>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {guidance.options.map((option) => (
              <div key={option.contract} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900 dark:text-white">{CONTRACT_LABELS[option.contract]}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${FIT_STYLES[option.fit].className}`}>{FIT_STYLES[option.fit].label}</span>
                </div>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">{option.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                <details className="text-slate-500">
                  <summary className="cursor-pointer font-bold text-slate-600 dark:text-slate-300">Your duties and what is needed</summary>
                  <ul className="mt-1 list-disc pl-4 space-y-0.5">{option.ownerDuties.map((duty) => <li key={duty}>{duty}</li>)}</ul>
                  {option.needs.length > 0 && <p className="mt-1"><strong>Still needed:</strong> {option.needs.join('; ')}.</p>}
                </details>
                {canAct && asset.status === 'VERIFIED' && DRAFTABLE.has(option.contract) && option.fit !== 'NOT_SUITABLE' && onOpenAgreement && (
                  <button type="button" onClick={() => draft(option.contract as 'IJARAH' | 'MUSHARAKAH')} className="w-full px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    <FileSignature className="w-3.5 h-3.5" />Draft {option.contract === 'IJARAH' ? 'Ijarah' : 'Musharakah'} agreement
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400">{guidance.basis}{asset.status !== 'VERIFIED' && canAct ? ' Agreements can be drafted once the asset is verified.' : ''}</p>
        </>
      )}

      {canAct && (
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><Bot className="w-4 h-4 text-purple-600" />AI adviser: a fuller explanation for this asset</span>
            <button type="button" disabled={asking} onClick={() => void ask()} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60">{asking ? 'Asking…' : 'Ask the AI adviser (20 credits)'}</button>
          </div>
          <p className="text-[10px] text-slate-500">The adviser sees the asset's facts and the options above, not your name or documents.</p>
          {advice && (
            <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-200">
              {adviceText.map((text) => <p key={text}>{text}</p>)}
              {(advice.output?.reasoningSummary?.concerns ?? []).length > 0 && <ul className="list-disc pl-5 text-amber-700 dark:text-amber-300">{advice.output!.reasoningSummary!.concerns.map((concern) => <li key={concern}>{concern}</li>)}</ul>}
              {(advice.output?.limitations ?? []).length > 0 && <p className="text-[10px] text-slate-400">{advice.output!.limitations!.join(' ')}</p>}
              <p className="text-[10px] text-slate-400">AI output is advisory; Legal and Shariah review decide.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
