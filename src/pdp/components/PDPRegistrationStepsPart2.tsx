import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  Download, 
  Trash2, 
  Check, 
  FileSpreadsheet,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { PDPApplication, PDPDocument } from '../pdpTypes';
import { pdpService } from '../pdpService';

interface StepProps {
  formData: Partial<PDPApplication>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<PDPApplication>>>;
  onGoToStep?: (stepIndex: number) => void;
}

// STEP 6: KYB Status Overview
export const Step6KYBStatus: React.FC<StepProps> = ({ formData }) => {
  const steps = [
    { title: 'Identity & Entity Profile', status: formData.organisationName ? 'COMPLETED' : 'PENDING' },
    { title: 'Representative Authorization', status: formData.representative?.fullName ? 'COMPLETED' : 'PENDING' },
    { title: 'Beneficial Ownership (UBO)', status: (formData.beneficialOwners?.length || 0) > 0 ? 'COMPLETED' : 'PENDING' },
    { title: 'Regulatory Document Submissions', status: (formData.documents?.length || 0) > 0 ? 'COMPLETED' : 'IN_PROGRESS' },
    { title: 'Bank Settlement Verification', status: formData.bankInfo?.accountNumber ? 'COMPLETED' : 'PENDING' },
    { title: 'AML / Shariah Compliance Attestation', status: formData.compliance?.amlCftDeclaration ? 'COMPLETED' : 'PENDING' }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">KYB Verification Status Tracker</h4>
        <p className="text-slate-500">Real-time validation of your PDP onboarding dossier.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {steps.map((st, idx) => {
          const isDone = st.status === 'COMPLETED';
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                isDone 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40' 
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-full ${isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 dark:text-white">{st.title}</h5>
                  <span className="text-[10px] text-slate-500">Stage {idx + 1} of 6</span>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {st.status}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-200 dark:border-purple-800 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-purple-600 dark:text-purple-400 shrink-0" />
        <div>
          <h5 className="font-extrabold text-purple-900 dark:text-purple-200">Dual-Key Governance Verification</h5>
          <p className="text-purple-700 dark:text-purple-300 text-[11px] mt-0.5">
            Upon submission, compliance screening (AML/CFT & Sanctions) is executed before Country Admin final authorization.
          </p>
        </div>
      </div>
    </div>
  );
};

// STEP 7: Document Upload (Country & PDP-Type Aware)
export const Step7Documents: React.FC<StepProps> = ({ formData, setFormData }) => {
  const config = pdpService.getCountryConfig(formData.countryCode || 'MYS');
  const requiredList = config?.requiredDocuments || [];
  const currentDocs = formData.documents || [];

  const handleSimulateUpload = (docType: string, label: string) => {
    const fakeFileName = `${docType.toLowerCase()}_${formData.organisationName ? formData.organisationName.replace(/\s+/g, '_') : 'pdp_entity'}_2026.pdf`;
    const newDoc: PDPDocument = {
      id: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      documentType: docType,
      title: fakeFileName,
      fileSize: '2.4 MB',
      uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      fileUrl: `https://mock-d8-storage.org/kyb/${fakeFileName}`,
      status: 'PENDING',
      required: true
    };

    setFormData(prev => {
      const existing = (prev.documents || []).filter(d => d.documentType !== docType);
      return {
        ...prev,
        documents: [...existing, newDoc]
      };
    });
  };

  const handleRemoveDoc = (docId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(d => d.id !== docId)
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">
          Mandatory Regulatory Document Repository ({config?.countryName})
        </h4>
        <p className="text-slate-500">
          Upload official corporate identity, authorizations, and financial verification documents required by {config?.regulatoryAuthority}.
        </p>
      </div>

      <div className="space-y-3">
        {requiredList.map((req, idx) => {
          const uploaded = currentDocs.find(d => d.documentType === req.docType);

          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                uploaded 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">{req.label}</span>
                    {req.mandatory && (
                      <span className="px-2 py-0.5 text-[9px] font-black rounded bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{req.description}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {uploaded ? (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <div className="text-left">
                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 block truncate max-w-[160px]">
                          {uploaded.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">{uploaded.fileSize} • {uploaded.status}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(uploaded.id)}
                        className="text-red-500 hover:text-red-700 p-1 ml-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSimulateUpload(req.docType, req.label)}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload PDF / Scan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// STEP 8: Bank & Settlement Information
export const Step8BankInfo: React.FC<StepProps> = ({ formData, setFormData }) => {
  const [showRawAccount, setShowRawAccount] = useState(false);
  const bank = formData.bankInfo || {
    bankName: '',
    accountHolderName: formData.organisationName || '',
    accountNumber: '',
    swiftBicCode: '',
    currency: 'MYR',
    country: formData.countryName || 'Malaysia',
    settlementMethod: 'Corporate FPX'
  };

  const updateBank = (field: string, value: string) => {
    let masked = value;
    if (field === 'rawAccountNumber') {
      masked = value.length > 4 ? `••••-••••-${value.slice(-4)}` : value;
      setFormData(prev => ({
        ...prev,
        bankInfo: {
          ...(prev.bankInfo || bank),
          rawAccountNumber: value,
          accountNumber: masked
        }
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      bankInfo: {
        ...(prev.bankInfo || bank),
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Bank & Settlement Account Details</h4>
        <p className="text-slate-500">
          Designated commercial account for capital disbursements, pool funding, and profit distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Commercial / Islamic Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Maybank Islamic Berhad / Bank Muamalat"
            value={bank.bankName}
            onChange={e => updateBank('bankName', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Account Holder Name (must match Legal Entity) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. FELDA TECHNOPLANT SDN BHD"
            value={bank.accountHolderName}
            onChange={e => updateBank('accountHolderName', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Account Number / IBAN <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowRawAccount(!showRawAccount)}
              className="text-purple-600 hover:text-purple-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              {showRawAccount ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showRawAccount ? 'Mask Account' : 'Show Account'}</span>
            </button>
          </div>
          <input
            type="text"
            required
            placeholder="e.g. 564128998819"
            value={showRawAccount ? (bank.rawAccountNumber || bank.accountNumber) : (bank.accountNumber || '')}
            onChange={e => updateBank('rawAccountNumber', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            SWIFT / BIC / Clearing Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. MBBEMYKLXXX"
            value={bank.swiftBicCode}
            onChange={e => updateBank('swiftBicCode', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Settlement Method <span className="text-red-500">*</span>
          </label>
          <select
            value={bank.settlementMethod}
            onChange={e => updateBank('settlementMethod', e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="Corporate FPX">Corporate FPX Direct Debit</option>
            <option value="RTGS / Central Wire">RTGS / Central Bank Direct Wire</option>
            <option value="D-8 Cross-Border Clearing">D-8 Cross-Border Clearing Node</option>
            <option value="Digital Treasury Escrow">Digital Treasury Multi-Sig Escrow</option>
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            Settlement Currency
          </label>
          <input
            type="text"
            readOnly
            value={bank.currency}
            className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300"
          />
        </div>
      </div>
    </div>
  );
};

// STEP 9: Compliance & Declarations
export const Step9Compliance: React.FC<StepProps> = ({ formData, setFormData }) => {
  const comp = formData.compliance || {
    amlCftDeclaration: false,
    sourceOfFundsDeclaration: false,
    beneficialOwnershipAccurate: false,
    sanctionsNonMatchDeclared: false,
    regulatoryComplianceAgreed: false,
    shariahComplianceAttested: false,
    termsAndConditionsAccepted: false,
    privacyConsentGranted: false
  };

  const toggleComp = (field: keyof typeof comp) => {
    setFormData(prev => ({
      ...prev,
      compliance: {
        ...(prev.compliance || comp),
        [field]: !comp[field]
      }
    }));
  };

  const allChecked = comp.amlCftDeclaration && comp.sourceOfFundsDeclaration && comp.beneficialOwnershipAccurate &&
    comp.sanctionsNonMatchDeclared && comp.regulatoryComplianceAgreed && comp.shariahComplianceAttested &&
    comp.termsAndConditionsAccepted && comp.privacyConsentGranted;

  const handleSelectAll = () => {
    const nextVal = !allChecked;
    setFormData(prev => ({
      ...prev,
      compliance: {
        amlCftDeclaration: nextVal,
        sourceOfFundsDeclaration: nextVal,
        beneficialOwnershipAccurate: nextVal,
        sanctionsNonMatchDeclared: nextVal,
        regulatoryComplianceAgreed: nextVal,
        shariahComplianceAttested: nextVal,
        termsAndConditionsAccepted: nextVal,
        privacyConsentGranted: nextVal,
        declaredAt: nextVal ? new Date().toISOString().replace('T', ' ').substring(0, 16) : undefined
      }
    }));
  };

  const declarations = [
    {
      key: 'amlCftDeclaration' as const,
      title: 'Anti-Money Laundering & Counter-Terrorism Financing (AML/CFT)',
      desc: 'We certify that the applicant complies with FATF standards and domestic AML/CFT statutory obligations.'
    },
    {
      key: 'sourceOfFundsDeclaration' as const,
      title: 'Legitimate Source of Capital & Assets',
      desc: 'All assets, capital contributions, and underlying projects submitted for tokenization originate from lawful commercial activities.'
    },
    {
      key: 'beneficialOwnershipAccurate' as const,
      title: 'Beneficial Ownership & Controlling Person Disclosure',
      desc: 'All natural persons holding 25% or greater equity or effective operational control have been disclosed.'
    },
    {
      key: 'sanctionsNonMatchDeclared' as const,
      title: 'Global Sanctions & Negative List Clearance',
      desc: 'Neither the entity, its directors, nor beneficial owners appear on UN, OFAC, or national counter-terrorism sanction lists.'
    },
    {
      key: 'shariahComplianceAttested' as const,
      title: 'AAOIFI Shariah Governance & Non-Interest Framework',
      desc: 'We attest that all asset pooling, profit distribution, and lease structures adhere to AAOIFI Shariah standards (no Riba, Gharar, or Maysir).'
    },
    {
      key: 'regulatoryComplianceAgreed' as const,
      title: 'National Regulatory & Central Bank Compliance',
      desc: 'We agree to cooperate with regulatory audits and provide supplementary documentation upon request.'
    },
    {
      key: 'termsAndConditionsAccepted' as const,
      title: 'D-8 Wealth Pooling Platform Operating Terms',
      desc: 'We accept the House of Wealth multi-jurisdiction terms of participation and settlement rules.'
    },
    {
      key: 'privacyConsentGranted' as const,
      title: 'Cross-Border Data Processing & Verification Consent',
      desc: 'We authorize the platform to verify submitted credentials with relevant company registries and credit bureaus.'
    }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white">Compliance, AML & Shariah Attestations</h4>
          <p className="text-slate-500">Legal declarations required for PDP activation across D-8 member nations.</p>
        </div>
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs font-extrabold text-purple-600 hover:text-purple-700 cursor-pointer"
        >
          {allChecked ? 'Unselect All' : 'Select All Declarations'}
        </button>
      </div>

      <div className="space-y-2.5">
        {declarations.map((d, idx) => {
          const isChecked = comp[d.key];
          return (
            <div
              key={idx}
              onClick={() => toggleComp(d.key)}
              className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                isChecked 
                  ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/60' 
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => {}} // Handled by parent div
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="flex-1">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">{d.title}</h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{d.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// STEP 10: Review & Submit
export const Step10ReviewSubmit: React.FC<StepProps> = ({ formData, onGoToStep }) => {
  return (
    <div className="space-y-5 animate-fadeIn text-xs">
      <div>
        <h4 className="text-sm font-black text-slate-900 dark:text-white">Review PDP Application Dossier</h4>
        <p className="text-slate-500">Verify all information before final submission for compliance review.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Entity Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-purple-600" />
              Organisation & Entity
            </span>
            {onGoToStep && (
              <button onClick={() => onGoToStep(2)} className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">{formData.organisationName || 'Not Provided'}</p>
          <div className="text-slate-500 space-y-0.5 text-[11px]">
            <p>Type: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.pdpType}</span></p>
            <p>Reg No: <span className="font-mono text-slate-700 dark:text-slate-300">{formData.registrationNumber}</span></p>
            <p>Node: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.countryName} ({formData.countryCode})</span></p>
            <p>Category: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.businessCategory}</span></p>
          </div>
        </div>

        {/* Representative Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Authorised Signatory
            </span>
            {onGoToStep && (
              <button onClick={() => onGoToStep(3)} className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">{formData.representative?.fullName || 'Not Provided'}</p>
          <div className="text-slate-500 space-y-0.5 text-[11px]">
            <p>Position: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.representative?.position}</span></p>
            <p>ID/Passport: <span className="font-mono text-slate-700 dark:text-slate-300">{formData.representative?.idPassportNumber}</span></p>
            <p>Email: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.representative?.email}</span></p>
            <p>Phone: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.representative?.mobile}</span></p>
          </div>
        </div>

        {/* Bank & Settlement Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Settlement Account
            </span>
            {onGoToStep && (
              <button onClick={() => onGoToStep(7)} className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">{formData.bankInfo?.bankName || 'Not Provided'}</p>
          <div className="text-slate-500 space-y-0.5 text-[11px]">
            <p>Holder: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.bankInfo?.accountHolderName}</span></p>
            <p>Account: <span className="font-mono text-slate-700 dark:text-slate-300">{formData.bankInfo?.accountNumber}</span></p>
            <p>Method: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.bankInfo?.settlementMethod}</span></p>
            <p>Currency: <span className="font-bold text-purple-600">{formData.bankInfo?.currency}</span></p>
          </div>
        </div>

        {/* Documents & Compliance Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              Documents & Compliance
            </span>
            {onGoToStep && (
              <button onClick={() => onGoToStep(6)} className="text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            )}
          </div>
          <p className="font-extrabold text-sm text-emerald-600">{formData.documents?.length || 0} Documents Uploaded</p>
          <div className="text-slate-500 space-y-0.5 text-[11px]">
            <p>UBOs Disclosed: <span className="font-bold text-slate-700 dark:text-slate-300">{formData.beneficialOwners?.length || 0} Individual(s)</span></p>
            <p>AML/CFT Declaration: <span className="font-bold text-emerald-600">✓ Declared</span></p>
            <p>AAOIFI Shariah: <span className="font-bold text-emerald-600">✓ Certified</span></p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-purple-600 text-white rounded-2xl shadow-md">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <h5 className="font-black text-sm">Ready for Regulatory Review</h5>
            <p className="text-xs text-purple-100 mt-0.5">
              By clicking "Submit for Compliance Approval", your dossier will be routed to the {formData.countryName} Country Compliance Office for dual-key verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
