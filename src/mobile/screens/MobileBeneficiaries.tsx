import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Pencil, Plus, Star, Trash2, Users } from 'lucide-react';
import { apiClient, apiErrorMessage } from '../../services/apiClient';
import { BeneficiaryItem } from '../../types';
import { fromServer, toServer } from '../../beneficiaries/beneficiaryApi';
import { EstateFramework, estateRuleError, hasOwnerSetShare, TYPES_BY_FRAMEWORK, useEstateFramework, wasiyyahTotal, WASIYYAH_LIMIT_PCT, willTotal } from '../../beneficiaries/estateRules';
import { useT } from '../i18n';

const RELATIONS: BeneficiaryItem['relation'][] = ['Spouse', 'Child', 'Parent', 'Sibling', 'Waqf Foundation', 'Zakat Institution', 'Other'];
const PAYOUT_METHODS = ['Bank transfer', 'DuitNow', 'Waqf endowment', 'Zakat institution', 'International wire (SWIFT)'];
const HINT: Record<BeneficiaryItem['distributionType'], string> = {
  'Hibah Amanah': 'A gift during your lifetime, held in trust; the recipient accepts it (qabul).',
  Wasiyyah: 'A bequest to someone who is not a faraid heir, at most one-third of the estate in total.',
  'Faraid Heir': 'The share is fixed by Islamic inheritance law; you do not set a percentage.',
  'Will Beneficiary': 'A share under your will (civil estates).',
  'Profit Share': 'Receives part of the profit from your investments.',
  'Zakat & Sadaqah': 'Charity: a zakat institution or a cause you choose.',
};

const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base text-slate-900 dark:text-white';
const label = 'block text-xs font-bold text-slate-500';

function blank(framework: EstateFramework): BeneficiaryItem {
  return { id: '', name: '', relation: 'Spouse', distributionType: TYPES_BY_FRAMEWORK[framework][0], allocationPercent: 0, payoutMethod: PAYOUT_METHODS[0], isPrimary: false } as BeneficiaryItem;
}

/**
 * The investor's estate instructions on the phone: who receives what, under the Islamic or civil framework they
 * choose, with the same rules as the website (wasiyyah at most one-third and never to a faraid heir; a hibah
 * needs the offer, the recipient's email and identity number). Saved on the server; identity numbers come back masked.
 */
