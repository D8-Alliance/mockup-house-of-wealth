import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { apiClient, AssetEngagement, AssetLeaseView, MyLeasableUnit, RegisteredAsset } from '../../services/apiClient';
import { ASSET_TYPE_LABELS } from '../../assets/assetLabels';
import type { MobileTab } from '../MobileShell';
import { expiries } from './MobileAssets';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';

/**
 * The asset owner's overview on Home: what they own and its verification, how much of their space is let and
 * what it earns, what needs their action, and what expires soon. Worked out on the phone from the asset,
 * unit, lease and partnership lists the server already gives; each card opens the tab where it is acted on.
 */
export const MobileAssetOwnerDashboard: React.FC<{ onOpen: (tab: MobileTab) => void }> = ({ onOpen }) => {
  const { t, locale } = useT();
  const [assets, setAssets] = useState<RegisteredAsset[] | null>(null);
  const [units, setUnits] = useState<MyLeasableUnit[]>([]);
  const [leases, setLeases] = useState<AssetLeaseView[]>([]);
  const [engagements, setEngagements] = useState<AssetEngagement[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiClient.getAssets().then(setAssets).catch((cause) => setError(cause instanceof Error ? cause.message : t('Your assets could not be loaded.')));
    apiClient.getMyLeasableUnits().then((data) => setUnits(data.units)).catch(() => setUnits([]));
    apiClient.getLeases().then(setLeases).catch(() => setLeases([]));
    apiClient.getAssetEngagements().then(setEngagements).catch(() => setEngagements([]));
  }, [t]);
  const money = (amount: number, currency = 'MYR') => `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 0 })}`;

  const view = useMemo(() => {
    const owned = (assets ?? []).filter(asset => asset.status !== 'WITHDRAWN' && asset.status !== 'REJECTED');
    const currency = owned[0]?.currency ?? 'MYR';
    const today = new Date().toISOString().slice(0, 10);
    const year = today.slice(0, 4);
    const mine = leases.filter(lease => lease.myParty === 'OWNER');
    const running = mine.filter(lease => lease.status === 'APPROVED' && lease.startDate <= today && lease.endDate >= today);
    const rentRoll = running.reduce((total, lease) => total + lease.monthlyRent, 0);
    const received = mine.flatMap(lease => lease.payments).filter(payment => payment.status === 'PAID' && (payment.paidAt ?? '').startsWith(year)).reduce((total, payment) => total + payment.amount, 0);
    const overdue = mine.reduce((total, lease) => total + lease.rent.overdue, 0);
    const listed = units.filter(unit => unit.status === 'LISTED' || unit.occupiedUntil);
    const occupied = units.filter(unit => unit.occupiedUntil).length;
    const due = owned.flatMap(asset => expiries(asset).filter(item => item.days <= 30).map(item => ({ ...item, asset: asset.name })) ).sort((a, b) => a.days - b.days);
    const perAsset = owned.filter(asset => asset.status === 'VERIFIED').map(asset => {
      const assetUnits = units.filter(unit => unit.assetId === asset.id);
      const annualRent = running.filter(lease => lease.asset.id === asset.id).reduce((total, lease) => total + lease.monthlyRent * 12, 0);
      return { asset, units: assetUnits.length, let: assetUnits.filter(unit => unit.occupiedUntil).length, annualRent, yieldPct: asset.estimatedValue > 0 ? (annualRent / asset.estimatedValue) * 100 : 0 };
    });
    return {
      owned, currency,
      byStatus: {
        verified: owned.filter(asset => asset.status === 'VERIFIED'),
        waiting: owned.filter(asset => asset.status === 'SUBMITTED'),
        changes: owned.filter(asset => asset.status === 'CHANGES_REQUESTED'),
        draft: owned.filter(asset => asset.status === 'DRAFT'),
      },
      totalValue: owned.reduce((total, asset) => total + asset.estimatedValue, 0),
      verifiedValue: owned.filter(asset => asset.status === 'VERIFIED').reduce((total, asset) => total + asset.estimatedValue, 0),
      listed: listed.length, occupied, rentRoll, received, overdue,
      actions: [
        { count: mine.filter(lease => lease.canRespond).length, label: t('Lease requests to answer'), tab: 'leasing' as MobileTab },
        { count: engagements.filter(item => item.canRespond).length, label: t('Project offers to answer'), tab: 'assets' as MobileTab },
        { count: mine.flatMap(lease => lease.payments).filter(payment => payment.status === 'OVERDUE').length, label: t('Rent months overdue or not recorded'), tab: 'leasing' as MobileTab },
        { count: mine.filter(lease => lease.canReturnDeposit).length, label: t('Deposits to refund'), tab: 'leasing' as MobileTab },
        { count: owned.filter(asset => asset.status === 'CHANGES_REQUESTED').length, label: t('Assets the reviewer sent back'), tab: 'assets' as MobileTab },
      ].filter(item => item.count > 0),
      due, perAsset,
    };
  }, [assets, units, leases, engagements, t]);

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>;
  if (!assets) return <p className="text-sm text-slate-500">{t('Loading...')}</p>;
  if (view.owned.length === 0) {
    return (
      <button type="button" onClick={() => onOpen('assets')} className={`${card} w-full text-left flex items-center justify-between`}>
        <span>
          <span className="block text-sm font-black">{t('Register your first asset')}</span>
          <span className="block text-xs text-slate-500">{t('Once it is verified you can lease it out or offer it to projects.')}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>
    );
  }

  const stat = (label: string, value: string, tone = '', compact = false) => (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`${compact ? 'text-sm' : 'text-base'} font-black whitespace-nowrap ${tone}`}>{value}</p>
    </div>
  );
  const occupancy = view.listed ? Math.round((view.occupied / view.listed) * 100) : 0;

  return (
    <div className="space-y-4">
      {view.actions.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2">
          <h2 className="text-sm font-black flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" />{t('Needs your action')}</h2>
          {view.actions.map(item => (
            <button key={item.label} type="button" onClick={() => onOpen(item.tab)} className="w-full flex items-center justify-between text-left text-xs">
              <span><span className="font-black">{item.count}</span> {item.label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </section>
      )}

      <button type="button" onClick={() => onOpen('assets')} className={`${card} w-full text-left space-y-3`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">{t('My assets')}</h2>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {stat(t('Estimated value'), money(view.totalValue, view.currency))}
          {stat(t('Verified value'), money(view.verifiedValue, view.currency), 'text-emerald-700 dark:text-emerald-400')}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-black">
          <span className="rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">{t('{count} verified', { count: view.byStatus.verified.length })}</span>
          {view.byStatus.waiting.length > 0 && <span className="rounded-full px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300">{t('{count} awaiting verification', { count: view.byStatus.waiting.length })}</span>}
          {view.byStatus.changes.length > 0 && <span className="rounded-full px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300">{t('{count} sent back', { count: view.byStatus.changes.length })}</span>}
          {view.byStatus.draft.length > 0 && <span className="rounded-full px-2 py-0.5 bg-slate-500/10 text-slate-600 dark:text-slate-300">{t('{count} draft', { count: view.byStatus.draft.length })}</span>}
        </div>
      </button>

      {(view.listed > 0 || view.rentRoll > 0) && (
        <button type="button" onClick={() => onOpen('leasing')} className={`${card} w-full text-left space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black">{t('Leasing')}</h2>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-500"><span>{t('Units let')}</span><span className="font-black">{t('{let} of {total} ({pct}%)', { let: view.occupied, total: view.listed, pct: occupancy })}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${occupancy}%` }} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stat(t('Rent a month'), money(view.rentRoll, view.currency), '', true)}
            {stat(t('Received this year'), money(view.received, view.currency), '', true)}
            {stat(t('Overdue'), money(view.overdue, view.currency), view.overdue > 0 ? 'text-rose-700 dark:text-rose-400' : '', true)}
          </div>
        </button>
      )}

      {view.due.length > 0 && (
        <section className={`${card} space-y-1.5`}>
          <h2 className="text-sm font-black">{t('Expiring soon')}</h2>
          {view.due.slice(0, 5).map(item => (
            <p key={`${item.asset}-${item.label}`} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{item.asset} · {t(item.label)}</span>
              <span className={`font-black shrink-0 ${item.days < 0 ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-300'}`}>{item.days < 0 ? t('expired') : t('{days} days left', { days: item.days })}</span>
            </p>
          ))}
        </section>
      )}

      {view.perAsset.length > 0 && (
        <section className={`${card} space-y-2`}>
          <h2 className="text-sm font-black">{t('By asset')}</h2>
          {view.perAsset.map(item => (
            <div key={item.asset.id} className="border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0">
              <div className="flex justify-between gap-2 text-xs">
                <p className="font-bold min-w-0 truncate">{item.asset.name}</p>
                <p className="font-black shrink-0">{money(item.asset.estimatedValue, item.asset.currency)}</p>
              </div>
              <p className="text-[11px] text-slate-500">
                {t(ASSET_TYPE_LABELS[item.asset.assetType])}
                {item.units > 0 ? ` · ${t('{let} of {total} units let', { let: item.let, total: item.units })}` : ''}
                {item.annualRent > 0 ? ` · ${t('rent {amount} a year ({pct}% of value)', { amount: money(item.annualRent, item.asset.currency), pct: item.yieldPct.toFixed(1) })}` : ` · ${t('not earning yet')}`}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
