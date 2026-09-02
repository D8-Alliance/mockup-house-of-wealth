import React from 'react';
import { Filter, RotateCcw, Search, Calendar, Globe, Building2, Layers, UserCheck } from 'lucide-react';
import { RevenueFilterState } from '../../revenue/revenueManagementTypes';

interface RevenueDashboardFiltersProps {
  filters: RevenueFilterState;
  onFilterChange: (newFilters: RevenueFilterState) => void;
  onReset: () => void;
  userCountryScope?: string;
  isCountryLocked?: boolean;
}

export const RevenueDashboardFilters: React.FC<RevenueDashboardFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  userCountryScope,
  isCountryLocked
}) => {
  const updateField = (field: keyof RevenueFilterState, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value
    });
  };

  const countries = [
    'ALL',
    'Malaysia',
    'Indonesia',
    'Turkey',
    'Nigeria',
    'Egypt',
    'Pakistan',
    'Bangladesh',
    'Iran',
    'Global'
  ];

  const organisations = [
    'ALL',
    'FELDA Technoplant Sdn Bhd',
    'MARA Corporation Berhad',
    'ANGKASA Malaysia',
    'Ziraat Katilim Asset Management',
    'PT Bank Muamalat Indonesia Tbk',
    'IsDB Private Equity Fund',
    'Amanie Advisors Sdn Bhd',
    'Cairo Islamic Venture Partners',
    'Karachi Halal Chambers Syndicate'
  ];

  const revenueTypes = [
    'ALL',
    'Membership',
    'AI Credits',
    'PDP Subscription',
    'Featured Listing',
    'Premium Report',
    'Marketplace Advertising',
    'Enterprise Node'
  ];

  const membershipTiers = [
    'ALL',
    'Free',
    'Plus',
    'Professional',
    'Enterprise'
  ];

  const userTypes = [
    'ALL',
    'Retail Investor',
    'HNWI Investor',
    'Institutional Investor',
    'PDP / Project Sponsor',
    'Enterprise Member',
    'Shariah Scholar / Firm'
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Multi-Dimensional Revenue Filters
          </span>
          {isCountryLocked && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Country-Scoped: {userCountryScope}
            </span>
          )}
        </div>

        <button
          onClick={onReset}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
        </button>
      </div>

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        
        {/* Date Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={e => updateField('dateRange', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
          >
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last 90 Days</option>
            <option value="1Y">Last 12 Months</option>
            <option value="ALL">All Time</option>
          </select>
        </div>

        {/* Country Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Country Node
          </label>
          <select
            value={filters.country}
            disabled={isCountryLocked}
            onChange={e => updateField('country', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold disabled:opacity-60"
          >
            {countries.map(c => (
              <option key={c} value={c}>{c === 'ALL' ? 'All Countries' : c}</option>
            ))}
          </select>
        </div>

        {/* Organisation Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Organisation
          </label>
          <select
            value={filters.organisation}
            onChange={e => updateField('organisation', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold truncate"
          >
            {organisations.map(org => (
              <option key={org} value={org}>{org === 'ALL' ? 'All Organisations' : org}</option>
            ))}
          </select>
        </div>

        {/* Revenue Type Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Revenue Type
          </label>
          <select
            value={filters.revenueType}
            onChange={e => updateField('revenueType', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
          >
            {revenueTypes.map(rt => (
              <option key={rt} value={rt}>{rt === 'ALL' ? 'All Streams' : rt}</option>
            ))}
          </select>
        </div>

        {/* Membership Tier Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Membership Tier
          </label>
          <select
            value={filters.membershipTier}
            onChange={e => updateField('membershipTier', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
          >
            {membershipTiers.map(m => (
              <option key={m} value={m}>{m === 'ALL' ? 'All Tiers' : m}</option>
            ))}
          </select>
        </div>

        {/* User Type Filter */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> User Persona
          </label>
          <select
            value={filters.userType}
            onChange={e => updateField('userType', e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold truncate"
          >
            {userTypes.map(ut => (
              <option key={ut} value={ut}>{ut === 'ALL' ? 'All Personas' : ut}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Text search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter ledger by Customer Name, Invoice #, Target Project, or Reference ID..."
          value={filters.searchQuery}
          onChange={e => updateField('searchQuery', e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
        />
      </div>
    </div>
  );
};
