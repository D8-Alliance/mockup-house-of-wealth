import React, { useState } from 'react';
import { X, Send, Save, Building2, Coins, Calendar, FileText, Shield, AlertTriangle } from 'lucide-react';
import { projectService } from './projectService';
import { Project, ProjectSector, RiskLevel } from './projectTypes';
import { useRBAC } from '../rbac/RBACContext';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { activeUser, currentRole } = useRBAC();
  const [activeStep, setActiveStep] = useState<number>(1);

  const [projectName, setProjectName] = useState('');
  const [sector, setSector] = useState<ProjectSector>('Agriculture & Plantation');
  const [category, setCategory] = useState('Agro-Industrial');
  const [location, setLocation] = useState('Kuala Lumpur, Malaysia');
  const [currency, setCurrency] = useState('USD');
  const [totalProjectCost, setTotalProjectCost] = useState(10000000);
  const [sponsorContribution, setSponsorContribution] = useState(2000000);
  const [fundingRequired, setFundingRequired] = useState(8000000);
  const [minimumFunding, setMinimumFunding] = useState(5000000);
  const [maximumFunding, setMaximumFunding] = useState(10000000);
  const [projectDurationMonths, setProjectDurationMonths] = useState(60);
  const [indicativeExpectedReturn, setIndicativeExpectedReturn] = useState(8.5);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Medium');
  const [description, setDescription] = useState('');
  const [businessModelSummary, setBusinessModelSummary] = useState('');
  const [proposedShariahContract, setProposedShariahContract] = useState<'Mudarabah' | 'Musharakah' | 'Wakalah' | 'Ijarah' | 'Murabahah'>('Mudarabah');

  if (!isOpen) return null;

  const handleSubmit = (isSubmit: boolean) => {
    const created = projectService.createProject({
      projectName: projectName || 'Untitled Agriculture Venture',
      sector,
      category,
      location,
      currency,
      totalProjectCost,
      sponsorContribution,
      fundingRequired,
      minimumFunding,
      maximumFunding,
      projectDurationMonths,
      indicativeExpectedReturn,
      riskLevel,
      description,
      businessModelSummary,
      proposedShariahContract,
      organisationId: activeUser.organisationId || 'ORG-FELDA-MYS',
      countryNodeId: activeUser.countryNodeId || 'CN-MYS',
      projectSponsorName: activeUser.name,
      status: isSubmit ? 'SUBMITTED' : 'DRAFT'
    }, activeUser.id, currentRole);

    if (isSubmit) {
      projectService.updateProjectStatus(created.projectId, 'SUBMITTED', activeUser.id, currentRole, 'Initial submission by Project Sponsor / PDP.');
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-600">
              PROJECT SPONSOR / PDP PORTAL
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">Initiate Project Proposal</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 text-xs font-extrabold">
          <button onClick={() => setActiveStep(1)} className={`px-3 py-1.5 rounded-xl ${activeStep === 1 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            1. Basic & Financials
          </button>
          <button onClick={() => setActiveStep(2)} className={`px-3 py-1.5 rounded-xl ${activeStep === 2 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            2. Shariah & Business
          </button>
          <button onClick={() => setActiveStep(3)} className={`px-3 py-1.5 rounded-xl ${activeStep === 3 ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>
            3. Review & Submit
          </button>
        </div>

        {activeStep === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="e.g., FELDA Agri-Smart Plantation Expansion"
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sector</label>
                <select
                  value={sector}
                  onChange={e => setSector(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Agriculture & Plantation">Agriculture & Plantation</option>
                  <option value="Green Energy & Solar">Green Energy & Solar</option>
                  <option value="Property & Urban Development">Property & Urban Development</option>
                  <option value="SME & Trade Finance">SME & Trade Finance</option>
                  <option value="Agri-Tech & Logistics">Agri-Tech & Logistics</option>
                  <option value="Social Waqf Housing">Social Waqf Housing</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (₨)</option>
                  <option value="MYR">MYR (RM)</option>
                  <option value="TRY">TRY (₺)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="NGN">NGN (₦)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Cost</label>
                <input
                  type="number"
                  value={totalProjectCost}
                  onChange={e => setTotalProjectCost(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sponsor Contribution</label>
                <input
                  type="number"
                  value={sponsorContribution}
                  onChange={e => setSponsorContribution(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Funding Required</label>
                <input
                  type="number"
                  value={fundingRequired}
                  onChange={e => setFundingRequired(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Proposed Islamic Contract Structure</label>
              <select
                value={proposedShariahContract}
                onChange={e => setProposedShariahContract(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-purple-600"
              >
                <option value="Mudarabah">Mudarabah (Profit Sharing)</option>
                <option value="Musharakah">Musharakah (Partnership Equity)</option>
                <option value="Wakalah">Wakalah (Agency Management)</option>
                <option value="Ijarah">Ijarah (Lease Back Asset)</option>
                <option value="Murabahah">Murabahah (Cost-Plus Trade)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Indicative Expected Return (% p.a.)</label>
              <input
                type="number"
                step="0.1"
                value={indicativeExpectedReturn}
                onChange={e => setIndicativeExpectedReturn(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
              <span className="text-[10px] text-amber-600 font-bold mt-1 block">
                * Note: Returns are indicative projections for review purposes only and must not be represented as guaranteed returns.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Business & Revenue Model Summary</label>
              <textarea
                rows={3}
                value={businessModelSummary}
                onChange={e => setBusinessModelSummary(e.target.value)}
                placeholder="Describe how revenue is generated and distributed under Shariah rules..."
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
              <h3 className="font-black text-purple-900 dark:text-purple-200 text-sm">Proposal Summary Review</h3>
              <p className="text-slate-600 dark:text-slate-300">Project: <strong>{projectName || 'Agri Venture'}</strong></p>
              <p className="text-slate-600 dark:text-slate-300">Required Capital: <strong>${fundingRequired.toLocaleString()} {currency}</strong></p>
              <p className="text-slate-600 dark:text-slate-300">Shariah Contract: <strong>{proposedShariahContract}</strong></p>
              <p className="text-slate-600 dark:text-slate-300">Sponsor Organisation: <strong>{activeUser.organizationName || 'FELDA'}</strong></p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between items-center pt-2">
          {activeStep > 1 ? (
            <button
              onClick={() => setActiveStep(prev => prev - 1)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-700"
            >
              Previous
            </button>
          ) : <div />}

          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>

            {activeStep < 3 ? (
              <button
                onClick={() => setActiveStep(prev => prev + 1)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
