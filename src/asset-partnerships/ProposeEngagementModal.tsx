import React, { useEffect, useState } from 'react';
import { Handshake, X } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetEngagement, BackendProject, ListedAsset, ProjectAssetNeed, RegisteredAsset } from '../services/apiClient';
import { ASSET_TYPE_LABELS } from '../assets/assetLabels';
import { emptyDraft, EngagementDraft, EngagementTermsFields, INPUT, LABEL } from './EngagementTermsFields';
import { PREFERRED_AKAD_LABELS } from './partnershipLabels';

const machine = (type: string) => type === 'MACHINERY' || type === 'EQUIPMENT';
const typesMatch = (needType: string, assetType: string) => needType === assetType || (machine(needType) && machine(assetType));
const CLOSED_PROJECT = ['COMPLETED', 'REJECTED'];

type Props =
  | { mode: 'OFFER'; need: ProjectAssetNeed; organisationId: string; onClose: () => void; onCreated: (engagement: AssetEngagement) => void }
  | { mode: 'REQUEST'; asset: ListedAsset; organisationId: string; onClose: () => void; onCreated: (engagement: AssetEngagement) => void };

/**
 * An asset owner offers one of its verified assets for a project need (OFFER), or a delivery partner
 * asks to use an offered asset for one of its projects (REQUEST).
 */
