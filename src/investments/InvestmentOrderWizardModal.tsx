import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, DollarSign, FileSignature, CheckCircle2 } from 'lucide-react';
import { WealthPool } from '../pooling/poolTypes';
import { investmentService } from './investmentService';
import { useRBAC } from '../rbac/RBACContext';
import { AKAD_LABELS, AKAD_MAX_INVESTOR_PCT, akadApi, AkadInvestmentOrder, AkadType, PoolAkadTerms } from '../services/akadApi';

interface InvestmentOrderWizardModalProps {
  pool: WealthPool | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TERMS_PUBLISHERS = ['Super Admin', 'Country Admin', 'Organization Admin', 'Pool Manager'];

/** Default akad for publishing, from the pool's descriptive structure. */
function akadFromStructure(structure: string): AkadType {
  const value = structure.toLowerCase();
  if (value.includes('musharakah')) return 'MUSHARAKAH';
  if (value.includes('wakalah')) return 'WAKALAH';
  if (value.includes('ijarah')) return 'IJARAH';
  return 'MUDARABAH';
}

/**
 * Subscription wizard. The investor reads the pool's akad terms from the server and
 * accepts that exact version (ijab and qabul); the order is placed on the server and
 * stays PENDING until settlement staff confirm the payment.
 */
export const InvestmentOrderWizardModal: React.FC<InvestmentOrderWizardModalProps> = ({ pool, onClose, onSuccess }) => {
  const { activeUser, currentRole } = useRBAC();
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<number>(50000);
  const [acceptedAkad, setAcceptedAkad] = useState(false);
  const [confirmedRisk, setConfirmedRisk] = useState(false);
  const [terms, setTerms] = useState<PoolAkadTerms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<AkadInvestmentOrder | null>(null);
  const [publishType, setPublishType] = useState<AkadType>('MUDARABAH');
  const [publishPct, setPublishPct] = useState(70);

  const loadTerms = async (poolId: string) => {
    setLoading(true);
    setError('');
    try {
      setTerms((await akadApi.getTerms(poolId)).current);
    } catch (cause) {
      setTerms(null);
      setError(cause instanceof Error ? cause.message : 'Akad terms could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pool) return;
    setStep(1); setAcceptedAkad(false); setConfirmedRisk(false); setPlaced(null);
    setPublishType(akadFromStructure(pool.investmentStructure));
    void loadTerms(pool.poolId);
  }, [pool?.poolId]);

  if (!pool) return null;

  const profile = investmentService.getSuitabilityProfile(activeUser.id);
  const canPublish = TERMS_PUBLISHERS.includes(currentRole);
  const investorPct = terms ? Number(terms.investorProfitSharePct) : 0;

  const publish = async () => {
    setBusy(true);
    setError('');
    try {
      setTerms(await akadApi.publishTerms(pool.poolId, { akadType: publishType, investorProfitSharePct: publishPct }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Akad terms could not be published.');
    } finally {
      setBusy(false);
    }
  };

  const placeOrder = async () => {
    if (!terms) return;
    setBusy(true);
    setError('');
    try {
      setPlaced(await akadApi.createOrder({ poolId: pool.poolId, amount, currency: pool.currency, akadTermsId: terms.id }));
      onSuccess();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The order could not be placed.';
      setError(message);
      // The terms changed while the investor was reading: show the new version for acceptance.
      if (/changed/i.test(message)) { setAcceptedAkad(false); setStep(1); void loadTerms(pool.poolId); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600">SHARIAH INVESTMENT DESK</span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Subscribe to {pool.poolName}</h2>
            <p className="text-xs text-slate-500">
              Contract: {terms ? AKAD_LABELS[terms.akadType] : pool.investmentStructure} • Indicative return {pool.indicativeExpectedReturn}% p.a. (not guaranteed)
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {placed ? (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-black text-emerald-800 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4" /> Order {placed.orderNumber} placed</div>
              <p className="text-slate-600 dark:text-slate-300">You accepted {terms ? `${AKAD_LABELS[terms.akadType]} terms version ${terms.version}` : 'the akad terms'} on {new Date(placed.akadAcceptedAt).toLocaleString()}. The order is <strong>{placed.status}</strong> until settlement staff confirm your payment.</p>
            </div>
            <div className="flex justify-end"><button onClick={onClose} className="px-4 py-2 rounded-xl font-bold bg-slate-900 text-white">Close</button></div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 text-xs font-bold">
              <button onClick={() => setStep(1)} className={`px-3 py-1 rounded-xl ${step === 1 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>1. Suitability & Akad</button>
              <button onClick={() => acceptedAkad && setStep(2)} disabled={!acceptedAkad} className={`px-3 py-1 rounded-xl ${step === 2 ? 'bg-purple-600 text-white' : 'text-slate-500'} disabled:opacity-50`}>2. Amount & Risk Sign-off</button>
            </div>

            {error && <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300">{error}</div>}

            {step === 1 && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="font-extrabold text-slate-900 dark:text-white block">Investor Suitability Check</span>
                  <p className="text-slate-500">Classification: <strong>{profile.investorType}</strong> • Risk tolerance: <strong>{profile.riskProfile}</strong></p>
                </div>

                {loading ? (
                  <p className="text-slate-500">Loading akad terms…</p>
                ) : terms ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5"><FileSignature className="w-4 h-4" /> {AKAD_LABELS[terms.akadType]} terms, version {terms.version}</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">Investor share {investorPct}% • Manager {100 - investorPct}%</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 max-h-56 overflow-y-auto bg-white/70 dark:bg-slate-900/60 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900">{terms.termsText}</pre>
                    <p className="text-[10px] text-slate-400 font-mono break-all">Terms fingerprint (SHA-256): {terms.termsHash}</p>
                    <label className="flex items-start gap-2 pt-1 font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input type="checkbox" checked={acceptedAkad} onChange={(event) => setAcceptedAkad(event.target.checked)} className="mt-0.5 rounded text-purple-600" />
                      I have read and accept these akad terms (version {terms.version}). My acceptance is recorded with the date and time.
                    </label>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                    <p className="font-bold text-amber-900 dark:text-amber-200">This pool has no published akad terms yet, so it cannot accept investments.</p>
                    {canPublish ? (
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="space-y-1"><span className="block font-bold text-slate-600 dark:text-slate-300">Akad</span>
                          <select value={publishType} onChange={(event) => { const type = event.target.value as AkadType; setPublishType(type); setPublishPct(Math.min(publishPct, AKAD_MAX_INVESTOR_PCT[type])); }} className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {(Object.keys(AKAD_LABELS) as AkadType[]).map((type) => <option key={type} value={type}>{AKAD_LABELS[type]}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1"><span className="block font-bold text-slate-600 dark:text-slate-300">Investor profit share (%)</span>
                          <input type="number" min={1} max={AKAD_MAX_INVESTOR_PCT[publishType]} step={0.01} value={publishPct} onChange={(event) => setPublishPct(Number(event.target.value))} className="w-28 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white" />
                        </label>
                        <button onClick={() => void publish()} disabled={busy} className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50">{busy ? 'Publishing…' : 'Publish akad terms'}</button>
                        <p className="w-full text-[10px] text-slate-500">Once an investor accepts these terms they cannot be changed.</p>
                      </div>
                    ) : <p className="text-amber-800 dark:text-amber-300">The pool manager must publish the akad terms first.</p>}
                  </div>
                )}
              </div>
            )}

            {step === 2 && terms && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subscription amount ({pool.currency})</label>
                  <input type="number" min={pool.minimumInvestment} max={pool.maximumInvestment} value={amount} onChange={(event) => setAmount(Number(event.target.value))} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-black text-lg" />
                  <span className="text-[10px] text-slate-500 block mt-1">Min {pool.minimumInvestment.toLocaleString()} • Max {pool.maximumInvestment.toLocaleString()} {pool.currency}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-extrabold"><AlertTriangle className="w-4 h-4 text-amber-600" /> Risk and non-guarantee disclosure</div>
                  <p className="text-[11px]">The indicative return of <strong>{pool.indicativeExpectedReturn}% p.a.</strong> is a projection only. Capital and returns are not guaranteed; losses are borne as stated in the akad terms.</p>
                  <label className="flex items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800 cursor-pointer font-bold">
                    <input type="checkbox" checked={confirmedRisk} onChange={(event) => setConfirmedRisk(event.target.checked)} className="rounded text-purple-600" />
                    I understand and accept these risks.
                  </label>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center text-xs pt-1">
              {step === 2 ? <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200">Back</button> : <div />}
              {step === 1 ? (
                <button onClick={() => setStep(2)} disabled={!terms || !acceptedAkad} className="px-4 py-2 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50">Continue</button>
              ) : (
                <button disabled={!confirmedRisk || busy || amount <= 0} onClick={() => void placeOrder()} className="px-5 py-2.5 rounded-xl font-black text-white flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-md disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:shadow-none">
                  <DollarSign className="w-4 h-4" />
                  {busy ? 'Placing order…' : `Accept akad & subscribe (${amount.toLocaleString()} ${pool.currency})`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
