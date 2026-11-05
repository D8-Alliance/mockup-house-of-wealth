import React, { useState } from 'react';
import { NavTab } from '../../types';
import { ChevronDown, MoreHorizontal, Check } from 'lucide-react';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
}

interface NavLinksProps {
  navItems: NavItem[];
  currentTab: NavTab;
  setTab: (tab: NavTab) => void;
}

const PRIMARY_TAB_IDS: NavTab[] = [
  'dashboard',
  'investments',
  'marketplace',
  'pooling',
  'sponsor-portal',
  'ai-engine',
  'admin-center'
];

export const NavLinks: React.FC<NavLinksProps> = ({ navItems, currentTab, setTab }) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const primaryItems = navItems.filter(item => PRIMARY_TAB_IDS.includes(item.id));
  const secondaryItems = navItems.filter(item => !PRIMARY_TAB_IDS.includes(item.id));

  const activeSecondaryItem = secondaryItems.find(item => item.id === currentTab);
  // The bar must leave room for the language, bell and account controls on the right, so narrower windows
  // show fewer tabs and the rest move into More: 3 tabs from 1024px, 4 from 1280px, all from 1536px.
  const tabVisibility = (index: number) => (index < 3 ? 'flex' : index < 4 ? 'hidden xl:flex' : 'hidden 2xl:flex');
  const moreVisibility = (index: number) => (index < 4 ? 'xl:hidden' : '2xl:hidden');
  const overflowItems = primaryItems.slice(3);
  const moreContainerVisibility = secondaryItems.length > 0 || overflowItems.length === 0 ? '' : primaryItems.length > 4 ? '2xl:hidden' : 'xl:hidden';

  return (
    <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/50 shrink-0">
      {primaryItems.map((item, index) => {
        const active = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setMoreMenuOpen(false);
            }}
            className={`${tabVisibility(index)} items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              active
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-600/50'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}

      {(secondaryItems.length > 0 || overflowItems.length > 0) && (
        <div className={`relative ${moreContainerVisibility}`}>
          <button
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeSecondaryItem
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-600/50'
                : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {activeSecondaryItem ? (
              <>
                {activeSecondaryItem.icon}
                <span>{activeSecondaryItem.label}</span>
              </>
            ) : (
              <>
                <MoreHorizontal className="w-4 h-4" />
                <span>More</span>
              </>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {moreMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMoreMenuOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                  Additional Modules
                </div>
                <div className="max-h-72 overflow-y-auto space-y-0.5 px-1">
                  {/* Tabs the bar has no room for at this window width. */}
                  {overflowItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setTab(item.id);
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full flex ${moreVisibility(index + 3)} items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                        currentTab === item.id ? 'bg-emerald-500/10 text-emerald-600 font-bold' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {currentTab === item.id && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                    </button>
                  ))}
                  {secondaryItems.map(item => {
                    const active = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setTab(item.id);
                          setMoreMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                        {active && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
