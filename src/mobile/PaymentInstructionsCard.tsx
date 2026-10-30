import React, { useEffect, useState } from 'react';
import { Check, Copy, Landmark } from 'lucide-react';
import { apiClient, PaymentInstructions } from '../services/apiClient';
import { formatProjectMoney } from '../components/sponsor/sponsorMoney';
import { useT } from './i18n';

/** A value the investor copies into their banking app, with a copy button. */
const CopyRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => {
  const { t } = useT();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); }).catch(() => undefined);
  };
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className={`text-sm font-black break-all ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</p>
      </div>
      <button type="button" onClick={copy} aria-label={t('Copy {label}', { label })} className="shrink-0 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500">
        {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

/**
 * Where the investor transfers the money for an order: the platform's trust account in their country, and the
 * order number as the reference so Finance can match the transfer. Money never goes to a sponsor directly.
 */
export const PaymentInstructionsCard: React.FC<{ orderId: string }> = ({ orderId }) => {
  const { t } = useT();
  const [info, setInfo] = useState<PaymentInstructions | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.getPaymentInstructions(orderId).then(setInfo).catch((cause) => setError(cause instanceof Error ? cause.message : t('The payment details could not be loaded.')));
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>;
  if (!info) return <p className="text-xs text-slate-500">{t('Loading the payment details...')}</p>;

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><Landmark className="w-4 h-4" />{t('How to pay')}</p>
      <div>
        <p className="text-[11px] text-slate-500">{t('Transfer')}</p>
        <p className="text-xl font-black">{formatProjectMoney(info.amount, info.currency)}</p>
      </div>
      {info.account ? (
        <>
          <CopyRow label={t('Bank')} value={info.account.bankName} />
          <CopyRow label={t('Account name')} value={info.account.accountName} />
          <CopyRow label={t('Account number')} value={info.account.accountNumber} mono />
          {info.account.swiftCode && <CopyRow label={t('SWIFT code (transfers from abroad)')} value={info.account.swiftCode} mono />}
          <CopyRow label={t('Payment reference (required)')} value={info.reference} mono />
          {info.account.instructions && <p className="text-xs text-slate-600 dark:text-slate-300">{info.account.instructions}</p>}
          <p className="text-[11px] text-slate-500">{t("This is the platform's trust account for your country. Your money stays there until Finance releases it to the project in stages; it never goes to the project sponsor directly.")}</p>
        </>
      ) : (
        <>
          <CopyRow label={t('Payment reference (required)')} value={info.reference} mono />
          <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-200">{t("The platform's bank account for your country is not set up yet, so do not transfer money now. Open this order again later in Portfolio to see the account, or cancel it there.")}</p>
        </>
      )}
    </div>
  );
};
