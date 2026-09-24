import React, { useState } from 'react';
import { WealthPoolingLogo } from './WealthPoolingLogo';
import { 
  Building2, 
  LayoutDashboard, 
  Landmark, 
  FileText, 
  Compass, 
  PiggyBank, 
  Wallet, 
  Bell, 
  Sun, 
  Moon, 
  CheckCircle2, 
  ChevronDown,
  Menu,
  X,
  Code2,
  User,
  TrendingUp,
  Coins,
  Users,
  FolderKanban,
  FileCheck,
  Sparkles,
  Shield,
  Briefcase,
  CreditCard,
  Receipt
} from 'lucide-react';
import { NavTab, LanguageCode, UserProfile } from '../types';
import { LANGUAGES, TRANSLATIONS } from '../data/translations';
import { useRBAC } from '../rbac/RBACContext';
import { LogIn, LogOut } from 'lucide-react';
import { NavLinks } from './navbar/NavLinks';

interface NavbarProps {
  currentTab: NavTab;
  setTab: (tab: NavTab) => void;
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  user: UserProfile;
  onOpenCodeReview: () => void;
  onOpenPdpRegister: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  lang,
  setLang,
  darkMode,
  setDarkMode,
  user,
  onOpenCodeReview,
  onOpenPdpRegister
}) => {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { canAccessTab, currentRole, roleDef, logoutUser, setShowLoginModal, isAuthenticated } = useRBAC();

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const currentLangObj = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  const allNavItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.dashboard || 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'sponsor-portal', label: 'Sponsor Portal', icon: <Briefcase className="w-4 h-4 text-amber-500" /> },
    { id: 'ai-engine', label: 'AI Wealth Engine', icon: <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" /> },
    { id: 'admin-center', label: 'Admin Center', icon: <Shield className="w-4 h-4 text-purple-500" /> },
    { id: 'marketplace', label: t.marketplace || 'Marketplace', icon: <Compass className="w-4 h-4" /> },
    { id: 'pooling', label: t.pooling || 'Pooling', icon: <PiggyBank className="w-4 h-4" /> },
    { id: 'investments', label: t.investments || 'Investments', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'assets', label: t.myAssets || 'Assets', icon: <Landmark className="w-4 h-4" /> },
    { id: 'contracts', label: t.myContracts || 'Contracts', icon: <FileText className="w-4 h-4" /> },
    { id: 'wallet', label: t.wallet || 'Wallet', icon: <Wallet className="w-4 h-4" /> },
    { id: 'financials', label: t.financials || 'Financials', icon: <Coins className="w-4 h-4" /> },
    { id: 'beneficiaries', label: t.beneficiaries || 'Beneficiaries', icon: <Users className="w-4 h-4" /> },
    { id: 'documents', label: t.documents || 'Documents', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'ledger', label: t.ledger || 'Audit Trail', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'membership', label: 'Membership & Pricing', icon: <CreditCard className="w-4 h-4 text-emerald-500" /> },
    { id: 'billing-transactions', label: 'Billing & Transactions', icon: <Receipt className="w-4 h-4 text-blue-500" /> },
    { id: 'profile', label: t.profile || 'Profile', icon: <User className="w-4 h-4" /> }
  ];

  const navItems = allNavItems.filter(item => canAccessTab(item.id));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setTab('dashboard')}>
            <WealthPoolingLogo compact />
          </div>

          {/* Desktop Navigation Links */}
          <NavLinks navItems={navItems} currentTab={currentTab} setTab={setTab} />

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            
            {/* PDP Register Quick Button */}
            <button
              onClick={onOpenPdpRegister}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-500/20 transition-all cursor-pointer shrink-0"
              title="Register as a Pool / Product / Project Delivery Partner (PDP)"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">PDP Onboarding</span>
            </button>

            {/* Code Review Button */}
            <button
              onClick={onOpenCodeReview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer shrink-0"
              title="Open Architecture & Code Review Report"
            >
              <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">{t.codeReview}</span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <span className="text-base">{currentLangObj.flag}</span>
                <span className="uppercase">{currentLangObj.code}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fadeIn">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700 mb-1">
                      D-8 Languages
                    </div>
                    {LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        onClick={() => {
                          setLang(l.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                          lang === l.code
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{l.flag}</span>
                          <span>{l.nativeName}</span>
                        </span>
                        {lang === l.code && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </button>

              {notificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-50 animate-fadeIn">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                        3 New
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">Profit Distributed</p>
                        <p className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-0.5">+$450.00 added from Istanbul Real Estate Fund</p>
                        <span className="text-[10px] text-slate-400">10:23 AM</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar & Account Menu */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-80 transition-opacity"
                title="Account & Role Menu"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className={`w-8 h-8 rounded-full border-2 object-cover ${
                    currentTab === 'profile' ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-emerald-500/30'
                  }`}
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 space-y-1">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white leading-tight">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded border font-bold mt-1 ${roleDef.badgeColor}`}>
                        {currentRole}
                      </span>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          setTab('membership');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4 text-emerald-500" />
                        <span>Membership & AI Credits</span>
                      </button>

                      <button
                        onClick={() => {
                          setTab('profile');
                          setUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>Account Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowLoginModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4 text-blue-500" />
                        <span>Switch Persona / Login Gateway</span>
                      </button>

                      {isAuthenticated && (
                        <button
                          onClick={() => {
                            logoutUser();
                            setUserMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-700/60 mt-1"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out Session</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 py-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                  currentTab === item.id
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};
