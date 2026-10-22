import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Scale, X } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetEngagement, OfferComparison } from '../services/apiClient';
import { ASSET_TYPE_LABELS, formatMoney } from '../assets/assetLabels';
import { AKAD_LABELS, ENGAGEMENT_STATUS, nextStep, PREFERRED_AKAD_LABELS } from './partnershipLabels';

/**
 * Every offer for one need side by side, so a delivery partner compares like with like: the rent per
 * month and over the period whatever way it was quoted, how much of the needed period it covers,
 * charges on the asset and document issues. The partner decides; the system only lines them up.
 */
export const OfferComparisonModal: React.FC<{ needId: string; onOpen: (engagement: AssetEngagement) => void; onClose: () => void; refreshKey: number }> = ({ needId, onOpen, onClose, refreshKey }) => {
  const [data, setData] = useState<OfferComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiClient.getNeedOffers(needId).then(setData).catch((cause) => setError(apiErrorMessage(cause, 'The offers could not be loaded.')));
  }, [needId]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const offers = data?.offers ?? [];
  const live = offers.filter((offer) => offer.status === 'PROPOSED' || offer.status === 'ACCEPTED' || offer.status === 'APPROVED');
  const lowestMonthly = Math.min(...live.map((offer) => offer.metrics.monthlyRent ?? Infinity));
  const currency = (offer: AssetEngagement) => offer.terms.currency ?? 'MYR';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Scale className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Compare offers{data ? `: ${data.need.title}` : ''}</h2>
              {data && (
                <p className="text-xs text-slate-500">
                  {data.need.quantity} × {ASSET_TYPE_LABELS[data.need.assetType]}
                  {data.need.startDate || data.need.endDate ? ` · ${data.need.startDate ?? '?'} to ${data.need.endDate ?? '?'}` : ''}
                  {data.need.location ? ` · ${data.need.location}` : ''} · prefers {PREFERRED_AKAD_LABELS[data.need.preferredAkad]}
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        {data && (
          <div className={`p-3 rounded-xl text-xs font-bold ${data.held >= data.need.quantity ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'}`}>
            {data.held} of {data.need.quantity} accepted or approved.{' '}
            {data.held >= data.need.quantity ? 'No more offers can be accepted. Offers still under discussion are closed automatically once the need is filled.' : `${data.need.quantity - data.held} more can be accepted.`}
          </div>
        )}
        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
        {!data && !error && <p className="text-xs text-slate-400">Loading…</p>}
        {data && offers.length === 0 && <p className="p-6 text-center text-xs text-slate-400">No offers yet for this need.</p>}

        {offers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-400">
                  <th className="py-2 pr-3">Asset</th><th className="pr-3">Akad and terms</th><th className="pr-3">Per month</th><th className="pr-3">Over the period</th><th className="pr-3">Period</th><th className="pr-3">Checks</th><th className="pr-3">Status</th><th />
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => {
                  const status = ENGAGEMENT_STATUS[offer.status];
                  const ijarah = offer.akad === 'IJARAH';
                  const lowest = ijarah && offer.metrics.monthlyRent !== null && offer.metrics.monthlyRent === lowestMonthly && live.length > 1 && live.includes(offer);
                  return (
                    <tr key={offer.id} className={`border-t border-slate-100 dark:border-slate-700 align-top ${live.includes(offer) ? '' : 'opacity-50'}`}>
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-slate-900 dark:text-white">{offer.asset.name}</div>
                        <div className="text-slate-400">{ASSET_TYPE_LABELS[offer.asset.assetType]}{offer.asset.region ? ` · ${offer.asset.region}` : ''}</div>
                        <div className="text-slate-400">{offer.ownerOrganisationName ?? 'Owner shown once accepted'}</div>
                      </td>
                      <td className="pr-3">
                        <div className="font-bold">{AKAD_LABELS[offer.akad]}</div>
                        {!ijarah && <div className="text-slate-500">Asset valued {formatMoney(offer.terms.contributionValue ?? 0, currency(offer))}; owner takes {offer.terms.profitSharePct ?? '?'}%</div>}
                        {ijarah && <div className="text-slate-500">Upkeep by {offer.terms.upkeepBy === 'OWNER' ? 'the owner' : 'the project'}</div>}
                      </td>
                      <td className="pr-3 whitespace-nowrap">
                        {offer.metrics.monthlyRent !== null ? formatMoney(offer.metrics.monthlyRent, currency(offer)) : '-'}
                        {lowest && <div className="text-[10px] font-black text-emerald-600">Lowest rent</div>}
                      </td>
                      <td className="pr-3 whitespace-nowrap">{offer.metrics.totalRent !== null ? formatMoney(offer.metrics.totalRent, currency(offer)) : '-'}</td>
                      <td className="pr-3">
                        <div className="whitespace-nowrap">{offer.startDate} to {offer.endDate}</div>
                        <div className="text-slate-400">{offer.metrics.months} months{offer.metrics.coveragePct !== null ? ` · covers ${offer.metrics.coveragePct}% of the need` : ''}</div>
                      </td>
                      <td className="pr-3">
                        {offer.asset.isEncumbered && <div className="flex items-center gap-1 text-amber-700"><AlertTriangle className="w-3 h-3" />Under financing</div>}
                        <div className={offer.documentIssues ? 'text-amber-700' : 'text-emerald-600'}>{offer.documentIssues ? `${offer.documentIssues} document point${offer.documentIssues > 1 ? 's' : ''} to check` : 'Documents matched'}</div>
                      </td>
                      <td className="pr-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${status.className}`}>{status.label}</span>
                        <div className={`mt-1 text-[11px] ${offer.canRespond ? 'font-bold text-amber-600' : 'text-slate-400'}`}>{nextStep(offer)}</div>
                      </td>
                      <td><button type="button" onClick={() => onOpen(offer)} className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-bold cursor-pointer">Open</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-slate-400">Figures are worked out from each offer's terms so they can be compared; you decide which offer to take. Legal and Shariah review the one you accept.</p>
      </div>
    </div>
  );
};
