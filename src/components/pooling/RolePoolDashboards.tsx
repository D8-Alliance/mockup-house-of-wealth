import React from 'react';
import { PoolAnalytics } from './PoolingTypes';
import { 
  Coins, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Building2, 
  Clock, 
  PieChart, 
  FileCheck,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react';

interface RolePoolDashboardsProps {
  role: string;
  analytics: PoolAnalytics;
  onNavigateTab?: (tab: string) => void;
}

export const RolePoolDashboards: React.FC<RolePoolDashboardsProps> = ({
  role,
  analytics,
  onNavigateTab
}) => {
  return (
    <div className="space-y-6">
      
      {/* 1. INVESTOR DASHBOARD PERSPECTIVE */}
      {(role === 'Investor' || role === 'Guest') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            title="Total Pool Investment" 
            value="$1,240,500" 
            sub="+8.5% Annualized Return" 
            icon={<Coins className="w-5 h-5 text-emerald-500" />} 
          />
          <Card 
            title="Active Pool Allocations" 
            value="4 Pools" 
            sub="3 Countries (MY, AE, ID)" 
            icon={<PieChart className="w-5 h-5 text-blue-500" />} 
          />
          <Card 
            title="Accrued Profit YTD" 
            value="$98,400 USD" 
            sub="Auto-Reinvest Enabled" 
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />} 
          />
          <Card 
            title="Shariah Rating" 
            value="100% Compliant" 
            sub="AAOIFI Audited" 
            icon={<ShieldCheck className="w-5 h-5 text-teal-500" />} 
          />
        </div>
      )}

      {/* 2. POOL MANAGER DASHBOARD PERSPECTIVE */}
      {role === 'Pool Manager' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            title="Total Capital Managed" 
            value={`$${(analytics.totalRaised / 1000000).toFixed(2)}M USD`} 
            sub={`Target: $${(analytics.totalTarget / 1000000).toFixed(2)}M`} 
            icon={<Building2 className="w-5 h-5 text-purple-500" />} 
          />
          <Card 
            title="Active Participants" 
            value={analytics.activeInvestorsCount.toString()} 
            sub="across 5 Pools" 
            icon={<Users className="w-5 h-5 text-emerald-500" />} 
          />
          <Card 
            title="Avg Pool Yield" 
            value={`${analytics.avgExpectedYield}% p.a.`} 
            sub="Net Mudarib Distribution" 
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />} 
          />
          <Card 
            title="Mudarib Share Earned" 
            value="$142,000 USD" 
            sub="Performance Incentive" 
            icon={<FileCheck className="w-5 h-5 text-blue-500" />} 
          />
        </div>
      )}

      {/* 3. INSTITUTIONAL INVESTOR DASHBOARD PERSPECTIVE */}
      {role === 'Institutional Investor' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            title="Institutional Allocation" 
            value="$18,500,000" 
            sub="Sovereign Waqf & Sukuk" 
            icon={<Building2 className="w-5 h-5 text-indigo-500" />} 
          />
          <Card 
            title="Avg Weighted Return" 
            value="10.2% p.a." 
            sub="Grade A+ Backed" 
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />} 
          />
          <Card 
            title="ESG & Social Impact" 
            value="14,200 Lives" 
            sub="Irrigation & Green Solar" 
            icon={<ShieldCheck className="w-5 h-5 text-teal-500" />} 
          />
          <Card 
            title="Liquidity Exit Access" 
            value="T+0 Settlement" 
            sub="Secondary Market Ready" 
            icon={<CheckCircle2 className="w-5 h-5 text-blue-500" />} 
          />
        </div>
      )}

      {/* 4. ASSET OWNER DASHBOARD PERSPECTIVE */}
      {role === 'Asset Owner' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            title="Underlying RWA Collateral" 
            value="$28,400,000" 
            sub="Verified Appraisals" 
            icon={<Building2 className="w-5 h-5 text-amber-500" />} 
          />
          <Card 
            title="Capital Pool Mobilized" 
            value="$18,200,000" 
            sub="64% Loan-to-Value Buffer" 
            icon={<Coins className="w-5 h-5 text-emerald-500" />} 
          />
          <Card 
            title="Contract Terms Active" 
            value="Musharakah Equity" 
            sub="Profit Split 80/20" 
            icon={<FileCheck className="w-5 h-5 text-blue-500" />} 
          />
          <Card 
            title="Audit Verification" 
            value="Passed Grade A" 
            sub="Next Review Q4 2026" 
            icon={<ShieldCheck className="w-5 h-5 text-purple-500" />} 
          />
        </div>
      )}

    </div>
  );
};

function Card({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-slate-100 dark:bg-slate-700/60 rounded-xl">{icon}</div>
      </div>
      <div>
        <span className="text-xl font-black text-slate-900 dark:text-white block tracking-tight">{value}</span>
        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">{sub}</span>
      </div>
    </div>
  );
}
