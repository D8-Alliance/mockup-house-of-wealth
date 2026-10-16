import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Circle, MapPin, RefreshCw, X } from 'lucide-react';
import { apiClient, apiErrorMessage, KycCheckFinding, RegisteredAsset } from '../services/apiClient';
import { ASSET_STATUS, documentChecklist, documentLabel, LAND_AREA_UNIT_LABELS, LAND_TITLE_TYPE_LABELS, LAND_USE_LABELS } from './assetLabels';
import { mapLinkUrl } from './LocationPicker';

const row = (label: string, value: React.ReactNode) => (
  <div><dt className="text-slate-400 font-bold">{label}</dt><dd className="text-slate-800 dark:text-slate-100 break-words">{value || '-'}</dd></div>
);

/** The land title details and the map pin, as the owner entered them. */
export const AssetLocationAndTitle: React.FC<{ asset: RegisteredAsset }> = ({ asset }) => {
  const land = asset.assetType === 'LAND' ? asset.details : null;
  const pinned = asset.latitude !== null && asset.longitude !== null;
  if (!land && !pinned) return null;
  return (
    <section className="space-y-2">
      {land && (
        <>
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Land title</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {row('Title', [land.titleType ? LAND_TITLE_TYPE_LABELS[land.titleType].split(' (')[0] : '', land.titleNumber].filter(Boolean).join(' '))}
            {row('Lot', land.lotNumber)}
            {row('Mukim, district, state', [land.mukim, land.district, land.state].filter(Boolean).join(', '))}
            {row('Area', land.areaValue !== undefined ? `${land.areaValue} ${LAND_AREA_UNIT_LABELS[land.areaUnit ?? 'HECTARE']}` : '')}
            {row('Land use', land.landUseCategory ? LAND_USE_LABELS[land.landUseCategory] : '')}
            {row('Tenure', land.tenure === 'LEASEHOLD' ? `Leasehold to ${land.leaseExpiry?.slice(0, 10) ?? '?'}` : land.tenure === 'FREEHOLD' ? 'Freehold' : '')}
            {row('Share held', land.ownershipShare)}
            {row('Malay reserve', land.malayReserve ? 'Yes' : 'No')}
            {land.restrictions && <div className="sm:col-span-3">{row('Conditions and restrictions', land.restrictions)}</div>}
          </dl>
        </>
      )}
      {pinned && (
        <a href={mapLinkUrl(asset.latitude!, asset.longitude!)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline">
          <MapPin className="w-3.5 h-3.5" />Map pin: {asset.latitude!.toFixed(5)}, {asset.longitude!.toFixed(5)}
        </a>
      )}
    </section>
  );
};

/** Which documents this type of asset needs, and which are already uploaded. */
export const AssetDocumentChecklist: React.FC<{ asset: RegisteredAsset }> = ({ asset }) => (
  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
    {documentChecklist(asset.assetType).map(({ type, required }) => {
      const present = asset.documents.some((document) => document.documentType === type);
      return (
        <li key={type} className="flex items-center gap-1.5">
          {present ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <Circle className={`w-4 h-4 shrink-0 ${required ? 'text-rose-400' : 'text-slate-300'}`} />}
          <span className={present ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}>{documentLabel(type, asset.assetType)}</span>
          <span className={`text-[10px] font-bold ${required ? 'text-rose-500' : 'text-slate-400'}`}>{required ? 'required' : 'recommended'}</span>
        </li>
      );
    })}
  </ul>
);

/**
 * Takes a site photo with the back camera and the phone's location, so the reviewer can see the
 * photo was taken at the pinned place. Works on https pages only.
 */
export const SitePhotoCapture: React.FC<{ asset: RegisteredAsset; onUploaded: (asset: RegisteredAsset) => void }> = ({ asset, onUploaded }) => {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError(null);
    setReady(false);
    navigator.geolocation?.getCurrentPosition((found) => { if (!cancelled) setPosition(found); }, () => { if (!cancelled) setError('Location access was blocked: the photo will be saved without a location. Allow location for this site to compare it with the map pin.'); }, { enableHighAccuracy: true, timeout: 20_000 });
    if (!navigator.mediaDevices?.getUserMedia) { setError('This browser cannot use the camera. Upload a photo instead.'); return undefined; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; void videoRef.current.play().finally(() => setReady(true)); }
      })
      .catch(() => { if (!cancelled) setError('The camera could not be started. Allow the camera for this site, or upload a photo instead.'); });
    return () => { cancelled = true; streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, [open]);

  const take = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) { setError('The photo could not be taken. Try again.'); return; }
    setBusy(true);
    try {
      const location = position ? { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracyMetres: position.coords.accuracy } : undefined;
      onUploaded(await apiClient.uploadAssetDocument(asset.id, 'SITE_PHOTO', blob, location));
      setOpen(false);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'The photo was not saved.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"><Camera className="w-3.5 h-3.5" />Take site photo</button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div onClick={(event) => event.stopPropagation()} className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Site photo</h3>
              <button type="button" onClick={() => setOpen(false)} title="Close" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <video ref={videoRef} playsInline muted className="w-full aspect-[4/3] object-cover rounded-xl bg-slate-900" aria-label="Camera" />
            <p className="text-[11px] text-slate-500">
              {position ? `Location: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)} (within about ${Math.round(position.coords.accuracy)} m)` : 'Reading your location…'}
            </p>
            {error && <p className="text-[11px] font-bold text-amber-600">{error}</p>}
            <div className="flex justify-end">
              <button type="button" disabled={!ready || busy} onClick={() => void take()} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">{busy ? 'Saving…' : 'Take and save photo'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const RESULT: Record<KycCheckFinding['result'], { label: string; className: string }> = {
  MATCH: { label: '✓ Matches', className: 'text-emerald-600' },
  MISMATCH: { label: '✗ Does not match', className: 'text-rose-600' },
  NOT_FOUND: { label: '? Not found', className: 'text-amber-600' },
  INFO: { label: 'ℹ Note', className: 'text-slate-500' },
};

