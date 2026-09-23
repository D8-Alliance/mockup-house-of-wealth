import React, { useState } from 'react';
import { X, Sparkles, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { marketplaceMonetisationService } from '../../revenue/marketplaceMonetisationService';

interface PromoteServiceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const PromoteServiceModal: React.FC<PromoteServiceModalProps> = ({ onClose, onSuccess }) => {
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState<'Shariah Advisory' | 'Legal & Structuring' | 'Asset Valuation' | 'ESG & Impact Audit' | 'Due Diligence'>('Shariah Advisory');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [credentials, setCredentials] = useState('AAOIFI Fellow, SC Registered');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !email) return;

    marketplaceMonetisationService.promoteProfessionalService({
      companyName,
      category,
      headline: headline || `${category} & Institutional Advisory Practice`,
      description: description || 'Providing accredited Shariah governance, asset valuation, and legal structuring services across D-8 markets.',
      location: location || 'Kuala Lumpur, Malaysia',
      verifiedCredentials: credentials.split(',').map(c => c.trim()).filter(Boolean),
      contactEmail: email,
      paidByUserId: 'USR-8821'
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Service Provider Promotion
              </span>
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              Promote Your Professional Practice (30 Days)
            </h3>
            <p className="text-xs text-slate-500">
              Feature your firm on the Wealth Pooling ecosystem directory for RM 199 / month.
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Company / Practice Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Al-Barakah Shariah Advisory"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Practice Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            >
              <option value="Shariah Advisory">Shariah Advisory</option>
              <option value="Legal & Structuring">Legal & Structuring</option>
              <option value="Asset Valuation">Asset Valuation</option>
              <option value="ESG & Impact Audit">ESG & Impact Audit</option>
              <option value="Due Diligence">Due Diligence</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Headline</label>
            <input
              type="text"
              placeholder="e.g. Chartered Shariah Advisory for Islamic Syndications"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Practice Scope & Bio</label>
            <textarea
              rows={3}
              placeholder="Highlight your qualifications, regional licensing, and track record..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Kuala Lumpur, Malaysia"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Contact Email</label>
              <input
                type="email"
                required
                placeholder="advisory@firm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Credentials (Comma separated)</label>
            <input
              type="text"
              value={credentials}
              onChange={e => setCredentials(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-[11px]"
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
              className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-lg shadow-purple-600/20"
            >
              Confirm Promotion (RM 199)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
