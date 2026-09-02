import React, { useState } from 'react';
import { 
  Globe, 
  Settings2, 
  ShieldCheck, 
  FileText, 
  Check, 
  Edit3, 
  Save, 
  Plus, 
  Trash2,
  Lock,
  Layers
} from 'lucide-react';
import { PDPCountryConfig, PDPType } from '../pdpTypes';
import { pdpService } from '../pdpService';

export const PDPCountryConfigAdminPanel: React.FC = () => {
  const [configs, setConfigs] = useState<PDPCountryConfig[]>(pdpService.getAllCountryConfigs());
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('MYS');
  const [editingConfig, setEditingConfig] = useState<PDPCountryConfig | null>(null);

  const currentConfig = pdpService.getCountryConfig(selectedCountryCode) || configs[0];

  const handleSelectCountry = (code: string) => {
    setSelectedCountryCode(code);
    setEditingConfig(null);
  };

  const handleStartEdit = () => {
    setEditingConfig(JSON.parse(JSON.stringify(currentConfig)));
  };

  const handleSave = () => {
    if (editingConfig) {
      pdpService.updateCountryConfig(editingConfig.countryCode, editingConfig);
      setConfigs(pdpService.getAllCountryConfigs());
      setEditingConfig(null);
    }
  };

  const togglePdpType = (type: PDPType) => {
    if (!editingConfig) return;
    const exists = editingConfig.enabledPdpTypes.includes(type);
    setEditingConfig({
      ...editingConfig,
      enabledPdpTypes: exists 
        ? editingConfig.enabledPdpTypes.filter(t => t !== type)
        : [...editingConfig.enabledPdpTypes, type]
    });
  };

  const toggleDocMandatory = (docType: string) => {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      requiredDocuments: editingConfig.requiredDocuments.map(d => 
        d.docType === docType ? { ...d, mandatory: !d.mandatory } : d
      )
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              SUPER ADMIN SOVEREIGNTY CONTROL
            </span>
            <span className="text-xs text-slate-400 font-mono">D-8 Multi-Jurisdiction Rules</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Country-Level PDP Onboarding & KYB Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure jurisdiction-specific legal document requirements, approval workflows, and supported PDP entity types.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editingConfig ? (
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          ) : (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Configure Node</span>
            </button>
          )}
        </div>
      </div>

      {/* Country Selection Grid */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {configs.map(c => {
          const isSelected = c.countryCode === selectedCountryCode;
          return (
            <button
              key={c.countryCode}
              onClick={() => handleSelectCountry(c.countryCode)}
              className={`px-4 py-2.5 rounded-2xl border text-xs font-black flex items-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-300'
              }`}
            >
              <img src={c.flagUrl} alt={c.countryName} className="w-4 h-3 rounded object-cover" />
              <span>{c.countryName} ({c.countryCode})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-100 dark:bg-slate-700'}`}>
                {c.primaryCurrency}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Node Configuration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* General Node Rules */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 text-xs">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-purple-600" />
            Jurisdiction Profile
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-slate-400 font-bold block mb-1">Regulatory Authority</span>
              <p className="font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {currentConfig.regulatoryAuthority}
              </p>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">Approval Governance Engine</span>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 font-bold">
                {currentConfig.approvalWorkflow}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">Supported Currencies</span>
              <div className="flex flex-wrap gap-1.5">
                {currentConfig.supportedCurrencies.map(curr => (
                  <span key={curr} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-mono font-bold text-purple-600">
                    {curr}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1">Default Settlement Route</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{currentConfig.defaultSettlementMethod}</span>
            </div>

            <div>
              <span className="text-slate-400 font-bold block mb-1.5">Enabled PDP Entity Types</span>
              <div className="space-y-1.5">
                {(['Company', 'Organisation', 'Institution', 'Individual'] as PDPType[]).map(t => {
                  const isEnabled = editingConfig ? editingConfig.enabledPdpTypes.includes(t) : currentConfig.enabledPdpTypes.includes(t);
                  return (
                    <div
                      key={t}
                      onClick={() => editingConfig && togglePdpType(t)}
                      className={`p-2 rounded-xl border flex items-center justify-between ${
                        editingConfig ? 'cursor-pointer' : ''
                      } ${
                        isEnabled ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="font-bold">{t}</span>
                      <span className="text-[10px] font-black uppercase">
                        {isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents Matrix */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Required KYB & Legal Document Matrix ({currentConfig.countryName})
            </h3>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {currentConfig.requiredDocuments.length} Documents Configured
            </span>
          </div>

          <div className="space-y-3">
            {(editingConfig || currentConfig).requiredDocuments.map((doc, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white">{doc.label}</span>
                    <span className="font-mono text-[9px] text-slate-400">({doc.docType})</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{doc.description}</p>
                  <div className="flex gap-1 pt-1">
                    {doc.applicableTypes.map(type => (
                      <span key={type} className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!editingConfig}
                    onClick={() => editingConfig && toggleDocMandatory(doc.docType)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all ${
                      doc.mandatory
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    } ${editingConfig ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                  >
                    {doc.mandatory ? 'Mandatory' : 'Optional'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
