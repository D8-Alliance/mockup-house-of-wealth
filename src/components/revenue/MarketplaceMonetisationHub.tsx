import React, { useState } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  History, 
  BarChart3, 
  Sliders, 
  Building2, 
  Tag, 
  ShieldAlert,
  Coins
} from 'lucide-react';
import { SponsoredMarketplaceBanner } from './SponsoredMarketplaceBanner';
import { PDPPromotionCard } from './PDPPromotionCard';
import { PromotedServicesDirectory } from './PromotedServicesDirectory';
import { PromotionHistoryTable } from './PromotionHistoryTable';
import { PromotionAnalyticsDashboard } from './PromotionAnalyticsDashboard';
import { AdminMarketplaceMonetisation } from './AdminMarketplaceMonetisation';
import { PromoteProjectModal } from './PromoteProjectModal';

export const MarketplaceMonetisationHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'history' | 'analytics' | 'admin'>('overview');
  const [showGlobalPromoteModal, setShowGlobalPromoteModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Revenue & Monetisation Hub
            </span>
            <span className="text-xs text-slate-400">Campaigns • Ad Engine • Sponsored Discovery</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Marketplace Monetisation & Visibility Engine
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            End-to-end promotional ecosystem for capital campaigns, professional service practices, and sovereign sponsored marketplace takeovers.
          </p>
        </div>

        <button
          onClick={() => setShowGlobalPromoteModal(true)}
          className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Promote a Project</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs font-bold">
        {[
          { id: 'overview', label: 'Marketplace Promotions & PDP', icon: <Megaphone className="w-4 h-4" /> },
          { id: 'services', label: 'Promoted Services', icon: <Building2 className="w-4 h-4" /> },
          { id: 'history', label: 'Promotion History', icon: <History className="w-4 h-4" /> },
          { id: 'analytics', label: 'Promotion Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'admin', label: 'Admin Pricing & Schedules', icon: <Sliders className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Overview & PDP Demo */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Sponsored Marketplace Hero Takeover */}
          <SponsoredMarketplaceBanner />

          {/* Demonstration of PDP Promotion Status Widget for Active Project */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                PDP Promotion Status & Performance Demo (FELDA Palm Oil Mill)
              </h3>
              <span className="text-xs text-slate-400">Live PDP Injection Widget</span>
            </div>
            
            <PDPPromotionCard
              projectId="PROJ-FELDA-01"
              projectTitle="FELDA Smart Palm Oil Mill & Biogas Modernisation"
              currentStatus="Funding (78% Pooled)"
              orgName="FELDA Technoplant Sdn Bhd"
            />
          </div>

          {/* Secondary PDP Demo: Free / Organic Listing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                PDP Promotion Status & Performance Demo (RISDA Processing Centre)
              </h3>
              <span className="text-xs text-slate-400">Featured 7-Day Active Promotion</span>
            </div>
            
            <PDPPromotionCard
              projectId="PROJ-RISDA-02"
              projectTitle="RISDA Smallholders Latex Central Processing Centre"
              currentStatus="Pooling Phase 1"
              orgName="RISDA Plantation Holdings"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Promoted Professional Services */}
      {activeTab === 'services' && (
        <PromotedServicesDirectory />
      )}

      {/* Tab 3: Promotion History */}
      {activeTab === 'history' && (
        <PromotionHistoryTable />
      )}

      {/* Tab 4: Promotion Analytics */}
      {activeTab === 'analytics' && (
        <PromotionAnalyticsDashboard />
      )}

      {/* Tab 5: Admin Pricing & Scheduling */}
      {activeTab === 'admin' && (
        <AdminMarketplaceMonetisation />
      )}

      {/* Global Promote Modal */}
      {showGlobalPromoteModal && (
        <PromoteProjectModal
          projectId="PROJ-FELDA-01"
          projectTitle="FELDA Smart Palm Oil Mill & Biogas Modernisation"
          orgName="FELDA Technoplant Sdn Bhd"
          onClose={() => setShowGlobalPromoteModal(false)}
        />
      )}
    </div>
  );
};
