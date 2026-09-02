import React from 'react';
import { 
  Building2, 
  User, 
  Users, 
  ShieldCheck, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Upload, 
  AlertCircle, 
  Eye, 
  Lock, 
  Globe, 
  Info,
  Building,
  Landmark,
  FileSpreadsheet
} from 'lucide-react';
import { PDPApplication, PDPType, BeneficialOwner, PDPDocument } from '../pdpTypes';
import { pdpService } from '../pdpService';

interface StepProps {
  formData: Partial<PDPApplication>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<PDPApplication>>>;
  onGoToStep?: (stepIndex: number) => void;
}

// STEP 1: Registration Credentials & Country
export const Step1Credentials: React.FC<StepProps> = ({ formData, setFormData }) => {
  const countryConfigs = pdpService.getAllCountryConfigs();
  const selectedConfig = pdpService.getCountryConfig(formData.countryCode || 'MYS');

  const handleCountryChange = (code: string) => {
    const config = pdpService.getCountryConfig(code);
    setFormData(prev => ({
      ...prev,
      countryCode: code,
      countryName: config?.countryName || '',
      preferredLanguage: config?.supportedLanguages[0] || 'English',
      bankInfo: {
        ...(prev.bankInfo || {
          bankName: '',
          accountHolderName: '',
          accountNumber: '',
          swiftBicCode: '',
          settlementMethod: 'Corporate FPX'
        }),
        currency: config?.primaryCurrency || 'MYR',
        country: config?.countryName || 'Malaysia',
        settlementMethod: (config?.defaultSettlementMethod as any) || 'Corporate FPX'
      }
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/40">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-purple-900 dark:text-purple-200 uppercase tracking-wider">
              D-8 Sovereign Node Registration
            </h4>
            <p className="text-xs text-purple-800 dark:text-purple-300 mt-0.5">
              Select your primary country node. Regulatory requirements, legal entity types, and required verification documents will adapt automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Country Node <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.countryCode || 'MYS'}
            onChange={e => handleCountryChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {countryConfigs.map(c => (
              <option key={c.countryCode} value={c.countryCode}>
                {c.countryName} ({c.countryCode}) — {c.primaryCurrency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Preferred Interface Language
          </label>
          <select
            value={formData.preferredLanguage || 'English'}
            onChange={e => setFormData(prev => ({ ...prev, preferredLanguage: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            {selectedConfig?.supportedLanguages.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Official Corporate Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="originator@enterprise.com"
            value={formData.userEmail || ''}
            onChange={e => setFormData(prev => ({ ...prev, userEmail: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mobile Telephone / WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+60 12 345 6789"
            value={formData.userMobile || ''}
            onChange={e => setFormData(prev => ({ ...prev, userMobile: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Jurisdiction Regulatory Profile:</span>
        <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
          {selectedConfig?.regulatoryAuthority}
        </p>
      </div>
    </div>
  );
};

// STEP 2: PDP Type Selection
export const Step2PDPType: React.FC<StepProps> = ({ formData, setFormData }) => {
  const selectedConfig = pdpService.getCountryConfig(formData.countryCode || 'MYS');
  const allowedTypes: PDPType[] = selectedConfig?.enabledPdpTypes || ['Company', 'Organisation', 'Institution'];

  const typeOptions: { type: PDPType; title: string; desc: string; icon: any }[] = [
    {
      type: 'Company',
      title: 'Private / Public Limited Company (Sdn Bhd / PT / A.Ş. / Ltd / Plc)',
      desc: 'Incorporated corporate enterprise with audited financial track record seeking asset tokenization or project pooling.',
      icon: Building2
    },
    {
      type: 'Organisation',
      title: 'Statutory Body / Cooperative / State Agency (GLC / FELDA / RISDA)',
      desc: 'Government-linked statutory authority, agricultural agency, or registered apex cooperative society.',
      icon: Landmark
    },
    {
      type: 'Institution',
      title: 'Financial Institution / Fund Manager / Waqf Foundation',
      desc: 'Licensed capital market intermediary, asset manager, or institutional Islamic endowment foundation.',
      icon: Building
    },
    {
      type: 'Individual',
      title: 'Accredited Project Originator / Sole Proprietor',
      desc: 'Individual high-net-worth project developer or registered sole trader with verified track record.',
      icon: User
    }
  ];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Select PDP Entity Classification</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Select the legal category corresponding to your establishment in {formData.countryName || 'the selected node'}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {typeOptions.map(opt => {
          const isSelected = formData.pdpType === opt.type;
          const isAllowed = allowedTypes.includes(opt.type);
          const Icon = opt.icon;

          return (
            <div
              key={opt.type}
              onClick={() => {
                if (isAllowed) {
                  setFormData(prev => ({ ...prev, pdpType: opt.type }));
                }
              }}
              className={`p-4 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                !isAllowed 
                  ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                  : isSelected
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm cursor-pointer'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-300 cursor-pointer'
              }`}
            >
              <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">{opt.title}</h5>
                  {isSelected && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {opt.desc}
                </p>
                {!isAllowed && (
                  <span className="text-[10px] font-bold text-amber-600 mt-1 block">
                    Not currently enabled for {formData.countryName} node
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// STEP 3: Organisation Information
export const Step3OrgInfo: React.FC<StepProps> = ({ formData, setFormData }) => {
  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Organisation & Legal Profile</h4>
        <p className="text-slate-500">Provide official registered details as recorded with your national registrar.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Official Legal Entity Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. FELDA Technoplant Sdn Bhd"
            value={formData.organisationName || ''}
            onChange={e => setFormData(prev => ({ ...prev, organisationName: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Trading / Brand Name (if different)
          </label>
          <input
            type="text"
            placeholder="e.g. FELDA Agri Solutions"
            value={formData.tradingName || ''}
            onChange={e => setFormData(prev => ({ ...prev, tradingName: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Company / Statutory Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MY-SSM-197701004523"
            value={formData.registrationNumber || ''}
            onChange={e => setFormData(prev => ({ ...prev, registrationNumber: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Business / Industry Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.businessCategory || 'Agri-Industrial & Clean Tech Infrastructure'}
            onChange={e => setFormData(prev => ({ ...prev, businessCategory: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="Agri-Industrial & Clean Tech Infrastructure">Agri-Industrial & Clean Tech Infrastructure</option>
            <option value="Green Energy & Solar Utilities">Green Energy & Solar Utilities</option>
            <option value="Maritime Freight & Logistics Infrastructure">Maritime Freight & Logistics Infrastructure</option>
            <option value="Halal Food Processing & Export Syndication">Halal Food Processing & Export Syndication</option>
            <option value="Commercial Real Estate & Waqf Development">Commercial Real Estate & Waqf Development</option>
            <option value="SME Manufacturing & Trade Finance">SME Manufacturing & Trade Finance</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Date of Incorporation / Establishment
          </label>
          <input
            type="date"
            value={formData.dateOfIncorporation || '2020-01-01'}
            onChange={e => setFormData(prev => ({ ...prev, dateOfIncorporation: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Registered Legal Address <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            required
            placeholder="Official registered office address as per government filing"
            value={formData.registeredAddress || ''}
            onChange={e => setFormData(prev => ({ ...prev, registeredAddress: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Principal Operating / Business Address (if different)
          </label>
          <textarea
            rows={2}
            placeholder="Operating plant, logistics facility, or corporate headquarters"
            value={formData.businessAddress || ''}
            onChange={e => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Tax Identification Number (TIN / NPWP / VKN) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MY-TIN-C8819201948"
            value={formData.taxIdentificationNumber || ''}
            onChange={e => setFormData(prev => ({ ...prev, taxIdentificationNumber: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Corporate Website URL
          </label>
          <input
            type="url"
            placeholder="https://www.company.com"
            value={formData.website || ''}
            onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

// STEP 4: Authorised Representative
export const Step4Representative: React.FC<StepProps> = ({ formData, setFormData }) => {
  const rep = formData.representative || {
    id: 'REP-01',
    fullName: '',
    nationality: 'Malaysian',
    idPassportNumber: '',
    position: '',
    email: '',
    mobile: ''
  };

  const updateRep = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      representative: {
        ...(prev.representative || rep),
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Authorised Representative Information</h4>
        <p className="text-slate-500">Designated officer empowered by board resolution or power of attorney to manage the PDP portal.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Full Legal Name (as per Passport / National ID) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Tan Sri Azman Hashim"
            value={rep.fullName}
            onChange={e => updateRep('fullName', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Nationality <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Malaysian"
            value={rep.nationality}
            onChange={e => updateRep('nationality', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            National ID / Passport Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 680412-10-5593 or A8891024"
            value={rep.idPassportNumber}
            onChange={e => updateRep('idPassportNumber', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Executive Position / Job Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Managing Director / CEO / Head of Treasury"
            value={rep.position}
            onChange={e => updateRep('position', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Direct Business Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="rep.name@company.com"
            value={rep.email}
            onChange={e => updateRep('email', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Direct Mobile / Telephone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            required
            placeholder="+60 12 345 6789"
            value={rep.mobile}
            onChange={e => updateRep('mobile', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>
    </div>
  );
};

// STEP 5: Beneficial Owners (UBO)
export const Step5BeneficialOwners: React.FC<StepProps> = ({ formData, setFormData }) => {
  const ubos: BeneficialOwner[] = formData.beneficialOwners || [];

  const handleAddUBO = () => {
    const newUbo: BeneficialOwner = {
      id: `UBO-${Date.now()}`,
      fullName: '',
      nationality: formData.countryName || 'Malaysian',
      idNumber: '',
      ownershipPercentage: ubos.length === 0 ? 100 : 0,
      isDirector: true,
      isAuthorisedSignatory: true,
      pepStatus: false
    };
    setFormData(prev => ({ ...prev, beneficialOwners: [...(prev.beneficialOwners || []), newUbo] }));
  };

  const handleRemoveUBO = (id: string) => {
    setFormData(prev => ({ ...prev, beneficialOwners: (prev.beneficialOwners || []).filter(u => u.id !== id) }));
  };

  const handleUpdateUBO = (id: string, field: keyof BeneficialOwner, value: any) => {
    setFormData(prev => ({
      ...prev,
      beneficialOwners: (prev.beneficialOwners || []).map(u => u.id === id ? { ...u, [field]: value } : u)
    }));
  };

  const totalPercentage = ubos.reduce((sum, u) => sum + (Number(u.ownershipPercentage) || 0), 0);

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Ultimate Beneficial Ownership (UBO)</h4>
          <p className="text-slate-500">
            Disclose all individuals or corporate parents holding 25% or greater equity or effective control.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddUBO}
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Owner</span>
        </button>
      </div>

      {ubos.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300">No Beneficial Owners Added</p>
          <p className="text-[11px] text-slate-500 mt-1">Please add at least one ultimate beneficial owner or holding entity.</p>
          <button
            type="button"
            onClick={handleAddUBO}
            className="mt-3 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First UBO
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {ubos.map((ubo, idx) => (
            <div key={ubo.id} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <span className="font-extrabold text-xs text-purple-600 dark:text-purple-400">
                  Owner #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveUBO(ubo.id)}
                  className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name / Entity Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tan Sri Azman Hashim / FELDA"
                    value={ubo.fullName}
                    onChange={e => handleUpdateUBO(ubo.id, 'fullName', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Equity Ownership %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={ubo.ownershipPercentage}
                    onChange={e => handleUpdateUBO(ubo.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">Nationality / Domicile</label>
                  <input
                    type="text"
                    value={ubo.nationality}
                    onChange={e => handleUpdateUBO(ubo.id, 'nationality', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-400 mb-1">ID / Passport / Reg No</label>
                  <input
                    type="text"
                    placeholder="680412-10-5593"
                    value={ubo.idNumber}
                    onChange={e => handleUpdateUBO(ubo.id, 'idNumber', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={ubo.isDirector}
                      onChange={e => handleUpdateUBO(ubo.id, 'isDirector', e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Director</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={ubo.isAuthorisedSignatory}
                      onChange={e => handleUpdateUBO(ubo.id, 'isAuthorisedSignatory', e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Signatory</span>
                  </label>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
            <span className="font-bold text-slate-700 dark:text-slate-300">Total Declared Ownership:</span>
            <span className={`font-black text-sm ${totalPercentage === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {totalPercentage}% {totalPercentage === 100 ? '✓ (Complete)' : '(Recommended: 100%)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
