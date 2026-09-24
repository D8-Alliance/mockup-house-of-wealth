import React from 'react';
import { NavTab } from '../types';
import { WealthPoolingLogo } from './WealthPoolingLogo';

interface FooterProps {
  setTab: (tab: NavTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ setTab }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-1">
          <WealthPoolingLogo compact />
          <span className="text-xs text-slate-500 dark:text-slate-400">Wealth Pooling © 2026</span>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Part of the D-8 Masjid SuperApp Ecosystem. Certified AAOIFI Shariah Compliant.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-400">
          <button 
            onClick={() => setTab('pooling')} 
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Shariah Governance
          </button>
          <button 
            onClick={() => setTab('marketplace')} 
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Marketplace
          </button>
          <button 
            onClick={() => alert("Terms & Conditions - Wealth Pooling Platform")}
            className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
        </div>
      </div>
    </footer>
  );
};
