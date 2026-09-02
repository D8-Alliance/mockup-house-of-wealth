import React, { useState } from 'react';
import { 
  TrendingUp, 
  WalletCards, 
  HeartHandshake, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  School, 
  HeartPulse, 
  Droplets, 
  ExternalLink,
  PlusCircle,
  Sparkles,
  ChevronRight,
  Sun,
  Activity,
  CheckCircle2,
  PieChart,
  Layers,
  FileCheck
} from 'lucide-react';
import { AssetItem, ContractItem, LanguageCode, UserProfile, NavTab } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface DashboardViewProps {
  user: UserProfile;
  assets: AssetItem[];
  contracts: ContractItem[];
  lang: LanguageCode;
  setTab: (tab: NavTab) => void;
  onOpenAssetRegister: () => void;
  onOpenContractWizard: () => void;
  onOpenPdpRegister?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  assets,
  contracts,
  lang,
  setTab,
  onOpenAssetRegister,
  onOpenContractWizard,
  onOpenPdpRegister
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.welcomeBack}
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Account</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.overviewDesc}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenPdpRegister && (
            <button
              onClick={onOpenPdpRegister}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Register as PDP</span>
            </button>
          )}
          <button
            onClick={onOpenAssetRegister}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.registerNewAsset}</span>
          </button>
          <button
            onClick={() => setTab('marketplace')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>{t.exploreMarketplace}</span>
          </button>
        </div>
      </div>

      {/* PDP Onboarding Opportunity Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 rounded-3xl p-6 border border-purple-800/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                SOVEREIGN ASSET ORIGINATORS
              </span>
              <span className="text-xs text-purple-300 font-mono">D-8 Wealth Pooling Platform</span>
            </div>
            <h3 className="text-lg font-black text-white mt-0.5">
              Become a Pool / Product / Project Data Provider (PDP)
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Complete corporate KYB accreditation to tokenize institutional infrastructure, originate real-world projects, and issue Shariah wealth pools across D-8 member nations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenPdpRegister}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-black text-xs text-white shadow-md cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>Start PDP Registration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setTab('sponsor-portal')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-300 border border-slate-700 cursor-pointer transition-all"
          >
            Open Sponsor Hub
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Asset Value */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.totalAssetValue}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight relative z-10">
            $124,500
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs relative z-10">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">+5.2%</span>
            <span className="text-slate-400">vs last month</span>
          </div>
        </div>

        {/* YTD Profit */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.ytdProfit}</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <WalletCards className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight relative z-10">
            $12,400
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-xs relative z-10">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">+1.2%</span>
            <span className="text-slate-400">returns on investment</span>
          </div>
        </div>

        {/* Zakat Due */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors" />
          <div className="flex justify-between items-start mb-3 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.zakatDue}</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight relative z-10">
            $3,112.50
          </div>
          <div className="flex items-center justify-between mt-3 relative z-10">
            <span className="text-slate-400 text-xs">2.5% Auto-calculated</span>
            <button 
              onClick={() => alert("Redirecting to Zakat distribution gateway...")}
              className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-800 px-3 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{t.payNow}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Total Assets Pooled */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-6 rounded-2xl shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-15">
            <PieChart className="w-32 h-32" />
          </div>
          <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{t.totalAssetsPooled}</span>
          <div className="text-3xl font-black mt-2 mb-3">$45.2 Million</div>
          <div className="space-y-1.5 text-xs text-emerald-100">
            <div className="flex justify-between">
              <span>Public Agencies</span>
              <span className="font-bold">60%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5">
              <div className="bg-white h-1.5 rounded-full w-3/5" />
            </div>
          </div>
        </div>

      </div>

      {/* Main Grid: Circular Impact & Active Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Circular Wealth Impact */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Circular Wealth Visualization */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500" />
                  <span>{t.circularImpact}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualizing your contribution to the D-8 circular economy
                </p>
              </div>
              <button 
                onClick={() => setTab('pooling')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View Full Graph</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Circular Network Stage */}
            <div className="relative h-64 w-full rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800">
              <div className="absolute inset-0 flex items-center justify-center">
                
                {/* Center Hub */}
                <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center z-10 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white font-bold text-xs flex-col">
                    <Building2 className="w-6 h-6" />
                    <span className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">HoW Pool</span>
                  </div>
                </div>

                {/* Rotating Orbit Rings */}
                <div className="absolute w-48 h-48 border border-dashed border-emerald-500/30 rounded-full animate-spin [animation-duration:15s]" />
                <div className="absolute w-72 h-72 border border-slate-200 dark:border-slate-700/60 rounded-full" />

                {/* Satellite Nodes */}
                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-12 h-12 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-emerald-500 z-10" title="Education & Waqf">
                  <School className="w-5 h-5" />
                </div>
                <div className="absolute top-1/4 right-1/3 w-10 h-10 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-amber-500 z-10" title="Healthcare & Zakat">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div className="absolute bottom-1/4 right-1/4 w-14 h-14 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-blue-500 z-10" title="Clean Water & Infrastructure">
                  <Droplets className="w-6 h-6" />
                </div>
              </div>

              {/* Impact Badge */}
              <div className="absolute bottom-4 left-4 z-20">
                <button 
                  onClick={() => setTab('pooling')}
                  className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white shadow-sm hover:border-emerald-500 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Wealth Flow Active</span>
                </button>
              </div>

              <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs text-slate-500 border border-slate-200/50 dark:border-slate-800">
                Impact Score: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">850 (High)</span>
              </div>
            </div>
          </div>

          {/* Active Contracts Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t.activeContracts}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Shariah-compliant Mudarabah, Musharakah, and Wakalah agreements
                </p>
              </div>
              <button 
                onClick={() => setTab('contracts')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>See All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Asset / Project</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Maturity</th>
                    <th className="px-6 py-3.5 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {contracts.map(contract => (
                    <tr 
                      key={contract.id}
                      onClick={onOpenContractWizard}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div>{contract.title}</div>
                          <span className="text-[10px] font-mono text-slate-400">{contract.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">{contract.type}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500">{contract.maturityDate}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                        {contract.valueDisplay}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Assets & Activity */}
        <div className="space-y-8">
          
          {/* Registered Assets Summary */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.myAssets}
              </h3>
              <button 
                onClick={() => setTab('assets')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              {assets.slice(0, 3).map(asset => (
                <div 
                  key={asset.id}
                  onClick={() => setTab('assets')}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 hover:border-emerald-500/50 transition-all bg-slate-50/60 dark:bg-slate-900/40 cursor-pointer"
                >
                  <img 
                    src={asset.imageUrl} 
                    alt={asset.name} 
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {asset.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {asset.type} • {asset.status}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      {asset.valueDisplay}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onOpenAssetRegister}
              className="w-full mt-4 py-2.5 text-xs text-slate-600 dark:text-slate-300 font-bold border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              + {t.registerNewAsset}
            </button>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t.activityFeed}
            </h3>
            <div className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-5 text-xs">
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-800" />
                <p className="text-[10px] text-slate-400 mb-0.5">Today, 10:23 AM</p>
                <p className="text-slate-900 dark:text-white font-semibold">
                  Profit distributed for <span className="text-emerald-600 dark:text-emerald-400">Istanbul Real Estate</span>
                </p>
                <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">+$450.00 added to e-wallet</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-800" />
                <p className="text-[10px] text-slate-400 mb-0.5">Yesterday, 4:00 PM</p>
                <p className="text-slate-900 dark:text-white">
                  New contract signed: <span className="font-semibold">Solar Grid Sukuk</span>
                </p>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-400 ring-4 ring-white dark:ring-slate-800" />
                <p className="text-[10px] text-slate-400 mb-0.5">Aug 01, 2026</p>
                <p className="text-slate-900 dark:text-white">
                  Zakat calculation updated for 2026 lunar cycle
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
