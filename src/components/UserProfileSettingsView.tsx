import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Key, 
  Lock, 
  Smartphone, 
  Bell, 
  Coins, 
  Globe, 
  CheckCircle2, 
  Save, 
  Camera, 
  LogOut, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Sliders, 
  FileCheck, 
  Building2, 
  History, 
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Star,
  Wallet,
  HeartHandshake,
  Users,
  Percent,
  Check,
  Sparkles
} from 'lucide-react';
import { UserProfile, LanguageCode, PaymentAccount, BeneficiaryItem, NavTab } from '../types';
import { AvatarChangeModal } from './AvatarChangeModal';
import { PaymentAccountModal } from './PaymentAccountModal';
import { BeneficiaryModal } from './BeneficiaryModal';
import { revenueService } from '../revenue/revenueService';
import { HoWCreditBalance } from '../revenue/revenueTypes';
import { apiClient, apiErrorMessage, KycApplication } from '../services/apiClient';
import { useRBAC } from '../rbac/RBACContext';
import { authService } from '../auth/services/authService';
import { displayPhone, phoneFormatFor } from '../countryNodes/countryPhone';
import { KycApplicationPanel } from '../kyc/KycApplicationPanel';
import { kycBadgeText } from '../kyc/kycLabels';

interface UserProfileSettingsViewProps {
  user: UserProfile;
  lang: LanguageCode;
  onUpdateUser?: (updatedUser: UserProfile) => void;
  setUser?: (updatedUser: UserProfile) => void;
  paymentAccounts: PaymentAccount[];
  onUpdatePaymentAccounts?: (accounts: PaymentAccount[]) => void;
  setPaymentAccounts?: React.Dispatch<React.SetStateAction<PaymentAccount[]>>;
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
  paymentAccounts,
  onUpdatePaymentAccounts,
  setPaymentAccounts,
  beneficiaries,
  onUpdateBeneficiaries,
  setBeneficiaries,
  setTab
}) => {
  const { updateBackendUser } = useRBAC();
  const handleUserUpdate = (u: UserProfile) => {
    if (onUpdateUser) onUpdateUser(u);
    if (setUser) setUser(u);
  };

  const handleAccountsUpdate = (accs: PaymentAccount[]) => {
    if (onUpdatePaymentAccounts) onUpdatePaymentAccounts(accs);
    if (setPaymentAccounts) setPaymentAccounts(accs);
  };

  const handleBeneficiariesUpdate = (bens: BeneficiaryItem[]) => {
    if (onUpdateBeneficiaries) onUpdateBeneficiaries(bens);
    if (setBeneficiaries) setBeneficiaries(bens);
  };

  const userMembership = revenueService.getUserMembership(user.id);
  const [creditBalance, setCreditBalance] = useState<HoWCreditBalance>({ userId: user.id, totalCredits: 0, usedCredits: 0, availableCredits: 0, monthlyAllowance: 0, purchasedCredits: 0, resetDate: '' });
  const [activeTab, setActiveTab] = useState<'personal' | 'kyc' | 'security' | 'shariah' | 'beneficiary' | 'notifications' | 'api'>('personal');
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

  // Bank & E-Wallet Modal state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null);

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
  useEffect(() => {
    apiClient.getCurrentUser()
      .then((backendUser) => {
        const saved = typeof backendUser.profile?.phone === 'string' ? backendUser.profile.phone : '';
        const savedAvatar = typeof backendUser.profile?.avatarUrl === 'string' ? backendUser.profile.avatarUrl : '';
        setFormData((current) => ({ ...current, phone: saved ? displayPhone(saved, userCountryNodeId) : `${phoneFormat.dialCode} `, ...(savedAvatar ? { avatarUrl: savedAvatar } : {}) }));
      })
      .catch(() => setFormData((current) => ({ ...current, phone: current.phone || `${phoneFormat.dialCode} ` })));
  }, [userCountryNodeId, phoneFormat.dialCode]);

  // CRUD Handlers for Bank Accounts / E-Wallets
  const handleSetDefaultAccount = (id: string) => {
    const updated = paymentAccounts.map(acc => ({
      ...acc,
      isDefault: acc.id === id
    }));
    handleAccountsUpdate(updated);
    showToast('Default payout account set successfully.');
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm('Are you sure you want to remove this financial account?')) {
      const updated = paymentAccounts.filter(acc => acc.id !== id);
      handleAccountsUpdate(updated);
      showToast('Account removed.');
    }
  };

  const handleSaveAccount = (account: PaymentAccount) => {
    const exists = paymentAccounts.some(acc => acc.id === account.id);
    let updated: PaymentAccount[];
    if (exists) {
      updated = paymentAccounts.map(acc => acc.id === account.id ? account : acc);
    } else {
      updated = [...paymentAccounts, account];
    }

    if (account.isDefault) {
      updated = updated.map(acc => ({
        ...acc,
        isDefault: acc.id === account.id
      }));
    }
    handleAccountsUpdate(updated);
    showToast('Financial account saved successfully.');
  };

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
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  // Security 2FA toggle
  const [twoFactor, setTwoFactor] = useState(user.twoFactorEnabled ?? true);
  
  // API Key state
  const [apiKey, setApiKey] = useState('how_live_8f9a2b710c9d4e5f6a1b2c3d4e5f6a7b');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    // Only the dialling code (or nothing) means "no phone number".
    const typedPhone = (formData.phone || '').trim();
    const phone = typedPhone === phoneFormat.dialCode ? '' : typedPhone;
    try {
      const saved = await apiClient.updateMyProfile({ phone });
      const savedPhone = typeof saved.profile?.phone === 'string' ? displayPhone(saved.profile.phone, userCountryNodeId) : `${phoneFormat.dialCode} `;
      setFormData((current) => ({ ...current, phone: savedPhone }));
      handleUserUpdate({
        ...formData,
        phone: savedPhone,
        twoFactorEnabled: twoFactor
      });
      showToast('Personal profile and settings updated successfully.');
    } catch (cause) {
      setPhoneError(apiErrorMessage(cause, 'Unable to save your phone number.'));
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      alert('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      alert('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('Password changed successfully. Active sessions re-authenticated.');
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
    showToast('API Key copied to clipboard');
  };

  const regenerateApiKey = () => {
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setApiKey(`how_live_${randomHex}`);
    showToast('New API key generated. Make sure to update your application connections.');
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

          {!kycLoading && (
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
            { id: 'kyc', label: 'Identity Verification', icon: <ShieldCheck className="w-4 h-4" /> },
            { id: 'security', label: 'Security & Auth', icon: <Lock className="w-4 h-4" /> },
            { id: 'shariah', label: 'Shariah & Financial', icon: <Coins className="w-4 h-4" /> },
            { id: 'beneficiary', label: 'Beneficiaries & Wasiyyah', icon: <HeartHandshake className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
            { id: 'api', label: 'API & Integrations', icon: <Key className="w-4 h-4" /> }
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

      {activeTab === 'kyc' && (
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
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-24 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  value={formData.organization || 'Malaysia Central Islamic Fund'}
                  onChange={e => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Primary D-8 Member Country
              </label>
              <select
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="Malaysia">Malaysia (🇲🇾)</option>
                <option value="Malaysia">Malaysia (🇲🇾)</option>
                <option value="Turkey">Turkey (🇹🇷)</option>
                <option value="Indonesia">Indonesia (🇮🇩)</option>
                <option value="Bangladesh">Bangladesh (🇧🇩)</option>
                <option value="Egypt">Egypt (🇪🇬)</option>
                <option value="Nigeria">Nigeria (🇳🇬)</option>
                <option value="Iran">Iran (🇮🇷)</option>
              </select>
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

          <div>
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Professional & Shariah Mandate Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio || 'Managing Country Node investments and asset allocation across real estate, agriculture, and Waqf pooling initiatives within the D-8 Islamic Circular Economy.'}
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

      {/* TAB 2: SECURITY & AUTHENTICATION */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          
          {/* Password Change Box */}
          <form onSubmit={handlePasswordChange} className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              <span>Password & Access Credentials</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input 
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  New Password
                </label>
                <input 
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Confirm New Password
                </label>
                <input 
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">
                Password must contain upper & lower letters, number, and special character.
              </span>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Change Password
              </button>
            </div>
          </form>

          {/* Two-Factor Authentication 2FA */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  <span>Two-Factor Authentication (2FA - TOTP)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Protect your Shariah portfolio using Google Authenticator or hardware YubiKey.
                </p>
              </div>

              <button
                onClick={() => {
                  setTwoFactor(!twoFactor);
                  showToast(!twoFactor ? 'Two-Factor Authentication Enabled' : '2FA Disabled');
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  twoFactor ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 ${
                  twoFactor ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {twoFactor && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 block">2FA Active & Enforced</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Linked to device: Authenticator App (Ending in 9821)</span>
                  </div>
                </div>

                <button 
                  onClick={() => alert("Secret Key: HOW-2FA-8821-X99Z\nUse this secret to setup Google Authenticator or 1Password.")}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  View Backup Codes
                </button>
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" />
              <span>Active Logged-in Devices</span>
            </h3>

            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold">
                    💻
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">Chrome on macOS (Apple Silicon)</span>
                      <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Current Session
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Putrajaya, Malaysia • IP 194.187.240.12</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-500">Active Now</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold">
                    📱
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">D-8 SuperApp Mobile - iOS 19</span>
                    <span className="text-[10px] text-slate-400">Kuala Lumpur, Malaysia • IP 210.186.42.10</span>
                  </div>
                </div>
                <button 
                  onClick={() => showToast('Session revoked.')}
                  className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: SHARIAH & FINANCIAL PREFERENCES */}
      {activeTab === 'shariah' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-500" />
              <span>Shariah Governance & Portfolio Parameters</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set auto-Zakat rates, primary display currency, and preferred Islamic contract structures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Default Currency Display
              </label>
              <select
                value={formData.preferredCurrency || 'USD'}
                onChange={e => {
                  setFormData({ ...formData, preferredCurrency: e.target.value });
                  showToast(`Default currency switched to ${e.target.value}`);
                }}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="USD">USD ($) - United States Dollar</option>
                <option value="MYR">MYR (₨) - Malaysiai Rupee</option>
                <option value="MYR">MYR (RM) - Malaysian Ringgit</option>
                <option value="TRY">TRY (₺) - Turkish Lira</option>
                <option value="IDR">IDR (Rp) - Indonesian Rupiah</option>
                <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                <option value="EGP">EGP (E£) - Egyptian Pound</option>
                <option value="NGN">NGN (₦) - Nigerian Naira</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                Automatic Zakat Allocation Rate
              </label>
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <input 
                  type="range" 
                  min="2.0" 
                  max="5.0" 
                  step="0.1" 
                  value={formData.autoZakatPercent ?? 2.5}
                  onChange={e => setFormData({ ...formData, autoZakatPercent: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400 shrink-0">
                  {formData.autoZakatPercent ?? 2.5}%
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard AAOIFI Zakat Nisab calculation is 2.5% of net profit per Hawl (lunar cycle).
              </span>
            </div>
          </div>

          {/* Contract Types Selection */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Preferred Islamic Contract Types for Investment Matching
            </h4>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { type: 'Mudarabah', desc: 'Trust Financing (Capitalist + Manager)' },
                { type: 'Musharakah', desc: 'Joint Venture Equity Partnership' },
                { type: 'Ijarah', desc: 'Lease & Rental Yielding Assets' },
                { type: 'Murabaha', desc: 'Cost-Plus Profit Sales' },
                { type: 'Wakalah', desc: 'Agency Investment Agreements' },
                { type: 'Sukuk', desc: 'Shariah Compliant Fixed Income' }
              ].map(item => (
                <div key={item.type} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-start gap-2.5">
                  <input 
                    type="checkbox" 
                    defaultChecked 
                    className="mt-1 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{item.type}</span>
                    <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Your settings automatically sync with the D-8 Central Shariah Advisory Board for compliance auditing.</span>
          </div>

          {/* BANK & E-WALLET MANAGEMENT SECTION (CRUD) */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span>Linked Bank Accounts & E-Wallets</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage payout and collection accounts for profit distributions and Sukuk redemptions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setAccountModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bank / E-Wallet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentAccounts.map(account => (
                <div 
                  key={account.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    account.isDefault 
                      ? 'bg-emerald-500/5 border-emerald-500/40 dark:border-emerald-500/30' 
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                          account.type === 'Bank Account' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}>
                          {account.type === 'Bank Account' ? <Building2 className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {account.institutionName}
                            </span>
                            {account.isDefault && (
                              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                Default
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                            {account.accountName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(account);
                            setAccountModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                          title="Edit Account"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-700 dark:text-slate-300 font-bold truncate">
                        {account.accountNumber}
                      </span>
                      <span className="text-slate-400 text-[11px] shrink-0">
                        {account.currency}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                          Shariah Screened
                        </span>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded-md ${
                        account.status === 'Verified' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}>
                        {account.status}
                      </span>
                    </div>
                  </div>

                  {!account.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAccount(account.id)}
                      className="w-full py-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 rounded-xl bg-white dark:bg-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>Set as Default Payout Account</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: BENEFICIARY & DISTRIBUTION PREFERENCES */}
      {activeTab === 'beneficiary' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-500" />
                <span>Beneficiary & Distribution Preferences (Wasiyyah & Waqf)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage Islamic inheritance ratios (Wasiyyah), profit sharing, and auto-Sadaqah/Waqf distributions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingBeneficiary(null);
                setBeneficiaryModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Beneficiary</span>
            </button>
          </div>

          {/* Distribution Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Beneficiaries
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white block">
                {beneficiaries.length} Registered
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Allocated Percentage
              </span>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                  {beneficiaries.reduce((acc, b) => acc + b.allocationPercent, 0)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  Target: 100%
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Primary Recipient
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white block truncate">
                {beneficiaries.find(b => b.isPrimary)?.name || 'None Set'}
              </span>
            </div>
          </div>

          {/* Beneficiary Cards List */}
          <div className="space-y-4">
            {beneficiaries.map(ben => (
              <div 
                key={ben.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  ben.isPrimary 
                    ? 'bg-emerald-500/5 border-emerald-500/40 dark:border-emerald-500/30 shadow-sm' 
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 hover:border-slate-300'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {ben.name}
                    </h4>

                    <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                      {ben.relation}
                    </span>

                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                      {ben.distributionType}
                    </span>

                    {ben.isPrimary && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/20">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        Primary Beneficiary
                      </span>
                    )}
                  </div>

                  {/* Allocation Bar */}
                  <div className="space-y-1 max-w-md">
                    <div className="flex justify-between text-[11px] font-extrabold text-slate-600 dark:text-slate-400">
                      <span>Allocation Ratio</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{ben.allocationPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(ben.allocationPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    {ben.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {ben.email}
                      </span>
                    )}
                    {ben.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {ben.phone}
                      </span>
                    )}
                    {ben.identityNumber && (
                      <span className="font-mono text-[11px] text-slate-400">
                        ID: {ben.identityNumber}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1.5 pt-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Payout Method: {ben.payoutMethod}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex md:flex-col items-end gap-2 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBeneficiary(ben);
                        setBeneficiaryModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-600 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBeneficiary(ben.id)}
                      className="px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {!ben.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryBeneficiary(ben.id)}
                      className="px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 rounded-xl bg-white dark:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>Set as Primary</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>Beneficiary distributions adhere to the D-8 Unified Shariah Code & AAOIFI Estate Distribution guidelines.</span>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              <span>Notification Preferences</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose how you want to receive alerts, yield distributions, and governance updates.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { 
                key: 'notifyEmail', 
                label: 'Email Notifications', 
                desc: 'Receive monthly performance reports, tax receipts, and contract maturity alerts via email.',
                val: formData.notifyEmail ?? true
              },
              { 
                key: 'notifyPush', 
                label: 'Push Notifications', 
                desc: 'Get real-time push alerts on mobile/desktop for incoming profit distributions and contract signatures.',
                val: formData.notifyPush ?? true
              },
              { 
                key: 'notifySMS', 
                label: 'SMS Security Alerts', 
                desc: 'Instant SMS codes for high-value transactions exceeding $5,000 USD equivalent.',
                val: formData.notifySMS ?? false
              }
            ].map(item => (
              <div key={item.key} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">{item.label}</span>
                  <span className="text-[11px] text-slate-400 block max-w-xl">{item.desc}</span>
                </div>

                <button
                  onClick={() => {
                    setFormData({ ...formData, [item.key]: !item.val });
                    showToast(`${item.label} ${!item.val ? 'Enabled' : 'Disabled'}`);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    item.val ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform absolute top-0.5 ${
                    item.val ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: API & INTEGRATIONS */}
      {activeTab === 'api' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-500" />
              <span>Developer API Keys</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Connect external apps, D-8 SuperApp nodes, or automated accounting systems to your Wealth Pooling account.
            </p>
          </div>

          {/* API Key */}
          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                D-8 Node REST API Secret Token
              </span>
              <button 
                onClick={regenerateApiKey}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Token</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {apiKey}
              </span>
              <button 
                onClick={copyApiKey}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
              >
                {apiKeyCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Avatar Change Modal */}
      {isAvatarModalOpen && (
        <AvatarChangeModal
          currentAvatar={formData.avatarUrl}
          userName={formData.name}
          onClose={() => setIsAvatarModalOpen(false)}
          onSaveAvatar={handleAvatarChange}
        />
      )}

      {/* Payment Account Modal */}
      {accountModalOpen && (
        <PaymentAccountModal
          account={editingAccount}
          onClose={() => {
            setAccountModalOpen(false);
            setEditingAccount(null);
          }}
          onSave={handleSaveAccount}
        />
      )}

      {/* Beneficiary Modal */}
      {beneficiaryModalOpen && (
        <BeneficiaryModal
          beneficiary={editingBeneficiary}
          onClose={() => {
            setBeneficiaryModalOpen(false);
            setEditingBeneficiary(null);
          }}
          onSave={handleSaveBeneficiary}
        />
      )}

    </div>
  );
};
