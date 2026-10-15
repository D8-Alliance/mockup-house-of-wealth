import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Eye, 
  MousePointerClick, 
  Users,
  FileText,
  Sparkles
} from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { PromotionCampaign } from '../../revenue/marketplaceMonetisationTypes';
import { formatDateTime } from '../../utils/platformTime';

export const PromotionHistoryTable: React.FC = () => {
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>(
    marketplaceMonetisationService.getCampaigns()
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'SCHEDULED'>('ALL');
  const [selectedCampaign, setSelectedCampaign] = useState<PromotionCampaign | null>(null);

  useEffect(() => {
    const unsub = marketplaceMonetisationService.subscribe(() => {
      setCampaigns(marketplaceMonetisationService.getCampaigns());
    });
    return unsub;
  }, []);

  const filtered = campaigns.filter(c => {
    const matchSearch = c.targetTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.targetOrg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: PromotionCampaign['status']) => {
    if (status === 'ACTIVE') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> ACTIVE</span>;
    }
    if (status === 'SCHEDULED') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 border border-blue-500/30 flex items-center gap-1"><Clock className="w-3 h-3" /> SCHEDULED</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-500/10 text-slate-500 border border-slate-500/30">EXPIRED</span>;
  };

  const getBadgePill = (badge: string) => {
    if (badge === 'Featured') return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500 text-slate-950">FEATURED</span>;
    if (badge === 'Sponsored') return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-600 text-white">SPONSORED</span>;
    return <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-600 text-white">PROMOTED</span>;
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Promotion Campaign History & Audit Log
            </h3>
            <p className="text-xs text-slate-500">
              Verified record of active, completed, and scheduled visibility boost orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium w-48 sm:w-60"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="EXPIRED">Expired / Completed</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Campaign Ref</th>
                <th className="p-4">Target Opportunity</th>
                <th className="p-4">Package & Badge</th>
                <th className="p-4">Schedule Dates</th>
                <th className="p-4 text-right">Cost (MYR)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Performance (Views / Clicks / Leads)</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    No promotion campaigns found matching your query.
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                      {c.id}
                      <span className="block text-[10px] text-slate-400 font-normal">{formatDateTime(c.createdAt)}</span>
                    </td>

                    <td className="p-4 max-w-xs">
                      <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {c.targetTitle}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{c.targetOrg}</span>
                    </td>

                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{c.packageName}</div>
                        {getBadgePill(c.badgeType)}
                      </div>
                    </td>

                    <td className="p-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <div>{c.startDate}</div>
                      <div className="text-slate-400 text-[10px]">to {c.endDate}</div>
                    </td>

                    <td className="p-4 text-right font-black text-slate-900 dark:text-white font-mono">
                      {c.promotionCostMYR === 0 ? 'RM 0 (Free)' : `RM ${c.promotionCostMYR.toLocaleString()}`}
                      <span className="block text-[10px] text-slate-400 font-normal">{c.paymentMethod}</span>
                    </td>

                    <td className="p-4 text-center">
                      {getStatusBadge(c.status)}
                    </td>

                    <td className="p-4 text-center font-mono">
                      <div className="flex items-center justify-center gap-2 text-[11px]">
                        <span className="text-blue-600 dark:text-blue-400 font-bold">{c.metrics.views}v</span>
                        <span>•</span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold">{c.metrics.clicks}c ({c.metrics.ctr}%)</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{c.metrics.leads} leads</span>
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedCampaign(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-[11px] font-bold"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                  {selectedCampaign.id}
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {selectedCampaign.targetTitle}
                </h3>
                <p className="text-xs text-slate-500">{selectedCampaign.targetOrg}</p>
              </div>
              {getStatusBadge(selectedCampaign.status)}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-4 rounded-2xl bg-slate-50 dark:bg-slate-800">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Package</span>
                <div className="font-bold text-slate-900 dark:text-white">{selectedCampaign.packageName}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Fee</span>
                <div className="font-bold text-amber-600 dark:text-amber-400">RM {selectedCampaign.promotionCostMYR} ({selectedCampaign.paymentMethod})</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Start Date</span>
                <div className="font-mono text-slate-800 dark:text-slate-200">{selectedCampaign.startDate}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">End Date</span>
                <div className="font-mono text-slate-800 dark:text-slate-200">{selectedCampaign.endDate}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Campaign Telemetry & Lead Conversion</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-slate-900 dark:text-white">{selectedCampaign.metrics.views}</div>
                  <div className="text-[10px] text-slate-400">Impressions</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-purple-600">{selectedCampaign.metrics.clicks}</div>
                  <div className="text-[10px] text-slate-400">Clicks ({selectedCampaign.metrics.ctr}%)</div>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                  <div className="text-lg font-black text-emerald-600">{selectedCampaign.metrics.leads}</div>
                  <div className="text-[10px] text-slate-400">Leads ({selectedCampaign.metrics.conversionRate}%)</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCampaign(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs"
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
