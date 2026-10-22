import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Download, ShieldCheck } from 'lucide-react';
import { AgreementIntegrity, apiClient, apiErrorMessage } from '../../../services/apiClient';
import { formatDateTimeWithZone } from '../../../utils/platformTime';

/**
 * The signed agreement once both sides signed: its seal and time-stamp status, checked by the server
 * each time, and the sealed PDF and time-stamp token to download.
 */
export const SignedAgreementPanel: React.FC<{ agreementId: string }> = ({ agreementId }) => {
  const [integrity, setIntegrity] = useState<AgreementIntegrity | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => apiClient.getAgreementIntegrity(agreementId).then((result) => {
      setIntegrity(result);
      // Sealing runs just after the second signature; look again for a minute or so.
      if ((result.status === 'NOT_SEALED' || result.status === 'SEALED') && tries++ < 12) timer = setTimeout(() => void load(), 5000);
    }).catch((cause) => setError(apiErrorMessage(cause, 'The signed agreement could not be checked.')));
    void load();
    return () => { if (timer) clearTimeout(timer); };
  }, [agreementId]);

  const download = (kind: 'pdf' | 'tsr') => void (kind === 'pdf' ? apiClient.downloadSignedAgreement(agreementId) : apiClient.downloadAgreementTimestamp(agreementId)).catch((cause) => setError(apiErrorMessage(cause, 'Not available yet.')));
  const status = integrity?.status;

  return (
    <section className="space-y-2 p-4 rounded-2xl border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/10 text-xs">
      <h4 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" />Signed agreement</h4>
      {!integrity && !error && <p className="text-slate-400">Checking…</p>}
      {status === 'NOT_SEALED' && <p className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><Clock className="w-3.5 h-3.5" />Being sealed and time-stamped…</p>}
      {status === 'SEALED' && <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Clock className="w-3.5 h-3.5" />Sealed by the platform. The independent time-stamp is still being obtained; the platform retries.</p>}
      {status === 'VERIFIED' && integrity && (
        <div className="space-y-1">
          <p className="font-bold text-emerald-700 dark:text-emerald-300">Seal and time-stamp verified{integrity.checkedAt ? ` (checked ${formatDateTimeWithZone(integrity.checkedAt)})` : ''}.</p>
          {integrity.timestamp?.at && <p className="text-slate-600 dark:text-slate-300">Time-stamped {formatDateTimeWithZone(integrity.timestamp.at)} by {integrity.timestamp.authority}.</p>}
          <p className="font-mono text-[10px] text-slate-400 break-all">SHA-256 {integrity.sha256}</p>
        </div>
      )}
      {status === 'MISMATCH' && <p className="flex items-start gap-1.5 font-bold text-rose-700 dark:text-rose-300"><AlertTriangle className="w-4 h-4 shrink-0" />{integrity?.note ?? 'The stored file no longer matches its seal.'} An administrator has been told.</p>}
      {error && <p className="text-rose-600 font-bold">{error}</p>}
      {(status === 'VERIFIED' || status === 'SEALED') && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => download('pdf')} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"><Download className="w-3.5 h-3.5" />Signed PDF</button>
          {status === 'VERIFIED' && <button type="button" onClick={() => download('tsr')} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"><Download className="w-3.5 h-3.5" />Time-stamp token (.tsr)</button>}
        </div>
      )}
      <p className="text-[10px] text-slate-400">The PDF carries a Certificate of Completion and the platform's seal: any change to it breaks the seal. The time-stamp token proves the file existed unchanged at that time; it can be checked with openssl ts -verify.</p>
    </section>
  );
};
