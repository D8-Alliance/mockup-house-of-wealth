import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { PromotedProfessionalService } from '../../revenue/marketplaceMonetisationTypes';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';

interface ServiceInquiryModalProps {
  service: PromotedProfessionalService;
  onClose: () => void;
}

export const ServiceInquiryModal: React.FC<ServiceInquiryModalProps> = ({ service, onClose }) => {
  const [inquirySent, setInquirySent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    marketplaceMonetisationService.recordLead(service.activeCampaignId || 'CMP-2026-004', 15000);
    setInquirySent(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Send RFP / Lead Inquiry
            </h3>
            <p className="text-xs text-slate-500">
              Recipient: <strong>{service.companyName}</strong> ({service.category})
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Your Name / Organisation</label>
            <input
              type="text"
              required
              defaultValue="FELDA Technoplant Corporate Desk"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Project Ref / Subject</label>
            <input
              type="text"
              required
              defaultValue="Shariah Asset Screening & Fatwa Consultation Request"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Message Scope</label>
            <textarea
              rows={3}
              required
              defaultValue="Requesting fee quote and timeline for AAOIFI Mudarabah contract review for our upcoming RM 5M Agri-industrial capital campaign."
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inquirySent}
              className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
            >
              {inquirySent ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Inquiry Dispatched!
                </span>
              ) : (
                <span>Submit RFP Inquiry</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
