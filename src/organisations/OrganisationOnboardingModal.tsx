import React, { useState } from 'react';
import { Building2, X, Check, FileUp, ArrowRight, ArrowLeft } from 'lucide-react';
import { OrganisationType, OrganisationOnboardingPayload } from './organisationTypes';
import { organisationService } from './organisationService';
import { countryNodeService } from '../countryNodes/countryNodeService';
import { useRBAC } from '../rbac/RBACContext';

interface OrganisationOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOnboarded: () => void;
}

export const OrganisationOnboardingModal: React.FC<OrganisationOnboardingModalProps> = ({
  isOpen,
  onClose,
  onOnboarded
}) => {
  const { currentUserId } = useRBAC();
  const [step, setStep] = useState<number>(1);

  const [legalName, setLegalName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [organisationType, setOrganisationType] = useState<OrganisationType>('Government-Linked Company');
  const [countryNodeId, setCountryNodeId] = useState('CN-MYS');
  const [industry, setIndustry] = useState('Infrastructure & Energy');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPersonTitle, setContactPersonTitle] = useState('');
  const [submittedDocName, setSubmittedDocName] = useState('Certificate_of_Incorporation_KYB.pdf');

  const nodes = countryNodeService.getAllCountryNodes();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: OrganisationOnboardingPayload = {
      legalName,
      displayName: legalName,
      registrationNumber,
      organisationType,
      countryNodeId,
      industry,
      description,
      address,
      contactEmail,
      contactPhone,
      contactPersonName,
      contactPersonTitle,
      documents: [
        {
          title: submittedDocName,
          documentType: 'Certificate of Incorporation',
          fileUrl: 'https://example.com/kyb_doc.pdf'
        }
      ]
    };

    organisationService.createOrganisation(payload, currentUserId || 'SYS-ADMIN-01');
    onOnboarded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">Organisation Registration & KYB</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">
          <span className={step >= 1 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>1. Legal Profile</span>
          <span>→</span>
          <span className={step >= 2 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>2. Jurisdiction & Type</span>
          <span>→</span>
          <span className={step >= 3 ? 'font-bold text-purple-600 dark:text-purple-400' : ''}>3. Review & Submit</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Organisation Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FELDA Global Investment Corp"
                  value={legalName}
                  onChange={e => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Registration Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MY-REG-2024-998"
                    value={registrationNumber}
                    onChange={e => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Industry Sector</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smart Agritech & Energy"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Corporate Office Address</label>
                <input
                  type="text"
                  required
                  placeholder="Full office address"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Country Operating Node</label>
                  <select
                    value={countryNodeId}
                    onChange={e => setCountryNodeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {nodes.map(n => (
                      <option key={n.countryNodeId} value={n.countryNodeId}>
                        {n.countryName} ({n.countryNodeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Organisation Type</label>
                  <select
                    value={organisationType}
                    onChange={e => setOrganisationType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="Government">Government</option>
                    <option value="Government-Linked Company">Government-Linked Company</option>
                    <option value="Corporation">Corporation</option>
                    <option value="Project Sponsor / Delivery Partner">Project Sponsor / Delivery Partner</option>
                    <option value="Financial Institution">Financial Institution</option>
                    <option value="Investment Fund">Investment Fund</option>
                    <option value="Family Office">Family Office</option>
                    <option value="Cooperative">Cooperative</option>
                    <option value="Islamic Institution">Islamic Institution</option>
                    <option value="Asset Manager">Asset Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    required
                    placeholder="corporate@domain.com"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+60 3 0000 0000"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 text-[11px] text-purple-700 dark:text-purple-300">
                📄 Simulated Document Attachment: <strong>{submittedDocName}</strong>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mb-2">Confirm Registration Details</h4>
              <p><strong>Legal Name:</strong> {legalName || 'N/A'}</p>
              <p><strong>Registration Number:</strong> {registrationNumber || 'N/A'}</p>
              <p><strong>Type & Node:</strong> {organisationType} ({countryNodeId})</p>
              <p><strong>Contact Email:</strong> {contactEmail || 'N/A'}</p>
              <p className="text-[10px] text-slate-400 mt-2">
                Upon submission, organisation will enter <strong className="text-purple-600">PENDING / UNDER_REVIEW</strong> verification status.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Submit KYB Registration</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
