import React, { useEffect, useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetNeedInput, AssetTypeCode, BackendProject, PreferredAkad, ProjectAssetNeed } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { INPUT, LABEL } from './EngagementTermsFields';
import { PREFERRED_AKAD_LABELS } from './partnershipLabels';

const CLOSED_PROJECT = ['COMPLETED', 'REJECTED'];

/** A delivery partner says what a project needs, e.g. "3 excavators for land clearing, Jan to Jun 2027". */
export const NeedFormModal: React.FC<{ organisationId: string; onClose: () => void; onCreated: (need: ProjectAssetNeed) => void }> = ({ organisationId, onClose, onCreated }) => {
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [form, setForm] = useState<AssetNeedInput>({ projectId: '', assetType: 'MACHINERY', title: '', description: '', quantity: 1, startDate: '', endDate: '', location: '', preferredAkad: 'EITHER' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof AssetNeedInput>(key: K, value: AssetNeedInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    apiClient.getProjects()
      .then((list) => {
        const own = list.filter((project) => project.organisationId === organisationId && !CLOSED_PROJECT.includes(project.status));
        setProjects(own);
        if (own.length === 1) setForm((current) => ({ ...current, projectId: own[0].projectId }));
      })
      .catch((cause) => setError(apiErrorMessage(cause, 'Could not load your projects.')));
  }, [organisationId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onCreated(await apiClient.createAssetNeed({ ...form, quantity: Number(form.quantity), startDate: form.startDate || undefined, endDate: form.endDate || undefined }));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The need was not saved.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={(event) => void save(event)} onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Post an asset need</h2>
              <p className="text-xs text-slate-500">Asset owners in your country with a verified asset of this type can offer it.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="need-project" className={LABEL}>Project</label>
            <select id="need-project" required value={form.projectId} onChange={(e) => set('projectId', e.target.value)} className={`${INPUT} cursor-pointer`}>
              <option value="">{projects.length ? 'Choose…' : 'No active project in your organisation'}</option>
              {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName} ({project.projectCode})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="need-type" className={LABEL}>Type of asset</label>
            <select id="need-type" value={form.assetType} onChange={(e) => set('assetType', e.target.value as AssetTypeCode)} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(ASSET_TYPE_LABELS) as AssetTypeCode[]).map((type) => <option key={type} value={type}>{ASSET_TYPE_LABELS[type]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="need-quantity" className={LABEL}>How many</label>
            <input id="need-quantity" type="number" min={1} max={1000} required value={form.quantity} onChange={(e) => set('quantity', Number(e.target.value))} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="need-title" className={LABEL}>What is needed</label>
            <input id="need-title" required minLength={3} maxLength={160} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. 20-tonne excavators for land clearing" className={INPUT} />
          </div>
          <div>
            <label htmlFor="need-start" className={LABEL}>From</label>
            <input id="need-start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="need-end" className={LABEL}>Until</label>
            <input id="need-end" type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="need-location" className={LABEL}>Where</label>
            <input id="need-location" maxLength={300} value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. FELDA Jengka, Pahang" className={INPUT} />
          </div>
          <div>
            <label htmlFor="need-akad" className={LABEL}>Preferred akad</label>
            <select id="need-akad" value={form.preferredAkad} onChange={(e) => set('preferredAkad', e.target.value as PreferredAkad)} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(PREFERRED_AKAD_LABELS) as PreferredAkad[]).map((akad) => <option key={akad} value={akad}>{PREFERRED_AKAD_LABELS[akad]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="need-description" className={LABEL}>Details (optional)</label>
            <textarea id="need-description" rows={3} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Capacity, with or without operator, site conditions…" className={INPUT} />
          </div>
        </div>
        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving || !form.projectId} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">{saving ? 'Saving…' : 'Post need'}</button>
        </div>
      </form>
    </div>
  );
};