/** What the document checks found, other registrations of the same land (reviewers), and a re-run. */
export const AssetCheckResults: React.FC<{ asset: RegisteredAsset; canReview: boolean; onChanged: (asset: RegisteredAsset) => void }> = ({ asset, canReview, onChanged }) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const findings = asset.checkFindings ?? [];
  const duplicates = asset.duplicates ?? [];
  if (!asset.checkedAt && !duplicates.length && !canReview) return null;
  const issues = findings.filter((finding) => finding.result === 'MISMATCH' || finding.result === 'NOT_FOUND').length;

  const rerun = async () => {
    setRunning(true);
    setError(null);
    try { onChanged(await apiClient.rerunAssetChecks(asset.id)); } catch (cause) { setError(apiErrorMessage(cause, 'The checks could not be run.')); } finally { setRunning(false); }
  };

  return (
    <section className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">Document checks (advisory)</h3>
        <div className="flex items-center gap-2">
          {asset.checkedAt && <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${issues ? 'bg-amber-500/10 text-amber-700' : 'bg-emerald-500/10 text-emerald-700'}`}>{issues ? `${issues} to check` : 'No issues found'}</span>}
          {canReview && asset.status !== 'DRAFT' && <button type="button" disabled={running} onClick={() => void rerun()} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${running ? 'animate-spin' : ''}`} />Re-run</button>}
        </div>
      </div>
      {duplicates.length > 0 && (
        <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/30 text-xs text-rose-700 dark:text-rose-300">
          <strong>The same land is also registered by another owner:</strong>{' '}
          {duplicates.map((other) => `${other.id} (${other.organisationName}, ${ASSET_STATUS[other.status].label.toLowerCase()})`).join('; ')}. Establish who holds the title before verifying either.
        </div>
      )}
      {!asset.checkedAt && <p className="text-xs text-slate-400">The documents are checked when the asset is submitted.</p>}
      {findings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead><tr className="text-left text-slate-400 uppercase"><th className="py-1 pr-2">Field</th><th className="pr-2">Entered</th><th className="pr-2">On the document</th><th>Result</th></tr></thead>
            <tbody>
              {findings.map((finding, index) => (
                <tr key={index} className="border-t border-slate-100 dark:border-slate-700 align-top">
                  <td className="py-1 pr-2"><div className="font-bold text-slate-700 dark:text-slate-200">{finding.field}</div><div className="text-slate-400">{finding.source}</div></td>
                  <td className="pr-2 text-slate-600 dark:text-slate-300 break-words">{finding.entered ?? '-'}</td>
                  <td className="pr-2 font-mono text-slate-600 dark:text-slate-300 break-words">{finding.found ?? (finding.result === 'MATCH' ? 'same as entered' : '-')}</td>
                  <td className={`font-bold whitespace-nowrap ${RESULT[finding.result].className}`}>{RESULT[finding.result].label}{finding.note && <div className="font-normal text-slate-500 whitespace-normal max-w-[16rem]">{finding.note}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {asset.checkedAt && <p className="text-[10px] text-slate-400">Checked {asset.checkedAt.slice(0, 16).replace('T', ' ')}. These signals support the review; the decision is the reviewer's. Text is read from PDFs and photos; a scanned PDF cannot be read and must be checked by eye.</p>}
      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
    </section>
  );
};
