import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Save, 
  Pause, 
  Play, 
  ShieldAlert, 
  Sparkles,
  BarChart3,
  Sliders
} from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { PromotionPackage, PromotionCampaign } from '../../revenue/marketplaceMonetisationTypes';
import { AdminPromotionPackagesEditor } from './AdminPromotionPackagesEditor';

export const AdminMarketplaceMonetisation: React.FC = () => {
  const [packages, setPackages] = useState<PromotionPackage[]>(
    marketplaceMonetisationService.getPackages()
  );
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>(
    marketplaceMonetisationService.getCampaigns()
  );

  // Campaign editing state
  const [editingCampId, setEditingCampId] = useState<string | null>(null);
  const [campStartDate, setCampStartDate] = useState<string>('');
  const [campEndDate, setCampEndDate] = useState<string>('');
  const [campStatus, setCampStatus] = useState<PromotionCampaign['status']>('ACTIVE');

  useEffect(() => {
    const unsub = marketplaceMonetisationService.subscribe(() => {
      setPackages(marketplaceMonetisationService.getPackages());
      setCampaigns(marketplaceMonetisationService.getCampaigns());
    });
    return unsub;
  }, []);

  const handleStartEditCampaign = (camp: PromotionCampaign) => {
    setEditingCampId(camp.id);
    setCampStartDate(camp.startDate);
    setCampEndDate(camp.endDate);
    setCampStatus(camp.status);
  };

  const handleSaveCampaign = (campId: string) => {
    marketplaceMonetisationService.updateCampaignDatesAndStatus(
      campId,
      campStatus,
      campStartDate,
      campEndDate
    );
    setEditingCampId(null);
  };

  const handleToggleStatus = (camp: PromotionCampaign) => {
    const nextStatus = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    marketplaceMonetisationService.updateCampaignDatesAndStatus(
      camp.id,
      nextStatus,
      camp.startDate,
      camp.endDate
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-400">Marketplace Monetisation & Ad Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Sponsored Listings & Package Pricing Management
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Configure dynamic commercial rates (Featured 7D = RM99, Featured 30D = RM299, Sponsored Takeovers), manage active campaign schedules, and monitor impression delivery.
          </p>
        </div>
      </div>

      {/* Section 1: Promotion Packages Editor */}
      <AdminPromotionPackagesEditor packages={packages} />

      {/* Section 2: Active Sponsored Listings & Campaign Schedules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Sponsored & Promoted Listings Schedule / Status Control
          </h3>
          <span className="text-xs text-slate-400">Override start/end dates & moderation status</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Listing / Ref</th>
                  <th className="p-4">Package</th>
                  <th className="p-4">Schedule (Start / End)</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Performance Telemetry</th>
                  <th className="p-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campaigns.map(camp => {
                  const isEditing = editingCampId === camp.id;
                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-4 max-w-xs">
                        <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                          {camp.targetTitle}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {camp.id} • {camp.targetOrg}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">{camp.packageName}</span>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">RM {camp.promotionCostMYR}</span>
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={campStartDate}
                              onChange={e => setCampStartDate(e.target.value)}
                              className="p-1 text-[11px] rounded border"
                            />
                            <input
                              type="date"
                              value={campEndDate}
                              onChange={e => setCampEndDate(e.target.value)}
                              className="p-1 text-[11px] rounded border block"
                            />
                          </div>
                        ) : (
                          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            <div>{camp.startDate}</div>
                            <div className="text-[10px] text-slate-400">to {camp.endDate}</div>
                          </div>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                          <select
                            value={campStatus}
                            onChange={e => setCampStatus(e.target.value as any)}
                            className="p-1 text-xs rounded border"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="PAUSED">PAUSED</option>
                            <option value="EXPIRED">EXPIRED</option>
                            <option value="SCHEDULED">SCHEDULED</option>
                          </select>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                              : camp.status === 'PAUSED'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                              : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {camp.status}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center font-mono text-[11px]">
                        <div>{camp.metrics.views} views • {camp.metrics.clicks} clicks</div>
                        <span className="text-emerald-600 font-bold">{camp.metrics.leads} leads</span>
                      </td>

                      <td className="p-4 text-right space-x-1">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveCampaign(camp.id)}
                            className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleStatus(camp)}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                              title={camp.status === 'ACTIVE' ? 'Pause Campaign' : 'Resume Campaign'}
                            >
                              {camp.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleStartEditCampaign(camp)}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
