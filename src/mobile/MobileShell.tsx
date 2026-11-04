import React, { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { Bell, Building2, FolderKanban, HandCoins, HeartHandshake, Landmark, Home, Layers, Sparkles, UserRound, Users, Wallet } from 'lucide-react';
import { useRBAC } from '../rbac/RBACContext';
import { canInvest } from '../rbac/menuVisibility';
import { MobileHome } from './screens/MobileHome';
import { MobilePools } from './screens/MobilePools';
import { MobilePortfolio } from './screens/MobilePortfolio';
import { MobileProfile } from './screens/MobileProfile';
import { MobileKyc } from './screens/MobileKyc';
import { MobileUsers } from './screens/MobileUsers';
import { MobileBeneficiaries } from './screens/MobileBeneficiaries';
import { MobileNotifications } from './screens/MobileNotifications';
import { MobileStatements } from './screens/MobileStatements';
import { MobileZakat } from './screens/MobileZakat';
import { MobileLeasing } from './screens/MobileLeasing';
import { MobileAssets } from './screens/MobileAssets';
import { MobileProjectsAdmin } from './screens/MobileProjectsAdmin';
import { MobileSponsor } from './screens/MobileSponsor';
import { MobileAssistant } from './screens/MobileAssistant';
import { MobileSettlement } from './screens/MobileSettlement';
import { ASSET_OWNER_ROLES, ESTATE_ROLES, LEASING_ROLES, POOL_VIEW_ROLES, SETTLEMENT_ROLES, SPONSOR_ROLES, USER_ADMIN_ROLES } from './mobileRoles';
import { LanguageToggle, useT } from './i18n';

export type MobileTab = 'home' | 'beneficiaries' | 'pools' | 'portfolio' | 'projects' | 'assets' | 'leasing' | 'settlement' | 'users' | 'account';
type Overlay = 'kyc' | 'notifications' | 'statements' | 'zakat' | 'projects' | 'assistant';

const TABS: Array<{ id: MobileTab; label: string; icon: React.ReactNode; investorsOnly?: boolean; adminsOnly?: boolean; estateOnly?: boolean; leasingOnly?: boolean; settlementOnly?: boolean; assetOwnersOnly?: boolean; sponsorsOnly?: boolean; poolViewersOnly?: boolean }> = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  // Second, within thumb reach: estate instructions are part of what an investor keeps up to date.
  { id: 'beneficiaries', label: 'Beneficiaries', icon: <HeartHandshake className="w-5 h-5" />, estateOnly: true },
  { id: 'pools', label: 'Pools', icon: <Layers className="w-5 h-5" />, poolViewersOnly: true },
  { id: 'portfolio', label: 'Portfolio', icon: <Wallet className="w-5 h-5" />, investorsOnly: true },
  { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-5 h-5" />, sponsorsOnly: true },
  { id: 'assets', label: 'Assets', icon: <Landmark className="w-5 h-5" />, assetOwnersOnly: true },
  { id: 'leasing', label: 'Leasing', icon: <Building2 className="w-5 h-5" />, leasingOnly: true },
  { id: 'settlement', label: 'Payouts', icon: <HandCoins className="w-5 h-5" />, settlementOnly: true },
  { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" />, adminsOnly: true },
  { id: 'account', label: 'Profile', icon: <UserRound className="w-5 h-5" /> },
];

/** How often the bell asks for the unread count while the app is open. */
const UNREAD_POLL_MS = 60_000;

/** Phone layout: a slim header, one screen at a time, and the tabs at the bottom within thumb reach. */
export const MobileShell: React.FC = () => {
  const { activeUser, currentRole } = useRBAC();
  const { t, setLanguage } = useT();
  // The person's profile picture, shown in the header; Profile updates it when they change it.
  const [avatar, setAvatar] = useState('');
  useEffect(() => {
    apiClient.getCurrentUser().then((me) => {
      setAvatar(typeof me.profile?.avatarUrl === 'string' ? me.profile.avatarUrl : '');
      // The language saved with the account wins over this phone's, so it follows the person.
      const saved = (me.profile?.preferences as { language?: unknown } | undefined)?.language;
      if (saved === 'en' || saved === 'ms') setLanguage(saved);
    }).catch(() => setAvatar(''));
  }, [setLanguage]);
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(() => { apiClient.getUnreadNotificationCount().then(({ count }) => setUnread(count)).catch(() => undefined); }, []);
  useEffect(() => {
    refreshUnread();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') refreshUnread(); }, UNREAD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  const initials = activeUser.name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('');
  const [tab, setTab] = useState<MobileTab>('home');
  // KYC, notifications, statements and zakat open over the tabs; a tab press closes them.
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const overlayOpen = overlay !== null;
  const openKyc = () => setOverlay('kyc');
  const openTab = (next: MobileTab) => { setOverlay(null); setTab(next); };
  const tabs = TABS.filter(item => (!item.investorsOnly || canInvest(currentRole)) && (!item.adminsOnly || USER_ADMIN_ROLES.includes(currentRole)) && (!item.estateOnly || ESTATE_ROLES.includes(currentRole)) && (!item.leasingOnly || LEASING_ROLES.includes(currentRole)) && (!item.settlementOnly || SETTLEMENT_ROLES.includes(currentRole)) && (!item.assetOwnersOnly || ASSET_OWNER_ROLES.includes(currentRole)) && (!item.sponsorsOnly || SPONSOR_ROLES.includes(currentRole)) && (!item.poolViewersOnly || POOL_VIEW_ROLES.includes(currentRole)));

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <header className="sticky top-0 z-20 flex items-center gap-2.5 px-4 py-3 bg-emerald-950 text-white shadow">
        <img src="/wealth-pooling-logo.svg" alt="" className="w-8 h-8 rounded-full bg-white p-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight truncate">Wealth Pooling D-8</p>
          <p className="text-[11px] text-emerald-100/80 truncate">{activeUser.name}</p>
        </div>
        <LanguageToggle saveToAccount />
        <button type="button" onClick={() => setOverlay('assistant')} aria-label={t('Ask')} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-white/10">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </button>
        <button type="button" onClick={() => setOverlay('notifications')} aria-label={unread ? t('Notifications, {count} unread', { count: unread }) : t('Notifications')} className="relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-white/10">
          <Bell className="w-5 h-5" />
          {unread > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
        </button>
        <button type="button" onClick={() => openTab('account')} aria-label={t('My profile')} className="w-9 h-9 shrink-0 rounded-full overflow-hidden border-2 border-amber-300/70 bg-emerald-800 flex items-center justify-center text-[11px] font-black uppercase">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initials}
        </button>
      </header>

      <main className="flex-1 px-4 pt-4 pb-24">
        {overlay === 'kyc' && <MobileKyc onBack={() => openTab('home')} />}
        {overlay === 'notifications' && <MobileNotifications onBack={() => setOverlay(null)} onUnreadChange={setUnread} />}
        {overlay === 'statements' && <MobileStatements onBack={() => openTab('portfolio')} />}
        {overlay === 'zakat' && <MobileZakat onBack={() => openTab('portfolio')} />}
        {overlay === 'projects' && <MobileProjectsAdmin onBack={() => openTab('home')} />}
        {overlay === 'assistant' && <MobileAssistant onBack={() => setOverlay(null)} />}
        {!overlayOpen && tab === 'home' && <MobileHome onOpen={openTab} onOpenKyc={openKyc} onOpenProjects={() => setOverlay('projects')} />}
        {!overlayOpen && tab === 'beneficiaries' && <MobileBeneficiaries />}
        {!overlayOpen && tab === 'pools' && <MobilePools onOpenPortfolio={() => openTab('portfolio')} onOpenKyc={openKyc} />}
        {!overlayOpen && tab === 'portfolio' && <MobilePortfolio onOpenStatements={() => setOverlay('statements')} onOpenZakat={() => setOverlay('zakat')} />}
        {!overlayOpen && tab === 'projects' && <MobileSponsor />}
        {!overlayOpen && tab === 'assets' && <MobileAssets />}
        {!overlayOpen && tab === 'leasing' && <MobileLeasing />}
        {!overlayOpen && tab === 'settlement' && <MobileSettlement />}
        {!overlayOpen && tab === 'users' && <MobileUsers />}
        {!overlayOpen && tab === 'account' && <MobileProfile onOpenKyc={openKyc} onAvatarChange={setAvatar} />}
      </main>

      <nav aria-label={t('Main')} className="fixed bottom-0 inset-x-0 z-20 grid border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => openTab(item.id)}
            aria-current={!overlayOpen && tab === item.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 px-0.5 py-2.5 text-center text-[11px] leading-tight font-bold ${!overlayOpen && tab === item.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}
          >
            {item.icon}
            {t(item.label)}
          </button>
        ))}
      </nav>
    </div>
  );
};
