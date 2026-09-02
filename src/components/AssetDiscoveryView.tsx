import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  ArrowRight, 
  SlidersHorizontal,
  Sparkles,
  Building2,
  X
} from 'lucide-react';
import { MarketplaceItem, LanguageCode } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { SponsoredMarketplaceBanner } from './revenue/SponsoredMarketplaceBanner';

interface AssetDiscoveryViewProps {
  items: MarketplaceItem[];
  lang: LanguageCode;
  onSelectInvestment: (item: MarketplaceItem) => void;
}

export const AssetDiscoveryView: React.FC<AssetDiscoveryViewProps> = ({
  items,
  lang,
  onSelectInvestment
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  const categories = [
    'All',
    'Property',
    'SME',
    'Agriculture',
    'Startup',
    'Sukuk',
    'Waqf',
    'Gold',
    'Tokenized Assets'
  ];

  const filtered = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category.toLowerCase().includes(selectedCategory.toLowerCase()) || item.title.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesRisk = selectedRisk === 'All' || item.riskLevel === selectedRisk;
    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.marketplace}
            </h1>
            <span className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
              D-8 Circular Opportunities
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Discover and invest in high-yield, Shariah-certified assets across Malaysia, Indonesia, Turkey, Egypt, Nigeria, and Bangladesh.
          </p>
        </div>
      </div>

      {/* Sponsored Marketplace Hero Placement */}
      <SponsoredMarketplaceBanner />

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search assets by country, category, or title..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400">Risk Profile:</span>
            <select
              value={selectedRisk}
              onChange={e => setSelectedRisk(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 py-2 px-3 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="All">All Risk Levels</option>
              <option value="Low Risk">Low Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="High Risk">High Risk</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-700/60">
          <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Asset Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div 
            key={item.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            {/* Image Banner */}
            <div className="relative h-48 overflow-hidden bg-slate-200">
              <img 
                src={item.imageUrl} 
                alt={item.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 border border-white/20 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Shariah Certified</span>
              </div>
              
              {/* Featured / Promoted Badge */}
              {(item.id === 'MKT-01' || item.id === 'MKT-03') && (
                <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-black text-white flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" />
                  <span>FEATURED</span>
                </div>
              )}

              <div className="absolute bottom-3 left-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600/90 backdrop-blur-md text-[10px] font-extrabold text-white uppercase tracking-wider">
                  {item.category}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{item.location}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block">Target Yield</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{item.targetYield} <span className="text-[10px] text-slate-400 font-normal">p.a.</span></span>
                </div>
                <div>
                  <span className="text-slate-400 block">Min. Investment</span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">{item.minInvestmentDisplay}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Funding Progress</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{item.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${item.progressPercent}%` }} />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  {item.riskLevel}
                </span>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectInvestment(item);
                  }}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Invest Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* Asset Modal Detail */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={selectedItem.imageUrl} alt={selectedItem.title} className="w-16 h-16 rounded-2xl object-cover" />
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{selectedItem.category}</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedItem.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" /> {selectedItem.location}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60">
              {selectedItem.description}
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Expected Yield</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{selectedItem.targetYield}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Min Investment</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedItem.minInvestmentDisplay}</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Target Funding</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedItem.targetAmountDisplay}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  onSelectInvestment(selectedItem);
                  setSelectedItem(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20"
              >
                Initiate Mudarabah Contract
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
