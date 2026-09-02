import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Mail, 
  Sparkles, 
  ExternalLink, 
  Filter,
  CheckCircle2, 
  ShieldAlert,
  Plus
} from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';
import { PromotedProfessionalService } from '../../revenue/marketplaceMonetisationTypes';
import { PROMOTION_DISCLAIMER_TEXT } from '../../revenue/marketplaceMonetisationConfig';
import { PromoteServiceModal } from './PromoteServiceModal';
import { ServiceInquiryModal } from './ServiceInquiryModal';

export const PromotedServicesDirectory: React.FC = () => {
  const [services, setServices] = useState<PromotedProfessionalService[]>(
    marketplaceMonetisationService.getPromotedServices()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inquiryModalService, setInquiryModalService] = useState<PromotedProfessionalService | null>(null);
  const [showPromoteServiceModal, setShowPromoteServiceModal] = useState(false);

  useEffect(() => {
    const unsub = marketplaceMonetisationService.subscribe(() => {
      setServices(marketplaceMonetisationService.getPromotedServices());
    });
    return unsub;
  }, []);

  const categories = [
    'ALL',
    'Shariah Advisory',
    'Legal & Structuring',
    'Asset Valuation',
    'ESG & Impact Audit',
    'Due Diligence'
  ];

  const filteredServices = services.filter(s => {
    if (selectedCategory === 'ALL') return true;
    return s.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Ecosystem Professional Network
            </span>
            <span className="text-xs text-slate-400">Accredited Shariah, Legal & Valuation Practices</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Promoted Professional Services Directory
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl mt-1">
            Connect directly with verified Shariah scholars, Islamic contract attorneys, BOVAEP chartered valuers, and ESG auditors supporting D-8 capital offerings.
          </p>
        </div>

        <button
          onClick={() => setShowPromoteServiceModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Promote Your Practice (RM199)</span>
        </button>
      </div>

      {/* Regulatory & Commercial Disclosure */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          {PROMOTION_DISCLAIMER_TEXT} Professional service listings are promoted commercial placements. Project sponsors must independently verify credentials and terms of engagement.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All Practices' : cat}
          </button>
        ))}
      </div>

      {/* Grid of Promoted Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(service => (
          <div
            key={service.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                    {service.category}
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5 group-hover:text-purple-600 transition-colors">
                    {service.companyName}
                  </h3>
                </div>

                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {service.badgeType}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {service.headline}
              </p>

              <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                {service.description}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {service.verifiedCredentials.map((cred, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    {cred}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {service.location}
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {service.rating} ({service.reviewCount})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInquiryModalService(service)}
                  className="w-full py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-purple-500/20"
                >
                  <Mail className="w-3.5 h-3.5" /> Request Consultation
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {inquiryModalService && (
        <ServiceInquiryModal
          service={inquiryModalService}
          onClose={() => setInquiryModalService(null)}
        />
      )}

      {showPromoteServiceModal && (
        <PromoteServiceModal
          onClose={() => setShowPromoteServiceModal(false)}
          onSuccess={() => setServices(marketplaceMonetisationService.getPromotedServices())}
        />
      )}
    </div>
  );
};
