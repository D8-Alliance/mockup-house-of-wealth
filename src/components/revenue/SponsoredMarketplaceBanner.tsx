import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Building2, Megaphone, Info } from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { SponsoredMarketplaceBanner as BannerType } from '../../revenue/marketplaceMonetisationTypes';
import { PROMOTION_DISCLAIMER_TEXT } from '../../revenue/marketplaceMonetisationConfig';

interface SponsoredMarketplaceBannerProps {
  onExploreClick?: (category: string) => void;
}

export const SponsoredMarketplaceBanner: React.FC<SponsoredMarketplaceBannerProps> = ({ onExploreClick }) => {
  const [banner, setBanner] = useState<BannerType>(
    marketplaceMonetisationService.getSponsoredMarketplaceBanner()
  );

  useEffect(() => {
    const unsub = marketplaceMonetisationService.subscribe(() => {
      setBanner(marketplaceMonetisationService.getSponsoredMarketplaceBanner());
    });
    return unsub;
  }, []);

  if (banner.status !== 'ACTIVE') return null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border border-purple-500/30 text-white p-6 shadow-xl space-y-4">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Megaphone className="w-3 h-3 text-blue-400" />
              SPONSORED MARKETPLACE
            </span>
            <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              Sponsor: <strong className="text-white">{banner.sponsorName}</strong>
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            {banner.title}
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            {banner.subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <button
            onClick={() => onExploreClick && onExploreClick(banner.targetLinkCategory)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{banner.ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Placement Disclosure */}
      <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[9.5px] text-slate-400">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-amber-400" />
          <span>Commercial Sponsorship Notice • Paid Placement via House of Wealth Monetisation Engine</span>
        </span>
        <span className="hidden sm:inline font-mono">
          Campaign Valid: {banner.startDate} to {banner.endDate}
        </span>
      </div>
    </div>
  );
};