export const ProposeEngagementModal: React.FC<Props> = (props) => {
  const { mode, organisationId, onClose, onCreated } = props;
  const [assets, setAssets] = useState<RegisteredAsset[]>([]);
  const [projects, setProjects] = useState<BackendProject[]>([]);
  const [needs, setNeeds] = useState<ProjectAssetNeed[]>([]);
  const [assetId, setAssetId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [needId, setNeedId] = useState('');
  const preferred = mode === 'OFFER' ? props.need.preferredAkad : props.asset.offerTerms?.preferredAkad;
  const [draft, setDraft] = useState<EngagementDraft>(() => mode === 'OFFER'
    ? emptyDraft(props.need.preferredAkad === 'MUSHARAKAH' ? 'MUSHARAKAH' : 'IJARAH', props.need.startDate ?? '', props.need.endDate ?? '')
    : emptyDraft(props.asset.offerTerms?.preferredAkad === 'MUSHARAKAH' ? 'MUSHARAKAH' : 'IJARAH', props.asset.offerTerms?.availableFrom ?? '', props.asset.offerTerms?.availableUntil ?? ''));
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = mode === 'OFFER'
      ? apiClient.getAssets('VERIFIED').then((list) => {
        const suitable = list.filter((asset) => typesMatch(props.need.assetType, asset.assetType));
        setAssets(suitable);
        if (suitable.length === 1) setAssetId(suitable[0].id);
      })
      : Promise.all([apiClient.getProjects(), apiClient.getAssetNeeds()]).then(([projectList, needList]) => {
        const own = projectList.filter((project) => project.organisationId === organisationId && !CLOSED_PROJECT.includes(project.status));
        setProjects(own);
        if (own.length === 1) setProjectId(own[0].projectId);
        setNeeds(needList.filter((need) => need.status === 'OPEN' && typesMatch(need.assetType, props.asset.assetType)));
      });
    load.catch((cause) => setError(apiErrorMessage(cause, 'Could not load your options.'))).finally(() => setLoading(false));
    // Loaded once for the asset or need this modal was opened for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectNeeds = needs.filter((need) => need.projectId === projectId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const base = { akad: draft.akad, terms: draft.terms, startDate: draft.startDate, endDate: draft.endDate, message: message || undefined };
      onCreated(await apiClient.createAssetEngagement(mode === 'OFFER'
        ? { ...base, assetId, needId: props.need.id }
        : { ...base, assetId: props.asset.id, projectId, needId: needId || undefined }));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Not sent.'));
    } finally {
      setSaving(false);
    }
  };

  const ready = mode === 'OFFER' ? Boolean(assetId) : Boolean(projectId);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={(event) => void submit(event)} onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Handshake className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{mode === 'OFFER' ? 'Offer an asset' : 'Ask to use this asset'}</h2>
              <p className="text-xs text-slate-500">
                {mode === 'OFFER' ? <>For <strong>{props.need.title}</strong> · {props.need.project.projectName} ({props.need.project.organisationName})</> : <><strong>{props.asset.name}</strong> · {ASSET_TYPE_LABELS[props.asset.assetType]}{props.asset.region ? ` · ${props.asset.region}` : ''}</>}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        {loading ? <p className="text-xs text-slate-400">Loading…</p> : mode === 'OFFER' ? (
          <div>
            <label htmlFor="propose-asset" className={LABEL}>Your verified asset</label>
            {assets.length ? (
              <select id="propose-asset" required value={assetId} onChange={(e) => setAssetId(e.target.value)} className={`${INPUT} cursor-pointer`}>
                <option value="">Choose…</option>
                {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} ({asset.id})</option>)}
              </select>
            ) : <p className="p-3 rounded-xl bg-amber-500/10 text-amber-700 text-xs">You have no verified {ASSET_TYPE_LABELS[props.need.assetType].toLowerCase()} asset. Register one in Asset Register and have it verified first.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="propose-project" className={LABEL}>For your project</label>
              {projects.length ? (
                <select id="propose-project" required value={projectId} onChange={(e) => { setProjectId(e.target.value); setNeedId(''); }} className={`${INPUT} cursor-pointer`}>
                  <option value="">Choose…</option>
                  {projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName} ({project.projectCode})</option>)}
                </select>
              ) : <p className="p-3 rounded-xl bg-amber-500/10 text-amber-700 text-xs">Your organisation has no active project.</p>}
            </div>
            <div>
              <label htmlFor="propose-need" className={LABEL}>Against a need (optional)</label>
              <select id="propose-need" value={needId} onChange={(e) => setNeedId(e.target.value)} disabled={!projectNeeds.length} className={`${INPUT} cursor-pointer`}>
                <option value="">{projectNeeds.length ? 'None' : 'No open need of this type'}</option>
                {projectNeeds.map((need) => <option key={need.id} value={need.id}>{need.title}</option>)}
              </select>
            </div>
          </div>
        )}

        {mode === 'REQUEST' && props.asset.offerTerms && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
            <div><strong>The owner is open to:</strong> {PREFERRED_AKAD_LABELS[props.asset.offerTerms.preferredAkad]}{props.asset.offerTerms.availableFrom ? `, from ${props.asset.offerTerms.availableFrom}` : ''}{props.asset.offerTerms.availableUntil ? ` until ${props.asset.offerTerms.availableUntil}` : ''}</div>
            {props.asset.offerTerms.indicativeTerms && <div>Indicative terms: {props.asset.offerTerms.indicativeTerms}</div>}
            {props.asset.offerTerms.note && <div>{props.asset.offerTerms.note}</div>}
          </div>
        )}
        {mode === 'OFFER' && preferred && preferred !== 'EITHER' && <p className="text-[11px] text-slate-500">The project prefers {PREFERRED_AKAD_LABELS[preferred]}.</p>}

        <EngagementTermsFields idPrefix="propose" value={draft} onChange={setDraft} />
        <div>
          <label htmlFor="propose-message" className={LABEL}>Message (optional)</label>
          <textarea id="propose-message" rows={2} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={mode === 'OFFER' ? 'e.g. Comes with an operator; serviced every 500 hours.' : 'e.g. Needed for land clearing in phase 2.'} className={INPUT} />
        </div>
        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving || !ready} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-60">{saving ? 'Sending…' : mode === 'OFFER' ? 'Send offer' : 'Send request'}</button>
        </div>
      </form>
    </div>
  );
};
