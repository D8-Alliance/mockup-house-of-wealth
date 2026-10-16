import React, { useRef, useState } from 'react';
import { AlertTriangle, FileText, Trash2, Upload, X } from 'lucide-react';
import { apiClient, apiErrorMessage, AssetDocumentType, RegisteredAsset } from '../services/apiClient';
import { ASSET_DOCUMENT_LABELS, ASSET_EDITABLE, ASSET_STATUS, ASSET_TYPE_LABELS, ASSET_USE_LABELS, formatMoney } from './assetLabels';

interface AssetDetailModalProps {
  asset: RegisteredAsset;
  /** Owner of the asset's organisation (Asset Owner / Asset Manager). */
  canEdit: boolean;
  /** Country Admin, Legal Officer or Super Admin. */
  canReview: boolean;
  onChanged: (asset: RegisteredAsset) => void;
  onEdit: () => void;
  onClose: () => void;
}

const DECLARATIONS = [
  { key: 'ownership', text: 'I or my organisation own this asset, as the proof of ownership shows.' },
  { key: 'halalUse', text: 'The asset is not used for activities that are not Shariah-compliant (for example alcohol, gambling or interest-based lending).' },
  { key: 'accuracy', text: 'The details and documents are true and complete. I understand false information may lead to rejection and legal action.' },
] as const;

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, canEdit, canReview, onChanged, onEdit, onClose }) => {
  const [documentType, setDocumentType] = useState<AssetDocumentType>('OWNERSHIP');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const editable = canEdit && ASSET_EDITABLE.has(asset.status);
  const hasOwnership = asset.documents.some((document) => document.documentType === 'OWNERSHIP');
  const allConfirmed = DECLARATIONS.every((item) => confirmed[item.key]);

  const run = async (action: () => Promise<RegisteredAsset>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action());
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The change was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  const upload = (file: File | undefined) => {
    if (file) void run(() => apiClient.uploadAssetDocument(asset.id, documentType, file));
    if (fileRef.current) fileRef.current.value = '';
  };

  const status = ASSET_STATUS[asset.status];
  const row = (label: string, value: React.ReactNode) => (
    <div><dt className="text-slate-400 font-bold">{label}</dt><dd className="text-slate-800 dark:text-slate-100 break-words">{value || '-'}</dd></div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()} className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{asset.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
            </div>
            <p className="text-xs text-slate-500 font-mono">{asset.id}{asset.organisationName ? ` · ${asset.organisationName}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer" title="Close"><X className="w-5 h-5" /></button>
        </div>

        {asset.reviewNote && (asset.status === 'CHANGES_REQUESTED' || asset.status === 'REJECTED' || asset.status === 'VERIFIED') && (
          <div className={`p-3 rounded-xl text-xs ${asset.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>
            <strong>Reviewer's note:</strong> {asset.reviewNote}
          </div>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {row('Type', ASSET_TYPE_LABELS[asset.assetType])}
          {row('Estimated value', formatMoney(asset.estimatedValue, asset.currency))}
          {row('Location', asset.location)}
          {row('Title / registration', asset.titleReference)}
          {row('Valuation', [asset.valuationDate?.slice(0, 10), asset.valuerName].filter(Boolean).join(' · '))}
          {row('Intended contract', ASSET_USE_LABELS[asset.intendedUse ?? 'UNDECIDED'])}
          {row('Charged or pledged', asset.isEncumbered ? `Yes${asset.encumbranceNote ? `: ${asset.encumbranceNote}` : ''}` : 'No')}
          <div className="sm:col-span-2">{row('Description', asset.description)}</div>
        </dl>
        {editable && <button type="button" onClick={onEdit} className="text-xs font-extrabold text-emerald-600 hover:underline cursor-pointer">Edit details</button>}

        <section className="space-y-2">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Documents</h3>
          {asset.documents.length === 0 && <p className="text-xs text-slate-500">No documents yet.{canEdit ? ' Proof of ownership is needed before submitting.' : ''}</p>}
          {asset.documents.map((document) => {
            const flags = document.integrity?.flags ?? [];
            return (
              <div key={document.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{ASSET_DOCUMENT_LABELS[document.documentType].label}</div>
                      <div className="text-slate-400 truncate">{document.fileName} · {Math.ceil(document.fileSize / 1024)} KB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => void apiClient.downloadAssetDocument(asset.id, document.id).catch((cause) => setError(apiErrorMessage(cause, 'File is unavailable.')))} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold cursor-pointer">Open</button>
                    {editable && <button type="button" title="Remove" disabled={busy} onClick={() => void run(() => apiClient.removeAssetDocument(asset.id, document.id))} className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
                {canReview && flags.length > 0 && (
                  <ul className="space-y-0.5">{flags.map((flag) => <li key={flag.code} className="flex items-start gap-1 text-amber-700 dark:text-amber-300"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />{flag.message}</li>)}</ul>
                )}
              </div>
            );
          })}
          {editable && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-600 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <select aria-label="Document type" value={documentType} onChange={(e) => setDocumentType(e.target.value as AssetDocumentType)} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer">
                  {(Object.keys(ASSET_DOCUMENT_LABELS) as AssetDocumentType[]).map((type) => <option key={type} value={type}>{ASSET_DOCUMENT_LABELS[type].label}</option>)}
                </select>
                <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"><Upload className="w-3.5 h-3.5" />Upload PDF, JPG or PNG</button>
              </div>
              <p className="text-[11px] text-slate-500">{ASSET_DOCUMENT_LABELS[documentType].hint} Up to 15 MB.</p>
            </div>
          )}
        </section>

        {editable && (
          <section className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Submit for verification</h3>
            {DECLARATIONS.map((item) => (
              <label key={item.key} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={Boolean(confirmed[item.key])} onChange={(e) => setConfirmed((current) => ({ ...current, [item.key]: e.target.checked }))} className="mt-0.5 accent-emerald-600" />
                <span>{item.text}</span>
              </label>
            ))}
            {!hasOwnership && <p className="text-[11px] font-bold text-amber-600">Upload proof of ownership first.</p>}
            <div className="flex justify-end">
              <button type="button" disabled={busy || !allConfirmed || !hasOwnership} onClick={() => void run(() => apiClient.submitAsset(asset.id))} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50">Submit for verification</button>
            </div>
          </section>
        )}

        {canReview && asset.status === 'SUBMITTED' && (
          <section className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Your decision</h3>
            <p className="text-[11px] text-slate-500">Check the proof of ownership against the owner's organisation and the title reference, and whether a charge is declared, before verifying.</p>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for the decision (required, shown to the owner)" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busy || note.trim().length < 5} onClick={() => void run(() => apiClient.reviewAsset(asset.id, 'REJECTED', note))} className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 text-xs font-bold cursor-pointer disabled:opacity-50">Reject</button>
              <button type="button" disabled={busy || note.trim().length < 5} onClick={() => void run(() => apiClient.reviewAsset(asset.id, 'CHANGES_REQUESTED', note))} className="px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-xs font-bold cursor-pointer disabled:opacity-50">Request changes</button>
              <button type="button" disabled={busy || note.trim().length < 5} onClick={() => void run(() => apiClient.reviewAsset(asset.id, 'VERIFIED', note))} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Verify</button>
            </div>
          </section>
        )}

        {canEdit && asset.status !== 'VERIFIED' && asset.status !== 'WITHDRAWN' && (
          <div className="flex justify-start">
            <button type="button" disabled={busy} onClick={() => { if (confirm('Withdraw this asset? It will no longer be reviewed or offered.')) void run(() => apiClient.withdrawAsset(asset.id)); }} className="text-[11px] font-bold text-slate-500 hover:text-rose-600 cursor-pointer">Withdraw asset</button>
          </div>
        )}

        {error && <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold">{error}</p>}
      </div>
    </div>
  );
};
