import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Shield, 
  Building2, 
  UserCheck, 
  FileText, 
  CreditCard, 
  Lock, 
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { PDPApplication } from '../pdpTypes';
import { pdpService } from '../pdpService';
import { useRBAC } from '../../rbac/RBACContext';
import { 
  Step1Credentials, 
  Step2PDPType, 
  Step3OrgInfo, 
  Step4Representative, 
  Step5BeneficialOwners 
} from './PDPRegistrationSteps';
import { 
  Step6KYBStatus, 
  Step7Documents, 
  Step8BankInfo, 
  Step9Compliance, 
  Step10ReviewSubmit 
} from './PDPRegistrationStepsPart2';

interface PDPRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: (app: PDPApplication) => void;
  initialData?: Partial<PDPApplication>;
}

const STEP_TITLES = [
  '1. Credentials & Country',
  '2. Entity Type',
  '3. Organisation Info',
  '4. Authorised Rep',
  '5. Beneficial Owners',
  '6. KYB Tracker',
  '7. Upload Documents',
  '8. Bank & Settlement',
  '9. Compliance & Shariah',
  '10. Review & Submit'
];

export const PDPRegistrationModal: React.FC<PDPRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmitted,
  initialData
}) => {
  const { currentUserId, currentRole } = useRBAC();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<Partial<PDPApplication>>({
    countryCode: 'MYS',
    countryName: 'Malaysia',
    preferredLanguage: 'English',
    pdpType: 'Company',
    organisationName: '',
    tradingName: '',
    registrationNumber: '',
    registeredAddress: '',
    businessAddress: '',
    contactPhone: '',
    website: '',
    businessCategory: 'Agri-Industrial & Clean Tech Infrastructure',
    dateOfIncorporation: '2020-01-01',
    taxIdentificationNumber: '',
    representative: {
      id: 'REP-01',
      fullName: '',
      nationality: 'Malaysian',
      idPassportNumber: '',
      position: '',
      email: '',
      mobile: ''
    },
    beneficialOwners: [],
    documents: [],
    bankInfo: {
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      rawAccountNumber: '',
      swiftBicCode: '',
      currency: 'MYR',
      country: 'Malaysia',
      settlementMethod: 'Corporate FPX'
    },
    compliance: {
      amlCftDeclaration: false,
      sourceOfFundsDeclaration: false,
      beneficialOwnershipAccurate: false,
      sanctionsNonMatchDeclared: false,
      regulatoryComplianceAgreed: false,
      shariahComplianceAttested: false,
      termsAndConditionsAccepted: false,
      privacyConsentGranted: false
    },
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSaveDraft = () => {
    const saved = pdpService.createOrSaveDraft(formData, currentUserId || 'USR-8821', currentRole);
    setFormData(saved);
  };

  const handleNext = () => {
    if (currentStep < 10) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = pdpService.createOrSaveDraft(formData, currentUserId || 'USR-8821', currentRole);
    const submitted = pdpService.submitApplication(saved.id, currentUserId || 'USR-8821', currentRole);
    if (submitted) {
      if (onSubmitted) onSubmitted(submitted);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white">
                  PDP ONBOARDING
                </span>
                <span className="text-xs text-slate-400 font-mono">D-8 Wealth Pooling Platform</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                Pool / Project Data Provider (PDP) Registration Wizard
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-purple-600 dark:text-purple-400">
              {STEP_TITLES[currentStep - 1]}
            </span>
            <span className="text-slate-400 font-bold">
              Step {currentStep} of 10 ({Math.round((currentStep / 10) * 100)}%)
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 10) * 100}%` }}
            />
          </div>

          {/* Step Pills Navigator */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {STEP_TITLES.map((t, idx) => {
              const stepNum = idx + 1;
              const isPast = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentStep(stepNum)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-purple-600 text-white shadow-sm'
                      : isPast
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {stepNum}. {t.split('. ')[1]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Step Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[55vh]">
            {currentStep === 1 && <Step1Credentials formData={formData} setFormData={setFormData} />}
            {currentStep === 2 && <Step2PDPType formData={formData} setFormData={setFormData} />}
            {currentStep === 3 && <Step3OrgInfo formData={formData} setFormData={setFormData} />}
            {currentStep === 4 && <Step4Representative formData={formData} setFormData={setFormData} />}
            {currentStep === 5 && <Step5BeneficialOwners formData={formData} setFormData={setFormData} />}
            {currentStep === 6 && <Step6KYBStatus formData={formData} setFormData={setFormData} />}
            {currentStep === 7 && <Step7Documents formData={formData} setFormData={setFormData} />}
            {currentStep === 8 && <Step8BankInfo formData={formData} setFormData={setFormData} />}
            {currentStep === 9 && <Step9Compliance formData={formData} setFormData={setFormData} />}
            {currentStep === 10 && <Step10ReviewSubmit formData={formData} setFormData={setFormData} onGoToStep={(s) => setCurrentStep(s)} />}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors w-full sm:w-auto"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
              )}

              {currentStep < 10 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all w-full sm:w-auto"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit for Compliance Approval</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
