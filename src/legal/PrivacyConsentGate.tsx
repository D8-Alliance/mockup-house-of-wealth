import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiClient, apiErrorMessage } from '../services/apiClient';
import { useRBAC } from '../rbac/RBACContext';
import { PRIVACY_NOTICE, PRIVACY_NOTICE_VERSION } from './privacyNotice';

/**
 * After sign-in, asks the user to accept the current privacy notice (PDPA) once per version.
 * The acceptance is recorded on the server with time and IP. If the server cannot be reached,
 * the app is not blocked; the notice is asked for again at the next sign-in.
 */
export const PrivacyConsentGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logoutUser } = useRBAC();
  const [needed, setNeeded] = useState(false);
  const [lang, setLang] = useState<'ms' | 'en'>('ms');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getPrivacyConsent()
      .then((consent) => setNeeded(!consent.accepted))
      .catch(() => setNeeded(false));
  }, []);

  const accept = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.acceptPrivacyNotice(PRIVACY_NOTICE_VERSION);
      setNeeded(false);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Your acceptance was not saved. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  const notice = PRIVACY_NOTICE[lang];

  return (
    <>
      {children}
      {needed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="privacy-notice-heading">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4">
              <div>
                <h2 id="privacy-notice-heading" className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  {notice.heading}
                </h2>
                <p className="text-[11px] font-bold text-amber-600 mt-1">{notice.draftLabel} · {PRIVACY_NOTICE_VERSION}</p>
              </div>
              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0">
                {(['ms', 'en'] as const).map((code) => (
                  <button key={code} type="button" onClick={() => setLang(code)} className={`px-3 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${lang === code ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
                    {code === 'ms' ? 'Bahasa Melayu' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {notice.sections.map((section) => (
                <section key={section.title}>
                  <h3 className="font-extrabold text-slate-900 dark:text-white mb-1">{section.title}</h3>
                  {section.body.length > 1 ? (
                    <ul className="list-disc pl-5 space-y-0.5">{section.body.map((line) => <li key={line}>{line}</li>)}</ul>
                  ) : (
                    <p>{section.body[0]}</p>
                  )}
                </section>
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 space-y-3">
              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
              <label className="flex items-start gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-emerald-600" />
                <span>
                  {lang === 'ms'
                    ? 'Saya telah membaca notis ini dan bersetuju data peribadi saya, termasuk data sensitif, diproses untuk tujuan yang dinyatakan.'
                    : 'I have read this notice and agree to my personal data, including sensitive data, being processed for the purposes stated.'}
                </span>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={logoutUser} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                  {lang === 'ms' ? 'Tidak setuju, log keluar' : 'Decline and sign out'}
                </button>
                <button type="button" disabled={!agreed || saving} onClick={() => void accept()} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50">
                  {saving ? '…' : lang === 'ms' ? 'Setuju dan teruskan' : 'Agree and continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
