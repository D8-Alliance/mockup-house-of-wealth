import React, { useEffect, useState } from 'react';
import { SPONSOR_ENTITY_TYPES, SponsorProject, SponsorOrgType } from './SponsorTypes';
import { X, Upload, FileText, CheckCircle2, Shield } from 'lucide-react';

interface ProjectRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitProject: (newProject: SponsorProject, documents: { businessPlan?: File; financialProjection?: File }) => void | Promise<void>;
  /** The signed-in user's organisation, filled in as the sponsoring organisation. */
  defaultOrgName?: string;
  /** A draft project being corrected; the form opens with its details. */
  editing?: SponsorProject | null;
  /** The currency of the project's country; the target funding is entered in it. */
  currency?: string;
}

export const ProjectRegistrationModal: React.FC<ProjectRegistrationModalProps> = ({ isOpen, onClose, onSubmitProject, defaultOrgName = '', editing = null, currency = 'MYR' }) => {
  const [title, setTitle] = useState('');
  const [orgName, setOrgName] = useState(defaultOrgName);
  useEffect(() => { if (defaultOrgName) setOrgName((current) => current || defaultOrgName); }, [defaultOrgName]);
  // No default: the sponsor picks its own entity type, so nobody is registered as FELDA by mistake.
  const [orgType, setOrgType] = useState<SponsorOrgType>('');
  const [category, setCategory] = useState<SponsorProject['category']>('Green Energy & Solar');
  const [shariahContract, setShariahContract] = useState<SponsorProject['shariahContract']>('Ijarah (Lease)');
  const [targetFunding, setTargetFunding] = useState('5000000');
  // Blank until the sponsor fills them: a sample figure left in place would be saved as the project's own.
  const [expectedYield, setExpectedYield] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('Malaysia');
  const [description, setDescription] = useState('');

  const [businessPlanFile, setBusinessPlanFile] = useState<File | null>(null);
  const [financialProjectionFile, setFinancialProjectionFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing a draft: start from its saved details.
  useEffect(() => {
    if (!isOpen || !editing) return;
    setTitle(editing.title);
    setOrgType(editing.orgType);
    setCategory(editing.category);
    setShariahContract(editing.shariahContract);
    setTargetFunding(String(editing.targetFunding || ''));
    setDescription(editing.description);
    const savedYield = parseFloat(editing.expectedYield);
    setExpectedYield(Number.isFinite(savedYield) ? String(savedYield) : '');
    setTenureMonths(editing.tenureMonths > 0 ? String(editing.tenureMonths) : '');
    setLocation(editing.location && editing.location !== editing.country ? editing.location : '');
    setSubmitError('');
  }, [isOpen, editing]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setSubmitError('');
    setIsSubmitting(true);

    const newProject: SponsorProject = {
      id: editing?.id ?? `PRJ-${Math.floor(1000 + Math.random() * 9000)}`,
      title,
      orgName,
      orgType,
      category,
      shariahContract,
      targetFunding: parseFloat(targetFunding) || 1000000,
      raisedFunding: 0,
      expectedYield: expectedYield ? `${expectedYield}% p.a.` : 'Pending assessment',
      tenureMonths: parseInt(tenureMonths, 10) || 0,
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
        { id: 'DOC-NEW-1', title: businessPlanFile?.name || 'Business_Plan_Proposal.pdf', category: 'Business Plan', fileSize: businessPlanFile ? `${(businessPlanFile.size / 1024 / 1024).toFixed(1)} MB` : 'Not uploaded', uploadDate: '2026-08-04', securityLevel: 'Confidential' },
        { id: 'DOC-NEW-2', title: financialProjectionFile?.name || '5_Year_Financial_Model.xlsx', category: 'Financial Projection', fileSize: financialProjectionFile ? `${(financialProjectionFile.size / 1024 / 1024).toFixed(1)} MB` : 'Not uploaded', uploadDate: '2026-08-04', securityLevel: 'Confidential' }
      ],
      team: [
        { id: 'T-DIR', name: 'Project Lead', role: 'Sponsor Lead', qualification: 'MBA / PMP', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' }
      ],
      comms: []
    };

    try {
      await onSubmitProject(newProject, { businessPlan: businessPlanFile || undefined, financialProjection: financialProjectionFile || undefined });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save the project.');
    } finally {
      setIsSubmitting(false);
    }
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Edit Draft Project' : 'Register New Sponsor Project'}</h3>
            <p className="text-xs text-slate-500">{editing ? 'Correct the details while the project is a draft. Changes are recorded in the audit trail.' : 'Submit capital project for D-8 Shariah tokenization & investor pooling'}</p>
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
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">Choose your entity type…</option>
                {SPONSOR_ENTITY_TYPES.map((entityType) => <option key={entityType} value={entityType}>{entityType}</option>)}
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
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Funding ({currency === 'MYR' ? 'RM' : currency})</label>
              <input
                type="number"
                value={targetFunding}
                onChange={(e) => setTargetFunding(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Expected Yield (% a year)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 8.5"
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
                min="1"
                max="600"
                placeholder="e.g. 48"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kuantan, Pahang"
              maxLength={200}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
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

          {!editing && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-800/50">
              <FileText className="w-5 h-5 mx-auto text-amber-500 mb-1" />
              <span className="block font-semibold text-slate-700 dark:text-slate-300">Business Plan Document</span>
              <p className="text-[10px] text-slate-500 mb-2">PDF, DOCX up to 25MB</p>
              <label className="inline-block px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold rounded-lg text-[11px] cursor-pointer">
                {businessPlanFile ? `Selected: ${businessPlanFile.name}` : 'Choose File'}
                <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => setBusinessPlanFile(event.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center bg-slate-50/50 dark:bg-slate-800/50">
              <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
              <span className="block font-semibold text-slate-700 dark:text-slate-300">Financial Projection (5Y)</span>
              <p className="text-[10px] text-slate-500 mb-2">XLSX, CSV up to 25MB</p>
              <label className="inline-block px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg text-[11px] cursor-pointer">
                {financialProjectionFile ? `Selected: ${financialProjectionFile.name}` : 'Choose File'}
                <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => setFinancialProjectionFile(event.target.files?.[0] || null)} />
              </label>
            </div>
          </div>}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            {submitError && <p className="mr-auto self-center text-xs font-semibold text-rose-600">{submitError}</p>}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Save as Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
