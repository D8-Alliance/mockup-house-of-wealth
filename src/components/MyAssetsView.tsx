import React, { useState } from 'react';
import { 
  Search, 
  PlusCircle, 
  CheckCircle2, 
  Lock, 
  MapPin, 
  MoreVertical, 
  TrendingUp, 
  ShieldCheck, 
  SlidersHorizontal,
  TableProperties,
  LayoutGrid,
  FileCheck,
  Building2,
  X
} from 'lucide-react';
import { AssetItem, LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface MyAssetsViewProps {
  assets: AssetItem[];
  lang: LanguageCode;
  onOpenAssetRegister: () => void;
}

export const MyAssetsView: React.FC<MyAssetsViewProps> = ({
  assets,
  lang,
  onOpenAssetRegister
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [searchTerm, setSearchType] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          asset.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'All' || asset.type === selectedType;
    const matchesStatus = selectedStatus === 'All' || asset.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header & CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.myAssets}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your registered digital and physical assets, monitor valuations, and verify Shariah status.
          </p>
        </div>

        <button
          onClick={onOpenAssetRegister}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.registerNewAsset}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Asset Value</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$1,082,450</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              +4.8%
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active Contracts</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">12 Agreements</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              100% Compliant
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm relative overflow-hidden">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Zakat Obligation</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">$27,061</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
              Due in 20 days
            </span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
        
        {/* Search Input */}
        <div className="relative w-full xl:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchType(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Types</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Commodities">Commodities</option>
            <option value="Financial Inst.">Financial Inst.</option>
            <option value="Private Equity">Private Equity</option>
          </select>

          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Locked">Locked</option>
          </select>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              <TableProperties className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* View Mode: Table */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200/60 dark:border-slate-700/60">
                <tr>
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Type & ID</th>
                  <th className="px-6 py-4 text-right">Valuation</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Shariah Compliance</th>
                  <th className="px-6 py-4 text-center">Usability</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredAssets.map(asset => (
                  <tr 
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img 
                          src={asset.imageUrl} 
                          alt={asset.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{asset.name}</div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            <span>{asset.location}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{asset.type}</div>
                      <div className="text-xs font-mono text-slate-400">{asset.id}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="font-extrabold text-slate-900 dark:text-white">{asset.valueDisplay}</div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{asset.ytdReturn}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        asset.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : asset.status === 'Pending'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {asset.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>{asset.shariahStatus}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mx-auto mb-1">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full" 
                          style={{ width: `${asset.collateralPercent}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{asset.collateralPercent}% Collateralized</span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-slate-400 hover:text-emerald-500 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode: Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              onClick={() => setSelectedAsset(asset)}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="relative h-44 overflow-hidden">
                <img 
                  src={asset.imageUrl} 
                  alt={asset.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 border border-white/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{asset.type}</span>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{asset.name}</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">{asset.id}</span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Value</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{asset.valueDisplay}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{asset.ytdReturn}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Drawer / Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-14 h-14 rounded-2xl object-cover" />
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{selectedAsset.type}</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedAsset.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedAsset.id}</p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedAsset(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              {selectedAsset.description}
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Valuation</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{selectedAsset.valueDisplay}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Location</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAsset.location}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Custodian</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedAsset.custodian || 'House of Wealth Vault'}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Shariah Governance</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> AAOIFI Certified
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setSelectedAsset(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  alert(`Initiating contract creation for ${selectedAsset.name}`);
                  setSelectedAsset(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20"
              >
                Create Smart Contract
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
