import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Lock,
  Bell,
  Coins,
  Globe,
  CheckCircle2,
  Save,
  Camera,
  Building2,
  AlertCircle,
  HeartHandshake,
  Sparkles
} from 'lucide-react';
import { UserProfile, LanguageCode, BeneficiaryItem, NavTab } from '../types';
import { AvatarChangeModal } from './AvatarChangeModal';
import { revenueService } from '../revenue/revenueService';
import { HoWCreditBalance } from '../revenue/revenueTypes';
import { apiClient, apiErrorMessage, KycApplication, ProfilePreferences } from '../services/apiClient';
import { SecuritySettingsPanel } from '../profile/SecuritySettingsPanel';
import { accountConsoleUrl } from '../auth/services/oidcAuthProvider';
import { FinancialPreferencesPanel } from '../profile/FinancialPreferencesPanel';
import { NotificationPreferencesPanel } from '../profile/NotificationPreferencesPanel';

function readPreferences(profile: Record<string, unknown> | undefined): ProfilePreferences {
  const value = profile?.preferences;
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ProfilePreferences : {};
}
import { useRBAC } from '../rbac/RBACContext';
import { authService } from '../auth/services/authService';
import { displayPhone, phoneFormatFor } from '../countryNodes/countryPhone';
import { KycApplicationPanel } from '../kyc/KycApplicationPanel';
import { kycBadgeText, roleNeedsKyc } from '../kyc/kycLabels';

interface UserProfileSettingsViewProps {
  user: UserProfile;
  lang: LanguageCode;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  setUser?: (updatedUser: UserProfile) => void;
  beneficiaries: BeneficiaryItem[];
  onUpdateBeneficiaries?: (beneficiaries: BeneficiaryItem[]) => void;
  setBeneficiaries?: React.Dispatch<React.SetStateAction<BeneficiaryItem[]>>;
  setTab?: (tab: NavTab) => void;
}

