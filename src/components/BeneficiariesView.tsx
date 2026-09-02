import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  Mail, 
  Phone, 
  Wallet, 
  ShieldCheck, 
  Scale, 
  Building, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Percent,
  Sparkles,
  Search,
  BookOpen
} from 'lucide-react';
import { BeneficiaryItem, LanguageCode } from '../types';
import { BeneficiaryModal } from './BeneficiaryModal';
import { TRANSLATIONS } from '../data/translations';

interface BeneficiariesViewProps {
  beneficiaries: BeneficiaryItem[];
  setBeneficiaries: React.Dispatch<React.SetStateAction<BeneficiaryItem[]>>;
  lang: LanguageCode;
}

export const BeneficiariesView: React.FC<BeneficiariesViewProps> = ({
  beneficiaries,
  setBeneficiaries,
  lang
}) => {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<BeneficiaryItem | null>(null);
  const [filterRelation, setFilterRelation] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSave = (item: BeneficiaryItem) => {
    if (editingBeneficiary) {
      setBeneficiaries(prev => prev.map(b => b.id === item.id ? item : b));
      showToast(`Updated beneficiary: ${item.name}`);
    } else {
      setBeneficiaries(prev => [...prev, item]);
      showToast(`Added new beneficiary: ${item.name}`);
    }
    setModalOpen(false);
    setEditingBeneficiary(null);
  };

  const handleDelete = (id: string) => {
    const target = beneficiaries.find(b => b.id === id);
    if (target && window.confirm(`Are you sure you want to remove ${target.name} from your beneficiaries?`)) {
      setBeneficiaries(prev => prev.filter(b => b.id !== id));
      showToast(`Removed beneficiary: ${target.name}`);
    }
  };

  const handleSetPrimary = (id: string) => {
    setBeneficiaries(prev => prev.map(b => ({
      ...b,
      isPrimary: b.id === id
    })));
    const target = beneficiaries.find(b => b.id === id);
    if (target) {
      showToast(`Designated ${target.name} as Primary Beneficiary`);
    }
  };

  const totalAllocation = beneficiaries.reduce((acc, b) => acc + (b.allocationPercent || 0), 0);
  const primaryBeneficiary = beneficiaries.find(b => b.isPrimary);
  const waqfTotal = beneficiaries
    .filter(b => b.relation === 'Waqf Foundation' || b.distributionType === 'Zakat & Sadaqah')
    .reduce((acc, b) => acc + (b.allocationPercent || 0), 0);

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.email && b.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.identityNumber && b.identityNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterRelation === 'all') return true;
    if (filterRelation === 'heirs') return ['Spouse', 'Child', 'Parent', 'Sibling'].includes(b.relation);
    if (filterRelation === 'waqf') return b.relation === 'Waqf Foundation' || b.distributionType === 'Zakat & Sadaqah';
    if (filterRelation === 'profit') return b.distributionType === 'Profit Share';
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Shariah Estate & Wealth Preservation
            </span>
            <span className="text-xs font-mono text-slate-400">AAOIFI Shariah Standard No. 33</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <HeartHandshake className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            <span>Beneficiaries & Wasiyyah Distributions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure automated profit-share distributions, legal estate allocation (Wasiyyah), and perpetual Waqf endowment trusts across D-8 member jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingBeneficiary(null);
              setModalOpen(true);
            }}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Beneficiary</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase">
            <span>Total Beneficiaries</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {beneficiaries.length} Registered
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {beneficiaries.filter(b => b.relation !== 'Waqf Foundation').length} Heirs • {beneficiaries.filter(b => b.relation === 'Waqf Foundation').length} Waqf/Charity
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase">
            <span>Total Allocation</span>
            <Percent className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {totalAllocation}%
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              totalAllocation === 100 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}>
              {totalAllocation === 100 ? '100% Fully Allocated' : `${100 - totalAllocation}% Remaining`}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                totalAllocation === 100 ? 'bg-emerald-500' : totalAllocation > 100 ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(totalAllocation, 100)}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase">
            <span>Primary Recipient</span>
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>
          <p className="text-base font-black text-slate-900 dark:text-white truncate">
            {primaryBeneficiary?.name || 'None Designated'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {primaryBeneficiary ? `${primaryBeneficiary.relation} • ${primaryBeneficiary.allocationPercent}%` : 'Select a primary heir'}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-extrabold uppercase">
            <span>Waqf & Sadaqah Pool</span>
            <Building className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {waqfTotal}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Perpetual charitable endowments
          </p>
        </div>
      </div>

      {/* Shariah Guidance Box */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                Wasiyyah Rule
              </span>
              <span className="text-xs text-slate-300 font-mono">1/3 Maximum Limit</span>
            </div>
            <h4 className="text-sm font-black text-white">
              Islamic Inheritance & Bequest Standards
            </h4>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Under AAOIFI and unified D-8 Shariah estate principles, non-Quranic heirs and charitable Waqf bequests (Wasiyyah) are capped at maximum <strong>one-third (33.33%)</strong> of total estate value, with the remaining balance distributed according to statutory Faraid inheritance quotas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dual-Jurisdiction Certified</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterRelation('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              filterRelation === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All ({beneficiaries.length})
          </button>
          <button
            onClick={() => setFilterRelation('heirs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              filterRelation === 'heirs'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Family / Heirs
          </button>
          <button
            onClick={() => setFilterRelation('waqf')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              filterRelation === 'waqf'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Waqf & Sadaqah
          </button>
          <button
            onClick={() => setFilterRelation('profit')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              filterRelation === 'profit'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Profit Share Only
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, or email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Beneficiaries List / Grid */}
      {filteredBeneficiaries.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <HeartHandshake className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No Beneficiaries Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery 
              ? 'No registered beneficiaries matched your search query.' 
              : 'Add your first beneficiary to set up automated Shariah profit distribution and estate Wasiyyah.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingBeneficiary(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Beneficiary</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBeneficiaries.map(ben => (
            <div 
              key={ben.id}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between space-y-5 ${
                ben.isPrimary 
                  ? 'bg-gradient-to-b from-emerald-500/5 to-white dark:to-slate-800 border-emerald-500/40 dark:border-emerald-500/30 shadow-md ring-1 ring-emerald-500/20' 
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/60 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Header Info */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {ben.name}
                      </h3>
                      {ben.isPrimary && (
                        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/30">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          Primary Beneficiary
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                        {ben.relation}
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                        {ben.distributionType}
                      </span>
                    </div>
                  </div>

                  {/* Allocation Badge */}
                  <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Share</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {ben.allocationPercent}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(ben.allocationPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Identity & Coordinates */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                  {ben.identityNumber && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-[11px]">National / Entity ID:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ben.identityNumber}</span>
                    </div>
                  )}

                  {ben.email && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-[11px] flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>Email:</span>
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{ben.email}</span>
                    </div>
                  )}

                  {ben.phone && (
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-[11px] flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>Phone:</span>
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{ben.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1">
                    <span className="font-semibold text-[11px] flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Settlement:</span>
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[200px]">
                      {ben.payoutMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBeneficiary(ben);
                      setModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ben.id)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                {!ben.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(ben.id)}
                    className="px-3 py-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>Set Primary</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <BeneficiaryModal
          beneficiary={editingBeneficiary}
          onClose={() => {
            setModalOpen(false);
            setEditingBeneficiary(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
