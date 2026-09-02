import React, { useState } from 'react';
import { Sliders, Edit3, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { PromotionPackage } from '../../revenue/marketplaceMonetisationTypes';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';

interface AdminPromotionPackagesEditorProps {
  packages: PromotionPackage[];
}

export const AdminPromotionPackagesEditor: React.FC<AdminPromotionPackagesEditorProps> = ({ packages }) => {
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [editPriceMYR, setEditPriceMYR] = useState<number>(0);
  const [editPriceUSD, setEditPriceUSD] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editCredits, setEditCredits] = useState<number>(0);

  const handleStartEditPackage = (pkg: PromotionPackage) => {
    setEditingPkgId(pkg.id);
    setEditPriceMYR(pkg.priceMYR);
    setEditPriceUSD(pkg.priceUSD);
    setEditDuration(pkg.durationDays);
    setEditCredits(pkg.creditsCost);
  };

  const handleSavePackage = (pkgId: string) => {
    marketplaceMonetisationService.updatePackagePricing(
      pkgId,
      editPriceMYR,
      editPriceUSD,
      editDuration,
      editCredits
    );
    setEditingPkgId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          Configurable Promotion Packages & Indicative Pricing
        </h3>
        <span className="text-xs text-slate-400">Instant runtime price synchronization</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map(pkg => {
          const isEditing = editingPkgId === pkg.id;
          return (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-black text-sm text-slate-900 dark:text-white">
                    {pkg.title}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500 text-slate-950">
                    {pkg.badgeType}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {pkg.placement}
                </p>

                {isEditing ? (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block">Price (MYR):</label>
                      <input
                        type="number"
                        value={editPriceMYR}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditPriceMYR(val);
                          setEditPriceUSD(Math.round(val / 4.2));
                        }}
                        className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">Duration (Days):</label>
                        <input
                          type="number"
                          value={editDuration}
                          onChange={e => setEditDuration(parseInt(e.target.value) || 0)}
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block">Credits Cost:</label>
                        <input
                          type="number"
                          value={editCredits}
                          onChange={e => setEditCredits(parseInt(e.target.value) || 0)}
                          className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 font-mono font-bold bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current Rate</span>
                      <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                        {pkg.priceMYR === 0 ? 'Free (RM0)' : `RM ${pkg.priceMYR}`}
                      </span>
                      <span className="text-[10px] text-slate-400 block">(${pkg.priceUSD} USD)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Duration</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {pkg.durationDays > 0 ? `${pkg.durationDays} Days` : 'Continuous'}
                      </span>
                      {pkg.creditsCost > 0 && (
                        <span className="text-[10px] text-slate-400 block">{pkg.creditsCost} Credits</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                {isEditing ? (
                  <button
                    onClick={() => handleSavePackage(pkg.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Pricing
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartEditPackage(pkg)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Rate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