export const UserProfileSettingsView: React.FC<UserProfileSettingsViewProps> = ({
  user,
  lang,
  onUpdateUser,
  setUser,
  beneficiaries,
  onUpdateBeneficiaries,
  setBeneficiaries,
  setTab
}) => {
  const { updateBackendUser, canAccessTab, currentRole, authMode } = useRBAC();
  const needsKyc = roleNeedsKyc(currentRole);
  const signInAccountUrl = authMode === 'PRODUCTION' ? accountConsoleUrl('personal-info') : null;
  const handleUserUpdate = (u: UserProfile) => {
    if (onUpdateUser) onUpdateUser(u);
    if (setUser) setUser(u);
  };

  const handleBeneficiariesUpdate = (bens: BeneficiaryItem[]) => {
    if (onUpdateBeneficiaries) onUpdateBeneficiaries(bens);
    if (setBeneficiaries) setBeneficiaries(bens);
  };

  const userMembership = revenueService.getUserMembership(user.id);
  const [creditBalance, setCreditBalance] = useState<HoWCreditBalance>({ userId: user.id, totalCredits: 0, usedCredits: 0, availableCredits: 0, monthlyAllowance: 0, purchasedCredits: 0, resetDate: '' });
  const [activeTab, setActiveTab] = useState<'personal' | 'kyc' | 'security' | 'shariah' | 'beneficiary' | 'notifications'>('personal');
  const [kycApplication, setKycApplication] = useState<KycApplication | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  useEffect(() => {
    void apiClient.getMembershipCreditSummary().then(summary => setCreditBalance({ userId: summary.userId, totalCredits: summary.totalPoolCredits, usedCredits: summary.usedCredits, availableCredits: summary.availableBalance, monthlyAllowance: summary.monthlyAllowance, purchasedCredits: summary.purchasedCredits ?? 0, resetDate: summary.resetDate })).catch(() => undefined);
  }, [user.id]);

  useEffect(() => {
    let cancelled = false;
    setKycLoading(true);
    apiClient.getMyKyc()
      .then((application) => { if (!cancelled) setKycApplication(application); })
      .catch(() => { if (!cancelled) setKycApplication(null); })
      .finally(() => { if (!cancelled) setKycLoading(false); });
    return () => { cancelled = true; };
  }, [user.id]);
  const kycBadge = kycBadgeText(kycApplication);

  // Beneficiary Modal state
  const [beneficiaryModalOpen, setBeneficiaryModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<BeneficiaryItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<UserProfile>({ ...user });

  // Phone defaults to the dialling code of the user's own country node (e.g. +60 for Malaysia);
  // the saved number comes from the backend profile, stored there in international (E.164) form.
  const userCountryNodeId = authService.getAuthState().session?.user.countryNodeId;
  const phoneFormat = phoneFormatFor(userCountryNodeId);
  const [phoneError, setPhoneError] = useState('');
  const [preferences, setPreferences] = useState<ProfilePreferences>({});
  useEffect(() => {
    apiClient.getCurrentUser()
      .then((backendUser) => {
        setPreferences(readPreferences(backendUser.profile));
        const profile = backendUser.profile ?? {};
        setFormData((current) => ({
          ...current,
          name: backendUser.name,
          email: backendUser.email,
          ...(typeof profile.timezone === 'string' ? { timezone: profile.timezone } : {}),
          bio: typeof profile.bio === 'string' ? profile.bio : '',
        }));
        const saved = typeof backendUser.profile?.phone === 'string' ? backendUser.profile.phone : '';
        const savedAvatar = typeof backendUser.profile?.avatarUrl === 'string' ? backendUser.profile.avatarUrl : '';
        setFormData((current) => ({ ...current, phone: saved ? displayPhone(saved, userCountryNodeId) : `${phoneFormat.dialCode} `, ...(savedAvatar ? { avatarUrl: savedAvatar } : {}) }));
      })
      .catch(() => setFormData((current) => ({ ...current, phone: current.phone || `${phoneFormat.dialCode} ` })));
  }, [userCountryNodeId, phoneFormat.dialCode]);

  // CRUD Handlers for Beneficiaries
  const handleSetPrimaryBeneficiary = (id: string) => {
    const updated = beneficiaries.map(b => ({
      ...b,
      isPrimary: b.id === id
    }));
    handleBeneficiariesUpdate(updated);
    showToast('Primary beneficiary set successfully.');
  };

  const handleDeleteBeneficiary = (id: string) => {
    if (confirm('Are you sure you want to remove this beneficiary preference?')) {
      const updated = beneficiaries.filter(b => b.id !== id);
      handleBeneficiariesUpdate(updated);
      showToast('Beneficiary preference removed.');
    }
  };

  const handleSaveBeneficiary = (item: BeneficiaryItem) => {
    const exists = beneficiaries.some(b => b.id === item.id);
    let updated: BeneficiaryItem[];
    if (exists) {
      updated = beneficiaries.map(b => b.id === item.id ? item : b);
    } else {
      updated = [...beneficiaries, item];
    }

    if (item.isPrimary) {
      updated = updated.map(b => ({
        ...b,
        isPrimary: b.id === item.id
      }));
    }
    handleBeneficiariesUpdate(updated);
    showToast('Beneficiary & Wasiyyah preference saved successfully.');
  };

  const handleAvatarChange = async (newAvatarUrl: string) => {
    try {
      // Saved on the server (user profile), so the picture survives a reload and other devices see it.
      const saved = await apiClient.updateMyProfile({ avatarUrl: newAvatarUrl });
      updateBackendUser(saved);
      const updated = { ...formData, avatarUrl: newAvatarUrl };
      setFormData(updated);
      handleUserUpdate(updated);
      showToast('Profile picture updated successfully!');
    } catch (cause) {
      showToast(apiErrorMessage(cause, 'Unable to save your profile picture.'));
    }
  };
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Saves part of the preferences; the server keeps the rest. Errors are shown and re-thrown so the panel stays as it was.
  const savePreferences = async (change: ProfilePreferences) => {
    try {
      const saved = await apiClient.updateMyProfile({ preferences: change });
      setPreferences(readPreferences(saved.profile));
    } catch (cause) {
      showToast(apiErrorMessage(cause, 'Unable to save your preferences.'));
      throw cause;
    }
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    // Only the dialling code (or nothing) means "no phone number".
    const typedPhone = (formData.phone || '').trim();
    const phone = typedPhone === phoneFormat.dialCode ? '' : typedPhone;
    try {
      const saved = await apiClient.updateMyProfile({ phone, timezone: formData.timezone || 'Asia/Kuala_Lumpur', bio: formData.bio ?? '' });
      const savedPhone = typeof saved.profile?.phone === 'string' ? displayPhone(saved.profile.phone, userCountryNodeId) : `${phoneFormat.dialCode} `;
      setFormData((current) => ({ ...current, phone: savedPhone }));
      handleUserUpdate({
        ...formData,
        phone: savedPhone
      });
      showToast('Personal profile and settings updated successfully.');
    } catch (cause) {
      setPhoneError(apiErrorMessage(cause, 'Unable to save your phone number.'));
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Profile Hero Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-lg transition-colors">
        
        {/* Cover Pattern Banner */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 relative p-6 flex justify-between items-start">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/20 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5" />
            <span>D-8 Islamic Circular Economy Node</span>
          </div>

          {needsKyc && !kycLoading && (
            <button
              type="button"
              onClick={() => setActiveTab('kyc')}
              className={`relative z-10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${kycBadge.verified ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400/30' : 'bg-slate-900/50 text-amber-200 border-amber-300/30'}`}
              title="Open identity verification"
            >
              {kycBadge.verified ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-300" />}
              <span>{kycBadge.text}</span>
            </button>
          )}
        </div>

        {/* Profile Details Header Bar */}
        <div className="px-6 sm:px-8 pb-6 relative flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-16 sm:-mt-20">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            <div className="relative group cursor-pointer" onClick={() => setIsAvatarModalOpen(true)}>
              <img 
                src={formData.avatarUrl} 
                alt={formData.name} 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 group-hover:brightness-90 transition-all"
              />
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvatarModalOpen(true);
                }}
                className="absolute bottom-1 right-1 bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg hover:bg-emerald-700 hover:scale-105 transition-all cursor-pointer"
                title="Change Profile Picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {formData.name}
                </h1>
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {formData.role}
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-center sm:justify-start gap-2">
                <span>{formData.organization || 'Wealth Pooling Sovereign Fund'}</span>
                <span>•</span>
                <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  {formData.country} ({formData.countryCode})
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            {setTab && (
              <button
                type="button"
                onClick={() => setTab('membership')}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
              title="Manage Wealth Pooling Membership & AI Credits"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>{userMembership.tier} Plan ({creditBalance.availableCredits} Cr)</span>
              </button>
            )}
            <div className="text-right hidden md:block text-xs">
              <span className="text-slate-400 font-medium block">Member ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formData.id}</span>
            </div>
            <button 
              onClick={(event) => void handleSavePersonal(event)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation Controls */}
        <div className="px-6 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 flex overflow-x-auto gap-2">
          {[
            { id: 'personal', label: 'Personal Info', icon: <User className="w-4 h-4" /> },
            ...(needsKyc ? [{ id: 'kyc', label: 'Identity Verification', icon: <ShieldCheck className="w-4 h-4" /> }] : []),
            { id: 'security', label: 'Security & Auth', icon: <Lock className="w-4 h-4" /> },
            ...(needsKyc ? [{ id: 'shariah', label: 'Shariah & Financial', icon: <Coins className="w-4 h-4" /> }] : []),
            ...(canAccessTab('beneficiaries') ? [{ id: 'beneficiary', label: 'Beneficiaries', icon: <HeartHandshake className="w-4 h-4" /> }] : []),
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> }
          ].map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

      </div>

      {activeTab === 'kyc' && needsKyc && (
        <KycApplicationPanel application={kycApplication} loading={kycLoading} onChange={setKycApplication} />
      )}

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === 'personal' && (
        <form onSubmit={(event) => void handleSavePersonal(event)} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                <span>Personal Details & Identity</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your personal identity information registered with the D-8 Wealth Pooling network.
              </p>
            </div>

            {/* Profile Picture Control Banner */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <img 
                src={formData.avatarUrl} 
                alt="Current Avatar" 
                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700" 
              />
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">Profile Picture</span>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Full Legal Name
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.name}
                  readOnly
                  aria-label="Full legal name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Official Email Address
              </label>
              <div className="relative">
                <input 
                  type="email"
                  value={formData.email}
                  readOnly
                  aria-label="Official email address"
                  className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <span className="absolute right-3 top-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Verified
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.phone || ''}
                  placeholder={phoneFormat.example}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Include the country code, e.g. {phoneFormat.example}. A local number (starting with 0) gets {phoneFormat.dialCode} added automatically.</p>
              {phoneError && <p className="mt-1 text-[11px] font-semibold text-rose-600">{phoneError}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Organization / Masjid Node
              </label>
              <div className="relative">
                <input 
                  type="text"
                  value={formData.organization || ''}
                  readOnly
                  aria-label="Organisation"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Primary D-8 Member Country
              </label>
              <div className="relative">
                <input
                  type="text"
                  aria-label="Primary D-8 member country"
                  value={formData.countryCode ? `${formData.country} (${formData.countryCode})` : formData.country}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Preferred Timezone
              </label>
              <select
                value={formData.timezone || 'Asia/Kuala_Lumpur'}
                onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Asia/Kuala_Lumpur">(GMT+08:00) Malaysia Time - Kuala Lumpur</option>
                <option value="Europe/Istanbul">(GMT+03:00) Turkey Time - Istanbul</option>
                <option value="Asia/Jakarta">(GMT+07:00) Western Indonesia Time - Jakarta</option>
                <option value="Asia/Dhaka">(GMT+06:00) Bangladesh Standard Time - Dhaka</option>
                <option value="Africa/Cairo">(GMT+02:00) Eastern European Time - Cairo</option>
                <option value="Africa/Lagos">(GMT+01:00) West Africa Time - Lagos</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
            Your name and email come from your sign-in account{signInAccountUrl ? <>: change them on the <a href={signInAccountUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline">secure sign-in service</a> and they update here at your next sign-in</> : null}. Your organisation and country are set by your administrator.
          </p>

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Professional & Shariah Mandate Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio || ''}
              maxLength={1000}
              placeholder="A short description of your role, shown to colleagues on the platform."
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Update Profile</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && <SecuritySettingsPanel authMode={authMode} />}

      {activeTab === 'shariah' && needsKyc && (
        <FinancialPreferencesPanel preferences={preferences} onSave={savePreferences} showPayoutAccounts={needsKyc} notify={showToast} />
      )}

      {/* TAB 4: BENEFICIARY & DISTRIBUTION PREFERENCES */}
      {activeTab === 'beneficiary' && canAccessTab('beneficiaries') && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-500" />
            <span>Beneficiaries & Estate Instructions</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            Your heirs, hibah, wasiyyah (or will) and charitable giving are managed on one screen, so the platform knows how your investments and assets pass on. You have {beneficiaries.length} beneficiaries listed.
          </p>
          <button
            type="button"
            onClick={() => setTab?.('beneficiaries')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
          >
            Open Beneficiaries & Estate Instructions
          </button>
        </div>
      )}

      {activeTab === 'notifications' && <NotificationPreferencesPanel preferences={preferences} onSave={savePreferences} />}

      {/* Avatar Change Modal */}
      {isAvatarModalOpen && (
        <AvatarChangeModal
          currentAvatar={formData.avatarUrl}
          userName={formData.name}
          onClose={() => setIsAvatarModalOpen(false)}
          onSaveAvatar={handleAvatarChange}
        />
      )}



    </div>
  );
};
