import React from 'react';
import { Megaphone, Star, Sparkles, TrendingUp, Eye, MousePointerClick, UserPlus } from 'lucide-react';
import { PromotionSaleRecord } from '../../revenue/revenueManagementTypes';

interface PromotionSalesTabProps {
  promotionSales: PromotionSaleRecord[];
  currency: 'MYR' | 'USD';
}

export const PromotionSalesTab: React.FC<PromotionSalesTabProps> = ({
  promotionSales,
  currency
}) => {
  const sym = currency === 'MYR' ? 'RM ' : '$';

  const totalViews = promotionSales.reduce((acc, p) => acc + p.views, 0);
  const totalClicks = promotionSales.reduce((acc, p) => acc + p.clicks, 0);
  const totalLeads = promotionSales.reduce((acc, p) => acc + p.leads, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Promotional Impressions</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {totalViews.toLocaleString()} <span className="text-xs text-slate-400">Views</span>
          </div>
          <p className="text-[11px] text-slate-500">Across Featured carousels & banners</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Click-Through Engagement</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalClicks.toLocaleString()} <span className="text-xs text-blue-500 font-bold">({((totalClicks / totalViews) * 100).toFixed(1)}% CTR)</span>
          </div>
          <p className="text-[11px] text-slate-500">Direct PDP discovery clicks</p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Investor Inquiries Generated</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalLeads.toLocaleString()} <span className="text-xs text-emerald-500 font-bold">Leads</span>
          </div>
          <p className="text-[11px] text-slate-500">Verified investor syndication inquiries</p>
        </div>
      </div>

      {/* Promotion Sales Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-yellow-500" />
              Marketplace Promotion Sales & Campaign Performance
            </h3>
            <p className="text-xs text-slate-500">
              Commercial placement sales across Featured Badges, Sponsored Spotlight, and Directory Promotions.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Target Project / Service</th>
                <th className="p-3.5">Sponsor Organization</th>
                <th className="p-3.5">Promotion Package</th>
                <th className="p-3.5">Campaign Window</th>
                <th className="p-3.5 text-center">Performance (Views / Clicks / Leads)</th>
                <th className="p-3.5 text-right">Invoiced Amount</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {promotionSales.map(promo => {
                const amount = currency === 'MYR' ? promo.priceMYR : promo.priceUSD;
                return (
                  <tr key={promo.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 max-w-[200px]">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">{promo.targetTitle}</span>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {promo.id}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{promo.sponsorOrg}</span>
                      <span className="text-[10px] text-slate-400">{promo.country}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        {promo.packageType}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {promo.startDate} to {promo.endDate} ({promo.durationDays}d)
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
                        <span className="text-slate-600 dark:text-slate-300" title="Views">{promo.views.toLocaleString()} v</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-blue-600 font-bold" title="Clicks">{promo.clicks} c</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-bold" title="Leads">{promo.leads} leads</span>
                      </div>
                    </td>

                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {sym}{amount.toLocaleString()}
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        {promo.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
