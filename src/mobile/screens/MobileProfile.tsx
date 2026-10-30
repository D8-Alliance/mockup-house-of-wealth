import React, { useEffect, useState } from 'react';
import { ChevronRight, ExternalLink, FileText, KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest } from '../../rbac/menuVisibility';
import { apiClient, apiErrorMessage, BackendUser, KycApplication } from '../../services/apiClient';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_LEVEL_LABELS, KYC_STATUS_LABELS } from '../../kyc/kycLabels';
import { accountConsoleUrl } from '../../auth/services/oidcAuthProvider';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3';
const row = 'flex justify-between gap-3 text-xs';

/** The middle of an identity number is hidden on screen; the person can reveal it. */
const maskNumber = (value: string) => (value.length <= 6 ? value : `${value.slice(0, 2)}${'•'.repeat(Math.max(3, value.length - 6))}${value.slice(-4)}`);

/**
 * The signed-in person's own page: their profile (name and email come from the sign-in account; the phone number
 * is edited here), their KYC as submitted with its documents, the sign-in security pages, and signing out.
 */
export const MobileProfile: React.FC<{ onOpenKyc: () => void }> = ({ onOpenKyc }) => {
  const { currentRole, logoutUser, authMode } = useRBAC();
  const investor = canInvest(currentRole);
  const [me, setMe] = useState<BackendUser | null>(null);
  const [kyc, setKyc] = useState<KycApplication | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState('');
  const [showNumber, setShowNumber] = useState(false);

  useEffect(() => {
    apiClient.getCurrentUser()
      .then((user) => { setMe(user); setPhone(typeof user.profile?.phone === 'string' ? user.profile.phone : ''); })
      .catch((cause) => setError(apiErrorMessage(cause, 'Your profile could not be loaded.')));
    if (investor) apiClient.getMyKyc().then(setKyc).catch(() => setKyc(null));
  }, [investor]);

  const savePhone = async () => {
    setSavingPhone(true);
    setPhoneNotice('');
    setError('');
    try {
      const saved = await apiClient.updateMyProfile({ phone: phone.trim() });
      setMe(saved);
      setPhone(typeof saved.profile?.phone === 'string' ? saved.profile.phone : '');
      setPhoneNotice('Phone number saved.');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The phone number was not saved.'));
    } finally {
      setSavingPhone(false);
    }
  };

  const organisations = me ? [...new Map(me.assignedRoles.map(role => [role.organisationId, role.organisationName ?? role.organisationId])).values()] : [];
  const roles = me ? [...new Set(me.assignedRoles.map(role => role.role))] : [];
  const savedPhone = typeof me?.profile?.phone === 'string' ? me.profile.phone : '';
  // Keycloak's own account pages; in the demo there is no Keycloak.
  const security = authMode === 'PRODUCTION' ? [
    { label: 'Change password', icon: <KeyRound className="w-4 h-4" />, url: accountConsoleUrl('signing-in') },
    { label: 'Name and email', icon: <UserRound className="w-4 h-4" />, url: accountConsoleUrl('personal-info') },
    { label: 'Signed-in devices', icon: <Smartphone className="w-4 h-4" />, url: accountConsoleUrl('device-activity') },
  ].filter(item => item.url) : [];
  const kycEditable = kyc === null || kyc?.status === 'DRAFT' || kyc?.status === 'RESUBMISSION_REQUIRED';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black">My profile</h1>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      <section className={card}>
        <div className="flex items-start gap-3">
          <span className="w-12 h-12 shrink-0 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-black uppercase">{(me?.name ?? '?').split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('')}</span>
          <div className="min-w-0">
            <p className="text-base font-black">{me?.name ?? 'Loading...'}</p>
            <p className="text-xs text-slate-500 break-all">{me?.email}</p>
          </div>
        </div>
        <dl className="space-y-2">
          <div className={row}><dt className="text-slate-500">Member ID</dt><dd className="font-mono font-bold text-right break-all">{me?.id ?? '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">Country</dt><dd className="font-bold text-right">{me?.homeCountryNodeId ?? me?.assignedRoles[0]?.countryNodeId ?? '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">Organisation</dt><dd className="font-bold text-right">{organisations.join(', ') || '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">Role</dt><dd className="font-bold text-right">{roles.join(', ') || currentRole}</dd></div>
        </dl>
        <label className="block text-xs font-bold text-slate-500">Phone number
          <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="e.g. 012-345 6789" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base text-slate-900 dark:text-white" />
        </label>
        {phoneNotice && <p role="status" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{phoneNotice}</p>}
        <button type="button" disabled={savingPhone || phone.trim() === savedPhone} onClick={() => void savePhone()} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{savingPhone ? 'Saving...' : 'Save phone number'}</button>
        <p className="text-[11px] text-slate-500">Your name and email come from your sign-in account; change them under Security.</p>
      </section>

      {investor && (
        <section className={card}>
          <h2 className="text-sm font-black flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />My KYC</h2>
          {kyc === undefined && <p className="text-xs text-slate-500">Loading...</p>}
          {kyc === null && <p className="text-xs text-slate-500">Not started. Verify your identity to invest.</p>}
          {kyc && (
            <>
              <dl className="space-y-2">
                <div className={row}><dt className="text-slate-500">Status</dt><dd className="font-bold text-right">{KYC_STATUS_LABELS[kyc.status]}{kyc.status === 'APPROVED' && kyc.kycLevel ? ` · ${KYC_LEVEL_LABELS[kyc.kycLevel]}` : ''}</dd></div>
                <div className={row}><dt className="text-slate-500">Application</dt><dd className="font-mono font-bold text-right">{kyc.applicationNumber}</dd></div>
                <div className={row}><dt className="text-slate-500">Name</dt><dd className="font-bold text-right">{kyc.fullName || '—'}</dd></div>
                <div className={row}><dt className="text-slate-500">Date of birth</dt><dd className="font-bold text-right">{kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString('en-MY') : '—'}</dd></div>
                <div className={row}><dt className="text-slate-500">Nationality</dt><dd className="font-bold text-right">{kyc.nationality || '—'}</dd></div>
                <div className={row}>
                  <dt className="text-slate-500">{kyc.idDocumentType ? KYC_ID_DOCUMENT_LABELS[kyc.idDocumentType] : 'Document'}</dt>
                  <dd className="font-bold text-right">
                    {kyc.idDocumentNumber ? (showNumber ? kyc.idDocumentNumber : maskNumber(kyc.idDocumentNumber)) : '—'}
                    {kyc.idDocumentNumber && <button type="button" onClick={() => setShowNumber(!showNumber)} className="ml-2 text-emerald-700 dark:text-emerald-400 underline">{showNumber ? 'Hide' : 'Show'}</button>}
                  </dd>
                </div>
                <div className={row}><dt className="text-slate-500">Address</dt><dd className="font-bold text-right">{kyc.residentialAddress || '—'}</dd></div>
              </dl>
              {kyc.reviewComment && (kyc.status === 'RESUBMISSION_REQUIRED' || kyc.status === 'REJECTED') && (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"><span className="font-bold">The officer says:</span> {kyc.reviewComment}</p>
              )}
              {kyc.documents.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500">Documents</p>
                  {kyc.documents.map(document => (
                    <button key={document.id} type="button" onClick={() => void apiClient.downloadMyKycDocument(document.id).catch((cause) => setError(apiErrorMessage(cause, 'The document is unavailable.')))} className="w-full flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-left text-xs">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block font-bold">{KYC_DOCUMENT_LABELS[document.documentType]}</span><span className="block text-slate-500 truncate">{document.fileName}</span></span>
                      <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {kyc !== undefined && kycEditable && (
            <button type="button" onClick={onOpenKyc} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black">
              {kyc?.status === 'RESUBMISSION_REQUIRED' ? 'Make the corrections' : kyc ? 'Continue verification' : 'Verify my identity'}<ChevronRight className="w-4 h-4" />
            </button>
          )}
        </section>
      )}

      {security.length > 0 && (
        <section className={card}>
          <h2 className="text-sm font-black flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-600" />Security</h2>
          {security.map(item => (
            <a key={item.label} href={item.url!} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm font-bold">
              {item.icon}<span className="flex-1">{item.label}</span><ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          ))}
          <p className="text-[11px] text-slate-500">These open your sign-in account page. Forgot your password? Use "Forgot password" on the sign-in page.</p>
        </section>
      )}

      <a href="/" className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm font-bold">
        <Monitor className="w-4 h-4" />Open the full website
      </a>
      <button type="button" onClick={logoutUser} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
        <LogOut className="w-4 h-4" />Sign out
      </button>
    </div>
  );
};
