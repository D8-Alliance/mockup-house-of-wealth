import React, { useEffect, useState } from 'react';
import { ChevronRight, ShieldCheck, ShieldAlert, Monitor } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest } from '../../rbac/menuVisibility';
import { apiClient, KycApplication } from '../../services/apiClient';
import { KYC_STATUS_LABELS } from '../../kyc/kycLabels';
import type { MobileTab } from '../MobileShell';

/** Home: who is signed in, whether they may invest yet (KYC), and the way to the pools. */
export const MobileHome: React.FC<{ onOpen: (tab: MobileTab) => void }> = ({ onOpen }) => {
  const { activeUser, currentRole } = useRBAC();
  const investor = canInvest(currentRole);
  const [kyc, setKyc] = useState<KycApplication | null | undefined>(undefined);
  const [kycError, setKycError] = useState('');

  useEffect(() => {
    if (!investor) return;
    apiClient.getMyKyc().then(setKyc).catch((cause) => { setKyc(null); setKycError(cause instanceof Error ? cause.message : 'KYC status could not be loaded.'); });
  }, [investor]);

  const verified = kyc?.status === 'APPROVED';

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-5 shadow">
        <p className="text-xs text-emerald-100/80">Assalamualaikum,</p>
        <h1 className="text-xl font-black">{activeUser.name}</h1>
        <p className="text-xs text-amber-200 font-semibold mt-1">{currentRole}</p>
      </section>

      {!investor && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm space-y-2">
          <p className="font-bold flex items-center gap-2"><Monitor className="w-4 h-4" />The mini-app is for investors for now</p>
          <p className="text-xs text-slate-600 dark:text-slate-300">Your role, {currentRole}, works on the Wealth Pooling website. Asset owner screens come to the mini-app next.</p>
          <a href="/" className="inline-block text-xs font-bold text-emerald-700 dark:text-emerald-400 underline">Open the website</a>
        </section>
      )}

      {investor && (
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Identity verification (KYC)</p>
          {kyc === undefined && <p className="text-sm text-slate-500">Checking...</p>}
          {kycError && <p role="alert" className="text-xs text-rose-600">{kycError}</p>}
          {kyc !== undefined && !kycError && (
            <div className="flex items-start gap-3">
              {verified ? <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />}
              <div>
                <p className="text-sm font-black">{kyc ? KYC_STATUS_LABELS[kyc.status] : 'Not started'}</p>
                <p className="text-xs text-slate-500">
                  {verified ? 'You can invest in open pools.' : 'You can browse pools now. Investing needs verified KYC, which comes to the mini-app next; until then complete it on the website.'}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <button type="button" onClick={() => onOpen('pools')} className="w-full flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left">
        <span>
          <span className="block text-sm font-black">Wealth pools</span>
          <span className="block text-xs text-slate-500">Pools open for investment, and how much each has raised</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>

      {investor && (
        <button type="button" onClick={() => onOpen('portfolio')} className="w-full flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left">
          <span>
            <span className="block text-sm font-black">My portfolio</span>
            <span className="block text-xs text-slate-500">What you have invested, profit earned, and your orders</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      )}
    </div>
  );
};
