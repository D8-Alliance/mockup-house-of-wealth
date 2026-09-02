import React, { useState } from 'react';
import { Globe, X, Check } from 'lucide-react';
import { countryNodeService } from './countryNodeService';
import { useRBAC } from '../rbac/RBACContext';

interface CountryNodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const CountryNodeFormModal: React.FC<CountryNodeFormModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const { currentUserId } = useRBAC();
  const [countryName, setCountryName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [region, setRegion] = useState('Southeast Asia');
  const [currency, setCurrency] = useState('');
  const [timezone, setTimezone] = useState('');
  const [regulatoryProfile, setRegulatoryProfile] = useState('');
  const [flagUrl, setFlagUrl] = useState('https://flagcdn.com/w80/un.png');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryName || !countryCode || !currency) return;

    const code = countryCode.toUpperCase();
    countryNodeService.createCountryNode(
      {
        countryNodeId: `CN-${code}`,
        countryCode: code,
        countryName,
        region,
        currency: currency.toUpperCase(),
        timezone: timezone || 'UTC',
        regulatoryProfile: regulatoryProfile || 'Central Monetary Authority',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        flagUrl
      },
      currentUserId || 'SYS-ADMIN-01'
    );

    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Provision Country Operating Node</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Country Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Egypt"
                value={countryName}
                onChange={e => setCountryName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">3-Letter ISO Code</label>
              <input
                type="text"
                required
                maxLength={3}
                placeholder="e.g. EGY"
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Region</label>
              <select
                value={region}
                onChange={e => setRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="Southeast Asia">Southeast Asia</option>
                <option value="Middle East">Middle East</option>
                <option value="North Africa">North Africa</option>
                <option value="West Africa">West Africa</option>
                <option value="South Asia">South Asia</option>
                <option value="Eurasia">Eurasia</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency Code</label>
              <input
                type="text"
                required
                maxLength={3}
                placeholder="e.g. EGP"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Regulatory Authority Profile</label>
            <input
              type="text"
              placeholder="e.g. Central Bank of Egypt / Financial Regulatory Authority"
              value={regulatoryProfile}
              onChange={e => setRegulatoryProfile(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
            <input
              type="text"
              placeholder="e.g. Africa/Cairo"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Provision Node</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
