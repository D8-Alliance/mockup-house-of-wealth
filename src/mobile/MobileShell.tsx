import React, { useState } from 'react';
import { Home, Layers, UserRound, Users, Wallet } from 'lucide-react';
import { useRBAC } from '../rbac/RBACContext';
import { canInvest } from '../rbac/menuVisibility';
import { MobileHome } from './screens/MobileHome';
import { MobilePools } from './screens/MobilePools';
import { MobilePortfolio } from './screens/MobilePortfolio';
import { MobileAccount } from './screens/MobileAccount';
import { MobileKyc } from './screens/MobileKyc';
import { MobileUsers } from './screens/MobileUsers';
import { USER_ADMIN_ROLES } from './mobileRoles';

export type MobileTab = 'home' | 'pools' | 'portfolio' | 'users' | 'account';

const TABS: Array<{ id: MobileTab; label: string; icon: React.ReactNode; investorsOnly?: boolean; adminsOnly?: boolean }> = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'pools', label: 'Pools', icon: <Layers className="w-5 h-5" /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Wallet className="w-5 h-5" />, investorsOnly: true },
  { id: 'users', label: 'Users', icon: <Users className="w-5 h-5" />, adminsOnly: true },
  { id: 'account', label: 'Account', icon: <UserRound className="w-5 h-5" /> },
];

/** Phone layout: a slim header, one screen at a time, and the tabs at the bottom within thumb reach. */
export const MobileShell: React.FC = () => {
  const { activeUser, currentRole } = useRBAC();
  const [tab, setTab] = useState<MobileTab>('home');
  // KYC opens over the tabs and returns to Home when done.
  const [kycOpen, setKycOpen] = useState(false);
  const openTab = (next: MobileTab) => { setKycOpen(false); setTab(next); };
  const tabs = TABS.filter(item => (!item.investorsOnly || canInvest(currentRole)) && (!item.adminsOnly || USER_ADMIN_ROLES.includes(currentRole)));

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-emerald-950 text-white shadow">
        <img src="/wealth-pooling-logo.svg" alt="" className="w-8 h-8 rounded-full bg-white p-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight">Wealth Pooling D-8</p>
          <p className="text-[11px] text-emerald-100/80 truncate">{activeUser.name}</p>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-24">
        {kycOpen && <MobileKyc onBack={() => openTab('home')} />}
        {!kycOpen && tab === 'home' && <MobileHome onOpen={openTab} onOpenKyc={() => setKycOpen(true)} />}
        {!kycOpen && tab === 'pools' && <MobilePools onOpenPortfolio={() => openTab('portfolio')} onOpenKyc={() => setKycOpen(true)} />}
        {!kycOpen && tab === 'portfolio' && <MobilePortfolio />}
        {!kycOpen && tab === 'users' && <MobileUsers />}
        {!kycOpen && tab === 'account' && <MobileAccount />}
      </main>

      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-20 grid border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur pb-[env(safe-area-inset-bottom)]" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => openTab(item.id)}
            aria-current={!kycOpen && tab === item.id ? 'page' : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${!kycOpen && tab === item.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
