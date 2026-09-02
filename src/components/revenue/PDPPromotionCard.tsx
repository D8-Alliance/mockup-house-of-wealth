import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  Calendar, 
  Eye, 
  MousePointerClick, 
  Users, 
  DollarSign, 
  ShieldAlert, 
  TrendingUp,
  Tag
} from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { PROMOTION_DISCLAIMER_TEXT } from '../../revenue/marketplaceMonetisationConfig';
import { PromoteProjectModal } from './PromoteProjectModal';

interface PDPPromotionCardProps {
  projectId: string;
  projectTitle: string;
  currentStatus: string;
  orgName: string;
  onRefresh?: () => void;
}

export const PDPPromotionCard: React.FC<PDPPromotionCardProps> = ({
  projectId,
  projectTitle,
  currentStatus,
  orgName,
  onRefresh
}) => {
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [pdpDetails, setPdpDetails] = useState(
    marketplaceMonetisationService.getPDPPromotionDetails(projectId, projectTitle, orgName)
  );

  useEffect(() => {
    const update = () => {
      setPdpDetails(marketplaceMonetisationService.getPDPPromotionDetails(projectId, projectTitle, orgName));
    };
    const unsub = marketplaceMonetisationService.subscribe(update);
    return unsub;
  }, [projectId, projectTitle, orgName]);

  const handlePromotionSuccess = () => {
    setPdpDetails(marketplaceMonetisationService.getPDPPromotionDetails(projectId, projectTitle, orgName));
    if (onRefresh) onRefresh();
  };

  const getBadgeStyle = () => {
    if (pdpDetails.badgeType === 'Featured') {
      return 'bg-amber-500 text-slate-950 border-amber-600 font-black';
    }
    if (pdpDetails.badgeType === 'Sponsored') {
      return 'bg-blue-600 text-white border-blue-700 font-black';
    }
    if (pdpDetails.badgeType === 'Promoted') {
      return 'bg-purple-600 text-white border-purple-700 font-black';
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 font-bold';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Marketplace Monetisation & PDP Visibility</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getBadgeStyle()}`}>
                {pdpDetails.badgeType || 'Free Listing'}
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Project Promotion & Campaign Analytics
            </h3>
          </div>
        </div>

        <button
          onClick={() => setShowPromoteModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Promote Project</span>
        </button>
      </div>

      {/* Grid of Key PDP Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Project Name */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Project</span>
          <span className="font-extrabold text-slate-900 dark:text-white line-clamp-1" title={projectTitle}>
            {projectTitle}
          </span>
          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{projectId}</span>
        </div>

        {/* Current Status */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Current Status</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
            {currentStatus}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{orgName}</span>
        </div>

        {/* Promotion Status */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Promotion Status</span>
          <span className="font-extrabold text-amber-600 dark:text-amber-400">
            {pdpDetails.promotionStatus}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{pdpDetails.packageName}</span>
        </div>

        {/* Promotion Cost */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Promotion Cost</span>
          <span className="font-black text-slate-900 dark:text-white text-sm">
            {pdpDetails.promotionCost === 0 ? 'Free (RM0)' : `RM ${pdpDetails.promotionCost.toLocaleString()}`}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{pdpDetails.currency}</span>
        </div>
      </div>

      {/* Date & Performance Metrics Shelf */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-1">
        {/* Start Date */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Start Date</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{pdpDetails.startDate}</span>
          </div>
        </div>

        {/* End Date */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">End Date</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{pdpDetails.endDate}</span>
          </div>
        </div>

        {/* Views */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <Eye className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Views</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
              {pdpDetails.views.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Clicks */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <MousePointerClick className="w-4 h-4 text-purple-500 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Clicks (CTR)</span>
            <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
              {pdpDetails.clicks.toLocaleString()} <span className="text-[10px] font-normal text-purple-500">({pdpDetails.ctr}%)</span>
            </span>
          </div>
        </div>

        {/* Leads */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 col-span-2 sm:col-span-1">
          <Users className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 block">Investor Leads</span>
            <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
              {pdpDetails.leads} inquiries
            </span>
          </div>
        </div>
      </div>

      {/* Regulatory & Commercial Disclosure Bar */}
      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-700 dark:text-slate-300">Regulatory Placement Disclosure: </span>
          <span>{PROMOTION_DISCLAIMER_TEXT}</span>
        </div>
      </div>

      {/* Promote Modal */}
      {showPromoteModal && (
        <PromoteProjectModal
          projectId={projectId}
          projectTitle={projectTitle}
          orgName={orgName}
          onClose={() => setShowPromoteModal(false)}
          onSuccess={handlePromotionSuccess}
        />
      )}
    </div>
  );
};
