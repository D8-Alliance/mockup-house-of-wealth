import React, { useState } from 'react';
import { Check, X, Sparkles, Filter, ShieldCheck, Zap } from 'lucide-react';
import { MembershipTier, BillingInterval } from '../../revenue/revenueTypes';
import { COMPREHENSIVE_FEATURE_MATRIX } from '../../revenue/featureMatrixConfig';

interface FeatureMatrixTableProps {
  currentTier: MembershipTier;
  onSelectPlan: (tier: MembershipTier) => void;
}

export const FeatureMatrixTable: React.FC<FeatureMatrixTableProps> = ({
  currentTier,
  onSelectPlan
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['all', 'Core Access', 'AI Intelligence', 'Risk & Due Diligence', 'Ecosystem & Governance'];

  const filteredFeatures = COMPREHENSIVE_FEATURE_MATRIX.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderValue = (val: string | boolean, isHighlighted: boolean = false) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="w-4 h-4" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
          <X className="w-4 h-4" />
        </span>
      );
    }
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
        isHighlighted 
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20' 
          : 'text-slate-700 dark:text-slate-300'
      }`}>
        {val}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Category filter & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap capitalize ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              {cat === 'all' ? 'All 16 Features' : cat}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-56 px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
          />
        </div>
      </div>

      {/* Feature Matrix Table */}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
              <th className="p-4 sm:p-5 font-black text-slate-900 dark:text-white w-2/5 min-w-[220px]">
                Platform Capabilities & Features
              </th>
              
              {/* Free Column */}
              <th className={`p-4 font-black text-center min-w-[130px] ${currentTier === 'FREE' ? 'bg-slate-100/80 dark:bg-slate-800' : ''}`}>
                <div className="space-y-1">
                  <div className="text-slate-900 dark:text-white font-bold text-sm">Free</div>
                  <div className="text-[11px] text-slate-500 font-normal">RM0</div>
                  {currentTier === 'FREE' && (
                    <span className="inline-block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </div>
              </th>

              {/* Plus Column */}
              <th className={`p-4 font-black text-center min-w-[140px] ${currentTier === 'PLUS' ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                <div className="space-y-1">
                  <div className="text-slate-900 dark:text-white font-bold text-sm flex items-center justify-center gap-1">
                    <span>Plus</span>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">RM39/mo</div>
                  {currentTier === 'PLUS' ? (
                    <span className="inline-block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  ) : (
                    <button 
                      onClick={() => onSelectPlan('PLUS')}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                    >
                      Select Plan
                    </button>
                  )}
                </div>
              </th>

              {/* Professional Column */}
              <th className={`p-4 font-black text-center min-w-[140px] ${currentTier === 'PROFESSIONAL' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                <div className="space-y-1">
                  <div className="text-slate-900 dark:text-white font-bold text-sm">Professional</div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">RM149/mo</div>
                  {currentTier === 'PROFESSIONAL' ? (
                    <span className="inline-block text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  ) : (
                    <button 
                      onClick={() => onSelectPlan('PROFESSIONAL')}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 underline cursor-pointer"
                    >
                      Select Plan
                    </button>
                  )}
                </div>
              </th>

              {/* Enterprise Column */}
              <th className={`p-4 font-black text-center min-w-[140px] ${currentTier === 'ENTERPRISE' ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}>
                <div className="space-y-1">
                  <div className="text-slate-900 dark:text-white font-bold text-sm">Enterprise</div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">Custom</div>
                  {currentTier === 'ENTERPRISE' ? (
                    <span className="inline-block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  ) : (
                    <button 
                      onClick={() => onSelectPlan('ENTERPRISE')}
                      className="text-[10px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 underline cursor-pointer"
                    >
                      Bespoke Setup
                    </button>
                  )}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFeatures.map((item, idx) => (
              <tr 
                key={item.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                <td className="p-4 sm:p-5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
                      {item.description}
                    </p>
                  </div>
                </td>

                <td className={`p-4 text-center ${currentTier === 'FREE' ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                  {renderValue(item.free)}
                </td>

                <td className={`p-4 text-center ${currentTier === 'PLUS' ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                  {renderValue(item.plus, true)}
                </td>

                <td className={`p-4 text-center ${currentTier === 'PROFESSIONAL' ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                  {renderValue(item.professional, true)}
                </td>

                <td className={`p-4 text-center ${currentTier === 'ENTERPRISE' ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''}`}>
                  {renderValue(item.enterprise, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
