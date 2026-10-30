import React, { useEffect, useState } from 'react';
import { Camera, ChevronRight, ExternalLink, FileText, KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, UserRound } from 'lucide-react';
import { useRBAC } from '../../rbac/RBACContext';
import { canInvest } from '../../rbac/menuVisibility';
import { apiClient, apiErrorMessage, BackendUser, KycApplication } from '../../services/apiClient';
import { KYC_DOCUMENT_LABELS, KYC_ID_DOCUMENT_LABELS, KYC_LEVEL_LABELS, KYC_STATUS_LABELS } from '../../kyc/kycLabels';
import { accountConsoleUrl } from '../../auth/services/oidcAuthProvider';
import { avatarFromPhoto } from '../avatarImage';
import { ESTATE_ROLES } from '../mobileRoles';
import { LanguageToggle, useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3';
const row = 'flex justify-between gap-3 text-xs';

/** The middle of an identity number is hidden on screen; the person can reveal it. */
const maskNumber = (value: string) => (value.length <= 6 ? value : `${value.slice(0, 2)}${'•'.repeat(Math.max(3, value.length - 6))}${value.slice(-4)}`);

/**
 * The signed-in person's own page: their profile (name and email come from the sign-in account; the phone number
 * is edited here), their KYC as submitted with its documents, the sign-in security pages, and signing out.
 */
export const MobileProfile: React.FC<{ onOpenKyc: () => void; onOpenBeneficiaries: () => void; onAvatarChange: (url: string) => void }> = ({ onOpenKyc, onOpenBeneficiaries, onAvatarChange }) => {
  const { currentRole, logoutUser, authMode } = useRBAC();
  const { t, locale } = useT();
  const investor = canInvest(currentRole);
  const [me, setMe] = useState<BackendUser | null>(null);
  const [kyc, setKyc] = useState<KycApplication | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState('');
  const [showNumber, setShowNumber] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatar = typeof me?.profile?.avatarUrl === 'string' ? me.profile.avatarUrl : '';

  // A photo is cropped square and shrunk on the phone, then saved on the profile; empty removes it.
  const saveAvatar = async (file: File | null) => {
    setSavingAvatar(true);
    setError('');
    try {
      const avatarUrl = file ? await avatarFromPhoto(file) : '';
      const saved = await apiClient.updateMyProfile({ avatarUrl });
      setMe(saved);
      onAvatarChange(typeof saved.profile?.avatarUrl === 'string' ? saved.profile.avatarUrl : '');
    } catch (cause) {
      setError(apiErrorMessage(cause, t('The picture was not saved.')));
    } finally {
      setSavingAvatar(false);
    }
  };

  useEffect(() => {
    apiClient.getCurrentUser()
      .then((user) => { setMe(user); setPhone(typeof user.profile?.phone === 'string' ? user.profile.phone : ''); })
      .catch((cause) => setError(apiErrorMessage(cause, t('Your profile could not be loaded.'))));
    if (investor) apiClient.getMyKyc().then(setKyc).catch(() => setKyc(null));
  }, [investor]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePhone = async () => {
    setSavingPhone(true);
    setPhoneNotice('');
    setError('');
    try {
      const saved = await apiClient.updateMyProfile({ phone: phone.trim() });
      setMe(saved);
      setPhone(typeof saved.profile?.phone === 'string' ? saved.profile.phone : '');
      setPhoneNotice(t('Phone number saved.'));
    } catch (cause) {
      setError(apiErrorMessage(cause, t('The phone number was not saved.')));
    } finally {
      setSavingPhone(false);
    }
  };

  const organisations = me ? [...new Map(me.assignedRoles.map(role => [role.organisationId, role.organisationName ?? role.organisationId])).values()] : [];
  const roles = me ? [...new Set(me.assignedRoles.map(role => role.role))] : [];
  const savedPhone = typeof me?.profile?.phone === 'string' ? me.profile.phone : '';
  // Keycloak's own account pages; in the demo there is no Keycloak.
  const security = authMode === 'PRODUCTION' ? [
    { label: t('Change password'), icon: <KeyRound className="w-4 h-4" />, url: accountConsoleUrl('signing-in') },
    { label: t('Name and email'), icon: <UserRound className="w-4 h-4" />, url: accountConsoleUrl('personal-info') },
    { label: t('Signed-in devices'), icon: <Smartphone className="w-4 h-4" />, url: accountConsoleUrl('device-activity') },
  ].filter(item => item.url) : [];
  const kycEditable = kyc === null || kyc?.status === 'DRAFT' || kyc?.status === 'RESUBMISSION_REQUIRED';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-black">{t('My profile')}</h1>
      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      <section className={card}>
        <div className="flex items-start gap-3">
          <label className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-base font-black uppercase cursor-pointer" aria-label={t('Change profile picture')}>
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : (me?.name ?? '?').split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('')}
            <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white flex justify-center py-0.5">{savingAvatar ? <span className="text-[9px]">...</span> : <Camera className="w-3.5 h-3.5" />}</span>
            <input type="file" accept="image/*" className="hidden" disabled={savingAvatar} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void saveAvatar(file); }} />
          </label>
          <div className="min-w-0">
            <p className="text-base font-black">{me?.name ?? t('Loading...')}</p>
            <p className="text-xs text-slate-500 break-all">{me?.email}</p>
            {avatar && <button type="button" disabled={savingAvatar} onClick={() => void saveAvatar(null)} className="mt-1 text-[11px] font-bold text-rose-600 underline disabled:opacity-50">{t('Remove picture')}</button>}
          </div>
        </div>
        <dl className="space-y-2">
          <div className={row}><dt className="text-slate-500">{t('Member ID')}</dt><dd className="font-mono font-bold text-right break-all">{me?.id ?? '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">{t('Country')}</dt><dd className="font-bold text-right">{me?.homeCountryNodeId ?? me?.assignedRoles[0]?.countryNodeId ?? '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">{t('Organisation')}</dt><dd className="font-bold text-right">{organisations.join(', ') || '—'}</dd></div>
          <div className={row}><dt className="text-slate-500">{t('Role')}</dt><dd className="font-bold text-right">{(roles.length ? roles : [currentRole]).map(role => t(role)).join(', ')}</dd></div>
        </dl>
        <label className="block text-xs font-bold text-slate-500">{t('Phone number')}
          <input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={t('e.g. 012-345 6789')} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-base text-slate-900 dark:text-white" />
        </label>
        {phoneNotice && <p role="status" className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{phoneNotice}</p>}
        <button type="button" disabled={savingPhone || phone.trim() === savedPhone} onClick={() => void savePhone()} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black disabled:opacity-50">{savingPhone ? t('Saving...') : t('Save phone number')}</button>
        <p className="text-[11px] text-slate-500">{t('Your name and email come from your sign-in account; change them under Security.')}</p>
      </section>

      {investor && (
        <section className={card}>
          <h2 className="text-sm font-black flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-600" />{t('My KYC')}</h2>
          {kyc === undefined && <p className="text-xs text-slate-500">{t('Loading...')}</p>}
          {kyc === null && <p className="text-xs text-slate-500">{t('Not started. Verify your identity to invest.')}</p>}
          {kyc && (
            <>
              <dl className="space-y-2">
                <div className={row}><dt className="text-slate-500">{t('Status')}</dt><dd className="font-bold text-right">{t(KYC_STATUS_LABELS[kyc.status])}{kyc.status === 'APPROVED' && kyc.kycLevel ? ` · ${t(KYC_LEVEL_LABELS[kyc.kycLevel])}` : ''}</dd></div>
                <div className={row}><dt className="text-slate-500">{t('Application')}</dt><dd className="font-mono font-bold text-right">{kyc.applicationNumber}</dd></div>
                <div className={row}><dt className="text-slate-500">{t('Name')}</dt><dd className="font-bold text-right">{kyc.fullName || '—'}</dd></div>
                <div className={row}><dt className="text-slate-500">{t('Date of birth')}</dt><dd className="font-bold text-right">{kyc.dateOfBirth ? new Date(kyc.dateOfBirth).toLocaleDateString(locale) : '—'}</dd></div>
                <div className={row}><dt className="text-slate-500">{t('Nationality')}</dt><dd className="font-bold text-right">{kyc.nationality || '—'}</dd></div>
                <div className={row}>
                  <dt className="text-slate-500">{kyc.idDocumentType ? t(KYC_ID_DOCUMENT_LABELS[kyc.idDocumentType]) : t('Document')}</dt>
                  <dd className="font-bold text-right">
                    {kyc.idDocumentNumber ? (showNumber ? kyc.idDocumentNumber : maskNumber(kyc.idDocumentNumber)) : '—'}
                    {kyc.idDocumentNumber && <button type="button" onClick={() => setShowNumber(!showNumber)} className="ml-2 text-emerald-700 dark:text-emerald-400 underline">{showNumber ? t('Hide') : t('Show')}</button>}
                  </dd>
                </div>
                <div className={row}><dt className="text-slate-500">{t('Address')}</dt><dd className="font-bold text-right">{kyc.residentialAddress || '—'}</dd></div>
              </dl>
              {kyc.reviewComment && (kyc.status === 'RESUBMISSION_REQUIRED' || kyc.status === 'REJECTED') && (
                <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200"><span className="font-bold">{t('The officer says:')}</span> {kyc.reviewComment}</p>
              )}
              {(kyc.documents ?? []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-slate-500">{t('Documents')}</p>
                  {(kyc.documents ?? []).map(document => (
                    <button key={document.id} type="button" onClick={() => void apiClient.downloadMyKycDocument(document.id).catch((cause) => setError(apiErrorMessage(cause, t('The document is unavailable.'))))} className="w-full flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-2.5 text-left text-xs">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="min-w-0 flex-1"><span className="block font-bold">{t(KYC_DOCUMENT_LABELS[document.documentType])}</span><span className="block text-slate-500 truncate">{document.fileName}</span></span>
                      <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {kyc !== undefined && kycEditable && (
            <button type="button" onClick={onOpenKyc} className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-black">
              {kyc?.status === 'RESUBMISSION_REQUIRED' ? t('Make the corrections') : kyc ? t('Continue verification') : t('Verify my identity')}<ChevronRight className="w-4 h-4" />
            </button>
          )}
        </section>
      )}

      {ESTATE_ROLES.includes(currentRole) && (
        <button type="button" onClick={onOpenBeneficiaries} className="w-full flex items-center justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left">
          <span>
            <span className="block text-sm font-black">{t('Beneficiaries')}</span>
            <span className="block text-xs text-slate-500">{t('Who receives your investments: hibah, wasiyyah, faraid or a will')}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </button>
      )}

      {security.length > 0 && (
        <section className={card}>
          <h2 className="text-sm font-black flex items-center gap-2"><KeyRound className="w-4 h-4 text-emerald-600" />{t('Security')}</h2>
          {security.map(item => (
            <a key={item.label} href={item.url!} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-3 text-sm font-bold">
              {item.icon}<span className="flex-1">{item.label}</span><ExternalLink className="w-4 h-4 text-slate-400" />
            </a>
          ))}
          <p className="text-[11px] text-slate-500">{t('These open your sign-in account page. Forgot your password? Use "Forgot password" on the sign-in page.')}</p>
        </section>
      )}

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black">{t('Language')}</h2>
            <p className="text-[11px] text-slate-500">{t('Bahasa Melayu or English, saved with your account.')}</p>
          </div>
          <LanguageToggle saveToAccount tone="light" />
        </div>
      </section>

      <a href="/" className="flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-sm font-bold">
        <Monitor className="w-4 h-4" />{t('Open the full website')}
      </a>
      <button type="button" onClick={logoutUser} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm font-bold text-rose-700 dark:text-rose-300">
        <LogOut className="w-4 h-4" />{t('Sign out')}
      </button>
    </div>
  );
};
