import React, { useState } from 'react';
import { SponsorProject, SponsorOrgType } from './SponsorTypes';
import { X, Upload, FileText, CheckCircle2, Shield } from 'lucide-react';

interface ProjectRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitProject: (newProject: SponsorProject) => void;
}

export const ProjectRegistrationModal: React.FC<ProjectRegistrationModalProps> = ({ isOpen, onClose, onSubmitProject }) => {
  const [title, setTitle] = useState('');
  const [orgName, setOrgName] = useState('FELDA (Federal Land Development Authority)');
  const [orgType, setOrgType] = useState<SponsorOrgType>('FELDA / Plantation & Agriculture');
  const [category, setCategory] = useState<SponsorProject['category']>('Green Energy & Solar');
  const [shariahContract, setShariahContract] = useState<SponsorProject['shariahContract']>('Ijarah (Lease)');
  const [targetFunding, setTargetFunding] = useState('5000000');
  const [expectedYield, setExpectedYield] = useState('8.8% p.a.');
  const [tenureMonths, setTenureMonths] = useState('48');
  const [location, setLocation] = useState('Kuantan, Pahang');
  const [country, setCountry] = useState('Malaysia');
  const [description, setDescription] = useState('');

  const [businessPlanFileName, setBusinessPlanFileName] = useState<string | null>(null);
  const [financialFileName, setFinancialFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    const newProject: SponsorProject = {
      id: `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      orgName,
      orgType,
      category,
      shariahContract,
      targetFunding: parseFloat(targetFunding) || 1000000,
      raisedFunding: 0,
      expectedYield,
      tenureMonths: parseInt(tenureMonths, 10) || 36,
      location,
      country,
      workflowStage: 'Draft',
      healthScore: 100,
      description,
      milestones: [
        { id: 'M1', title: 'Phase 1 Land & Environmental Permits', targetDate: '2026-11-01', completionPct: 0, disbursementAmount: (parseFloat(targetFunding) || 1000000) * 0.3, status: 'Upcoming', shariahSignoff: false, auditorSignoff: false }
      ],
      disbursements: [],
      documents: [
        { id: 'DOC-NEW-1', title: businessPlanFileName || 'Business_Plan_Proposal.pdf', category: 'Business Plan', fileSize: '4.8 MB', uploadDate: '2026-08-04', securityLevel: 'Confidential' },
        { id: 'DOC-NEW-2', title: financialFileName || '5_Year_Financial_Model.xlsx', category: 'Financial Projection', fileSize: '2.3 MB', uploadDate: '2026-08-04', securityLevel: 'Confidential' }
      ],
      team: [
        { id: 'T-DIR', name: 'Project Lead', role: 'Sponsor Lead', qualification: 'MBA / PMP', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' }
      ],
      comms: []
    };

    onSubmitProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Register New Sponsor Project</h3>
            <p className="text-xs text-slate-500">Submit capital project for D-8 Shariah tokenization & investor pooling</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RISDA Sustainable Latex Processing & Green Energy Facility"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sponsoring Organization</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sponsor Entity Type</label>
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as SponsorOrgType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="FELDA / Plantation & Agriculture">FELDA / Plantation & Agriculture</option>
                <option value="FELCRA / Agro-Land Development">FELCRA / Agro-Land Development</option>
                <option value="RISDA / Rubber & Rural Innovation">RISDA / Rubber & Rural Innovation</option>
                <option value="MARA / Entrepreneur Development">MARA / Entrepreneur Development</option>
                <option value="GLC / Sovereign-Backed Enterprise">GLC / Sovereign-Backed Enterprise</option>
                <option value="Cooperative Society (Koperasi)">Cooperative Society (Koperasi)</option>
                <option value="Property & Urban Developer">Property & Urban Developer</option>
                <option value="High-Growth SME">High-Growth SME</option>
                <option value="Impact NGO / Waqf Foundation">Impact NGO / Waqf Foundation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Green Energy & Solar">Green Energy & Solar</option>
                <option value="Agro-Industrial">Agro-Industrial</option>
                <option value="SME Export">SME Export</option>
                <option value="Commercial Real Estate">Commercial Real Estate</option>
                <option value="Social Waqf Housing">Social Waqf Housing</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Shariah Contract Structure</label>
              <select
                value={shariahContract}
                onChange={(e) => setShariahContract(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Ijarah (Lease)">Ijarah (Lease)</option>
                <option value="Mudarabah (Profit Share)">Mudarabah (Profit Share)</option>
                <option value="Musharakah (Partnership)">Musharakah (Partnership)</option>
                <option value="Istisna (Manufacturing)">Istisna (Manufacturing)</option>
                <option value="Murabahah (Cost-Plus)">Murabahah (Cost-Plus)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Funding ($ USD)</label>
              <input
                type="number"
                value={targetFunding}
                onChange={(e) => setTargetFunding(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Yield</label>
              <input
                type="text"
                value={expectedYield}
                onChange={(e) => setExpectedYield(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tenure (Months)</label>
              <input
                type="number"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Project Description & Scope</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide key objective, capital utilization plan, social impact, and asset backing..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-800/50">
              <FileText className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <span className="block font-semibold text-slate-700 dark:text-slate-300">Business Plan Document</span>
              <p className="text-[10px] text-slate-500 mb-2">PDF, DOCX up to 25MB</p>
              <button
                type="button"
                onClick={() => setBusinessPlanFileName('FELDA_Expansion_BusinessPlan_2026.pdf')}
                className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold rounded-lg text-[11px]"
              >
                {businessPlanFileName ? `Uploaded: ${businessPlanFileName}` : 'Simulate Upload'}
              </button>
            </div>

            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-800/50">
              <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
              <span className="block font-semibold text-slate-700 dark:text-slate-300">Financial Projection (5Y)</span>
              <p className="text-[10px] text-slate-500 mb-2">XLSX, CSV up to 25MB</p>
              <button
                type="button"
                onClick={() => setFinancialFileName('Financial_Model_5Yr_IRR.xlsx')}
                className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg text-[11px]"
              >
                {financialFileName ? `Uploaded: ${financialFileName}` : 'Simulate Upload'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> Save as Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