export const MobileBeneficiaries: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useT();
  const [framework, setFramework] = useEstateFramework();
  const [items, setItems] = useState<BeneficiaryItem[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<BeneficiaryItem | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    apiClient.getBeneficiaries().then((rows) => setItems(rows.map(fromServer))).catch((cause) => { setItems([]); setError(apiErrorMessage(cause, t('Your beneficiaries could not be loaded.'))); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);

  const remove = async (item: BeneficiaryItem) => {
    if (!window.confirm(t('Remove {name} from your beneficiaries?', { name: item.name }))) return;
    setBusy(item.id);
    setError('');
    try { await apiClient.deleteBeneficiary(item.id); load(); } catch (cause) { setError(apiErrorMessage(cause, t('The beneficiary was not removed.'))); } finally { setBusy(''); }
  };
  const makePrimary = async (item: BeneficiaryItem) => {
    setBusy(item.id);
    setError('');
    try { setItems((await apiClient.setPrimaryBeneficiary(item.id)).map(fromServer)); } catch (cause) { setError(apiErrorMessage(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };

  if (editing) {
    return <BeneficiaryForm item={editing} framework={framework} others={(items ?? []).filter(other => other.id !== editing.id)} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />;
  }

  const list = items ?? [];
  const usedWasiyyah = wasiyyahTotal(list);
  const usedWill = willTotal(list);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Profile')}</button>
      <h1 className="text-lg font-black flex items-center gap-2"><Users className="w-5 h-5 text-emerald-600" />{t('Beneficiaries')}</h1>

      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <p className="text-xs font-bold text-slate-500">{t('How your estate passes on')}</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('Estate framework')}>
          {(['Islamic', 'Civil'] as EstateFramework[]).map(option => (
            <button key={option} type="button" role="radio" aria-checked={framework === option} onClick={() => setFramework(option)} className={`py-2.5 rounded-xl text-sm font-black border ${framework === option ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}>
              {option === 'Islamic' ? t('Islamic (faraid)') : t('Civil (will)')}
            </button>
          ))}
        </div>
        {framework === 'Islamic' ? (
          <div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">{t('Wasiyyah used')}</span><span className="font-black">{t('{used}% of {limit}%', { used: usedWasiyyah.toFixed(2), limit: '33.33' })}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (usedWasiyyah / WASIYYAH_LIMIT_PCT) * 100)}%` }} /></div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">{t('Shares under your will')}</span><span className="font-black">{t('{used}% of {limit}%', { used: usedWill.toFixed(2), limit: '100' })}</span></div>
            <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, usedWill)}%` }} /></div>
          </div>
        )}
        <p className="text-[11px] text-slate-500">{t("These are your instructions to the estate officer. The final distribution follows the Syariah court's faraid certificate, or the grant of probate or letters of administration.")}</p>
      </section>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
      {!items && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {items && items.length === 0 && !error && <p className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">{t('No beneficiary yet.')}</p>}

      {list.map(item => (
        <article key={item.id} className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-black flex items-center gap-1.5">{item.name}{item.isPrimary && <Star className="w-4 h-4 text-amber-500 fill-amber-400" aria-label={t('Primary')} />}</p>
              <p className="text-xs text-slate-500">{t(item.relation)} · {t(item.distributionType)}</p>
            </div>
            <span className="text-sm font-black whitespace-nowrap">{hasOwnerSetShare(item.distributionType) ? `${item.allocationPercent}%` : t('By faraid')}</span>
          </div>
          {item.identityNumberMasked && <p className="text-[11px] text-slate-500">{t('ID')} {item.identityNumberMasked}</p>}
          {item.hibahAkad && <p className="text-[11px] text-slate-500">{t('Hibah: {status}', { status: t(item.hibahAkad.qabulStatus) })}</p>}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button type="button" onClick={() => setEditing(item)} className="flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold"><Pencil className="w-3.5 h-3.5" />{t('Edit')}</button>
            <button type="button" disabled={item.isPrimary || busy === item.id} onClick={() => void makePrimary(item)} className="flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold disabled:opacity-40"><Star className="w-3.5 h-3.5" />{t('Primary')}</button>
            <button type="button" disabled={busy === item.id} onClick={() => void remove(item)} className="flex items-center justify-center gap-1 py-2 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" />{t('Remove')}</button>
          </div>
        </article>
      ))}

      <button type="button" onClick={() => setEditing(blank(framework))} className="w-full flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-emerald-600 text-white text-sm font-black"><Plus className="w-4 h-4" />{t('Add a beneficiary')}</button>
    </div>
  );
};

interface BeneficiaryFormProps {
  item: BeneficiaryItem;
  framework: EstateFramework;
  others: BeneficiaryItem[];
  onDone: () => void;
  onCancel: () => void;
}

const BeneficiaryForm: React.FC<BeneficiaryFormProps> = ({ item, framework, others, onDone, onCancel }) => {
  const { t } = useT();
  const [form, setForm] = useState<BeneficiaryItem>(item);
  const [identityNumber, setIdentityNumber] = useState('');
  const [ijab, setIjab] = useState(!!item.hibahAkad);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const editingExisting = !!item.id;
  const isHibah = form.distributionType === 'Hibah Amanah';
  const types = TYPES_BY_FRAMEWORK[framework].includes(form.distributionType) ? TYPES_BY_FRAMEWORK[framework] : [form.distributionType, ...TYPES_BY_FRAMEWORK[framework]];
  const set = (patch: Partial<BeneficiaryItem>) => setForm({ ...form, ...patch });

  const save = async () => {
    setError('');
    if (!form.name.trim()) return setError(t("Enter the beneficiary's name."));
    if (hasOwnerSetShare(form.distributionType) && !(form.allocationPercent > 0 && form.allocationPercent <= 100)) return setError(t('Enter a share between 0 and 100%.'));
    const rule = estateRuleError(form, others);
    if (rule) return setError(t(rule));
    if (isHibah) {
      if (!form.email?.trim()) return setError(t("Hibah Amanah needs the recipient's email, so they can accept the hibah (qabul)."));
      if (!identityNumber.trim() && !item.identityNumberMasked) return setError(t("Hibah Amanah needs the recipient's national ID or passport number."));
      if (!ijab) return setError(t('Confirm the hibah offer (ijab) to continue.'));
    }
    setSaving(true);
    try {
      const payload = toServer({ ...form, name: form.name.trim(), identityNumber: identityNumber.trim() || undefined });
      if (editingExisting) await apiClient.updateBeneficiary(item.id, payload); else await apiClient.createBeneficiary(payload);
      onDone();
    } catch (cause) {
      setError(apiErrorMessage(cause, t('The beneficiary was not saved.')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onCancel} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Beneficiaries')}</button>
      <h1 className="text-lg font-black">{editingExisting ? t('Edit beneficiary') : t('Add a beneficiary')}</h1>
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <label className={label}>{t('Full name')}<input className={input} value={form.name} onChange={(event) => set({ name: event.target.value })} /></label>
        <label className={label}>{t('Relation')}
          <select className={input} value={form.relation} onChange={(event) => set({ relation: event.target.value as BeneficiaryItem['relation'] })}>
            {RELATIONS.map(relation => <option key={relation} value={relation}>{t(relation)}</option>)}
          </select>
        </label>
        <label className={label}>{t('Type')}
          <select className={input} value={form.distributionType} onChange={(event) => set({ distributionType: event.target.value as BeneficiaryItem['distributionType'] })}>
            {types.map(type => <option key={type} value={type}>{t(type)}</option>)}
          </select>
        </label>
        <p className="text-[11px] text-slate-500">{t(HINT[form.distributionType])}</p>
        {hasOwnerSetShare(form.distributionType) && (
          <label className={label}>{t('Share (%)')}<input type="number" inputMode="decimal" min={0} max={100} className={input} value={form.allocationPercent || ''} onChange={(event) => set({ allocationPercent: Number(event.target.value) })} /></label>
        )}
        <label className={label}>{t('Email')}{isHibah ? ` ${t('(needed for the hibah)')}` : ''}<input type="email" inputMode="email" className={input} value={form.email ?? ''} onChange={(event) => set({ email: event.target.value })} /></label>
        <label className={label}>{t('Phone')}<input type="tel" inputMode="tel" className={input} value={form.phone ?? ''} onChange={(event) => set({ phone: event.target.value })} /></label>
        <label className={label}>{t('National ID or passport number')}{isHibah ? ` ${t('(needed for the hibah)')}` : ''}
          <input className={input} value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} placeholder={item.identityNumberMasked ? t('Saved ({masked}); type to replace', { masked: item.identityNumberMasked }) : ''} />
        </label>
        <label className={label}>{t('How it is paid')}
          <select className={input} value={form.payoutMethod} onChange={(event) => set({ payoutMethod: event.target.value })}>
            {[...new Set([form.payoutMethod, ...PAYOUT_METHODS])].filter(Boolean).map(method => <option key={method} value={method}>{t(method)}</option>)}
          </select>
        </label>
        {isHibah && !item.hibahAkad && (
          <label className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-100">
            <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0" checked={ijab} onChange={(event) => setIjab(event.target.checked)} />
            {t('I make this offer of hibah (ijab) voluntarily, without payment in return, and I confirm that I am of age and of sound mind. The recipient accepts it (qabul) separately.')}
          </label>
        )}
        {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="py-3 rounded-2xl border border-slate-300 dark:border-slate-600 text-sm font-bold">{t('Cancel')}</button>
          <button type="button" disabled={saving} onClick={() => void save()} className="py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{saving ? t('Saving...') : t('Save')}</button>
        </div>
      </section>
    </div>
  );
};
