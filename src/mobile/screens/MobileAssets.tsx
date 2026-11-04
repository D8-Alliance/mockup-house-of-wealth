import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, ChevronRight, FileText, MapPin, Plus, Trash2 } from 'lucide-react';
import { apiClient, AssetDetailsInput, AssetDocumentType, AssetEngagement, AssetInput, AssetIntendedUse, AssetTypeCode, RegisteredAsset } from '../../services/apiClient';
import { ASSET_EDITABLE, ASSET_STATUS, ASSET_TYPE_LABELS, ASSET_USE_LABELS, BUILDING_TITLE_KIND_LABELS, BUILDING_USE_LABELS, documentChecklist, documentLabel, FLOOR_AREA_UNIT_LABELS, LAND_AREA_UNIT_LABELS, LAND_TITLE_TYPE_LABELS, LAND_USE_LABELS, MALAYSIAN_STATES, VEHICLE_CATEGORY_LABELS } from '../../assets/assetLabels';
import { DISTRICTS_BY_STATE, usesMukim } from '../../assets/malaysiaLocations';
import { useT } from '../i18n';

const card = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';
const input = 'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-bold text-slate-900 dark:text-white';
const primary = 'w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-50';
const secondary = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 py-3 text-sm font-black disabled:opacity-50';
const alert = 'rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300';
const back = 'flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400';
const today = () => new Date().toISOString().slice(0, 10);
const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);
const isMachine = (type: AssetTypeCode) => type === 'MACHINERY' || type === 'EQUIPMENT';

type Details = Record<string, string | number | boolean | undefined>;
interface Field { key: string; label: string; kind: 'text' | 'number' | 'date' | 'select' | 'check'; options?: Record<string, string>; when?: (details: Details) => boolean; required?: (details: Details) => boolean }

const STATE_OPTIONS = Object.fromEntries(MALAYSIAN_STATES.map(state => [state, state]));
const location: Field[] = [
  { key: 'state', label: 'State', kind: 'select', options: STATE_OPTIONS },
  { key: 'district', label: 'District', kind: 'select' },
  { key: 'mukim', label: 'Mukim (as on the title)', kind: 'text', when: (d) => usesMukim(d.state as string | undefined) },
];

/** The details each type of asset asks for; the server checks the same ones before it can be submitted. */
const FIELDS: Record<AssetTypeCode, Field[]> = {
  LAND: [
    { key: 'titleType', label: 'Title type', kind: 'select', options: LAND_TITLE_TYPE_LABELS, required: () => true },
    { key: 'titleNumber', label: 'Title number', kind: 'text', required: () => true },
    { key: 'lotNumber', label: 'Lot number', kind: 'text', required: () => true },
    ...location,
    { key: 'areaValue', label: 'Area', kind: 'number', required: () => true },
    { key: 'areaUnit', label: 'Area unit', kind: 'select', options: LAND_AREA_UNIT_LABELS },
    { key: 'landUseCategory', label: 'Land use category', kind: 'select', options: LAND_USE_LABELS, required: () => true },
    { key: 'tenure', label: 'Tenure', kind: 'select', options: { FREEHOLD: 'Freehold', LEASEHOLD: 'Leasehold' }, required: () => true },
    { key: 'leaseExpiry', label: 'Lease expiry date', kind: 'date', when: (d) => d.tenure === 'LEASEHOLD', required: () => true },
    { key: 'malayReserve', label: 'Malay reserve land', kind: 'check' },
  ],
  BUILDING: [
    { key: 'titleKind', label: 'Title', kind: 'select', options: BUILDING_TITLE_KIND_LABELS, required: () => true },
    { key: 'buildingName', label: 'Building name', kind: 'text' },
    { key: 'strataTitleNumber', label: 'Strata title number', kind: 'text', when: (d) => d.titleKind === 'STRATA', required: () => true },
    { key: 'parcelNumber', label: 'Parcel number', kind: 'text', when: (d) => d.titleKind === 'STRATA' || d.titleKind === 'MASTER_TITLE', required: () => true },
    { key: 'storey', label: 'Storey', kind: 'text', when: (d) => d.titleKind === 'STRATA' || d.titleKind === 'MASTER_TITLE' },
    { key: 'titleNumber', label: 'Title number', kind: 'text', when: (d) => d.titleKind === 'INDIVIDUAL' || d.titleKind === 'MASTER_TITLE', required: () => true },
    { key: 'lotNumber', label: 'Lot number', kind: 'text', when: (d) => d.titleKind === 'INDIVIDUAL' || d.titleKind === 'MASTER_TITLE', required: () => true },
    ...location,
    { key: 'buildingUse', label: 'Building use', kind: 'select', options: BUILDING_USE_LABELS, required: () => true },
    { key: 'floorArea', label: 'Floor area', kind: 'number', required: () => true },
    { key: 'floorAreaUnit', label: 'Floor area unit', kind: 'select', options: FLOOR_AREA_UNIT_LABELS },
    { key: 'yearCompleted', label: 'Year completed', kind: 'number', required: () => true },
    { key: 'completionCertificateNumber', label: 'Completion certificate number', kind: 'text' },
    { key: 'hasTenants', label: 'The building has tenants', kind: 'check' },
    { key: 'tenantActivity', label: "Tenants' business", kind: 'text', when: (d) => d.hasTenants === true, required: () => true },
  ],
  VEHICLE: [
    { key: 'registrationNumber', label: 'Registration number', kind: 'text', required: () => true },
    { key: 'chassisNumber', label: 'Chassis number', kind: 'text', required: () => true },
    { key: 'engineNumber', label: 'Engine number', kind: 'text', required: () => true },
    { key: 'make', label: 'Make', kind: 'text', required: () => true },
    { key: 'model', label: 'Model', kind: 'text' },
    { key: 'yearOfManufacture', label: 'Year of manufacture', kind: 'number', required: () => true },
    { key: 'category', label: 'Category', kind: 'select', options: VEHICLE_CATEGORY_LABELS },
    { key: 'roadTaxExpiry', label: 'Road tax expiry', kind: 'date' },
    { key: 'insuranceExpiry', label: 'Insurance or takaful expiry', kind: 'date' },
    { key: 'inspectionExpiry', label: 'PUSPAKOM inspection expiry', kind: 'date' },
    { key: 'permitNumber', label: 'APAD permit number', kind: 'text' },
    { key: 'hirePurchase', label: 'Still under hire purchase', kind: 'check' },
  ],
  MACHINERY: [],
  EQUIPMENT: [],
  OTHER: [],
};
FIELDS.MACHINERY = [
  { key: 'manufacturer', label: 'Manufacturer', kind: 'text', required: () => true },
  { key: 'model', label: 'Model', kind: 'text', required: () => true },
  { key: 'serialNumber', label: 'Serial number', kind: 'text', required: () => true },
  { key: 'yearOfManufacture', label: 'Year of manufacture', kind: 'number' },
  { key: 'purchaseDate', label: 'Purchase date', kind: 'date' },
  { key: 'operatingHours', label: 'Operating hours', kind: 'number' },
  { key: 'requiresDoshCertificate', label: 'Needs a JKKP certificate (crane, hoist, boiler, pressure vessel)', kind: 'check' },
  { key: 'doshCertificateNumber', label: 'JKKP certificate number', kind: 'text', when: (d) => d.requiresDoshCertificate === true, required: () => true },
  { key: 'doshCertificateExpiry', label: 'JKKP certificate expiry', kind: 'date', when: (d) => d.requiresDoshCertificate === true, required: () => true },
  { key: 'hirePurchase', label: 'Still under hire purchase', kind: 'check' },
];
FIELDS.EQUIPMENT = FIELDS.MACHINERY;

/** Expiry dates kept in an asset's details; the server reminds the owner 30, 14 and 7 days before. */
const EXPIRY_KEYS: Array<[keyof AssetDetailsInput, string]> = [['roadTaxExpiry', 'Road tax'], ['insuranceExpiry', 'Insurance or takaful'], ['inspectionExpiry', 'PUSPAKOM inspection'], ['doshCertificateExpiry', 'JKKP certificate'], ['leaseExpiry', 'Lease']];
const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - Date.now()) / 86_400_000);

export function expiries(asset: RegisteredAsset) {
  const details = (asset.details ?? {}) as AssetDetailsInput;
  return EXPIRY_KEYS.flatMap(([key, label]) => (typeof details[key] === 'string' && details[key] ? [{ label, date: String(details[key]).slice(0, 10), days: daysUntil(String(details[key]).slice(0, 10)) }] : []));
}

/**
 * The asset owner's registered assets on the phone: register one with its type's details, take its documents
 * and site photo with the camera, submit it for verification, keep its expiry dates in view, and answer
 * delivery partners' offers. A verified asset can then be leased out under Leasing.
 */
export const MobileAssets: React.FC = () => {
  const { t, serverText } = useT();
  const [assets, setAssets] = useState<RegisteredAsset[] | null>(null);
  const [engagements, setEngagements] = useState<AssetEngagement[]>([]);
  const [error, setError] = useState('');
  const [view, setView] = useState<{ kind: 'list' } | { kind: 'form'; asset?: RegisteredAsset } | { kind: 'detail'; id: string }>({ kind: 'list' });
  const load = useCallback(() => {
    setError('');
    apiClient.getAssets().then(setAssets).catch((cause) => setError(errorText(cause, t('Your assets could not be loaded.'))));
    apiClient.getAssetEngagements().then(setEngagements).catch(() => setEngagements([]));
  }, [t]);
  useEffect(load, [load]);

  if (view.kind === 'form') return <AssetForm asset={view.asset} onBack={() => setView(view.asset ? { kind: 'detail', id: view.asset.id } : { kind: 'list' })} onSaved={(saved) => { load(); setView({ kind: 'detail', id: saved.id }); }} />;
  if (view.kind === 'detail') return <AssetDetail id={view.id} engagements={engagements.filter(item => item.asset.id === view.id)} onBack={() => { load(); setView({ kind: 'list' }); }} onEdit={(asset) => setView({ kind: 'form', asset })} onChanged={load} />;

  const shown = assets?.filter(asset => asset.status !== 'WITHDRAWN') ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black">{t('My assets')}</h1>
        <p className="text-xs text-slate-500">{t('Register an asset, upload its documents and have it verified. A verified asset can be leased out or offered to projects.')}</p>
      </div>
      <button type="button" onClick={() => setView({ kind: 'form' })} className={`${primary} flex items-center justify-center gap-1.5`}><Plus className="w-4 h-4" />{t('Register an asset')}</button>
      {error && <p role="alert" className={alert}>{serverText(error)}</p>}
      {!assets && !error && <p className="text-sm text-slate-500">{t('Loading...')}</p>}
      {assets && shown.length === 0 && <p className="text-xs text-slate-500">{t('No asset registered yet.')}</p>}
      {shown.map(asset => {
        const due = expiries(asset).filter(item => item.days <= 30);
        const offers = engagements.filter(item => item.asset.id === asset.id && item.canRespond).length;
        return (
          <button key={asset.id} type="button" onClick={() => setView({ kind: 'detail', id: asset.id })} className={`${card} w-full text-left flex items-center gap-3`}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-black">{asset.name}</p>
              <p className="text-[11px] text-slate-500">{t(ASSET_TYPE_LABELS[asset.assetType])} · {t('{count} document(s)', { count: asset.documents.length })}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${ASSET_STATUS[asset.status].className}`}>{t(ASSET_STATUS[asset.status].label)}</span>
                {offers > 0 && <span className="text-[10px] font-black rounded-full px-2 py-0.5 bg-amber-400 text-emerald-950">{t('{count} offer(s) to answer', { count: offers })}</span>}
                {due.map(item => <span key={item.label} className={`text-[10px] font-black rounded-full px-2 py-0.5 ${item.days < 0 ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{item.days < 0 ? t('{label} expired', { label: t(item.label) }) : t('{label}: {days} days left', { label: t(item.label), days: item.days })}</span>)}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        );
      })}
    </div>
  );
};

const AssetForm: React.FC<{ asset?: RegisteredAsset; onBack: () => void; onSaved: (asset: RegisteredAsset) => void }> = ({ asset, onBack, onSaved }) => {
  const { t, serverText } = useT();
  const [type, setType] = useState<AssetTypeCode>(asset?.assetType ?? 'BUILDING');
  const [form, setForm] = useState({
    name: asset?.name ?? '', description: asset?.description ?? '', location: asset?.location ?? '', estimatedValue: asset ? String(asset.estimatedValue) : '', currency: asset?.currency ?? 'MYR',
    valuationDate: asset?.valuationDate?.slice(0, 10) ?? '', valuerName: asset?.valuerName ?? '', isEncumbered: asset?.isEncumbered ?? false, encumbranceNote: asset?.encumbranceNote ?? '', intendedUse: (asset?.intendedUse ?? 'UNDECIDED') as AssetIntendedUse,
  });
  const [details, setDetails] = useState<Details>((asset?.details as Details | null) ?? { areaUnit: 'HECTARE', floorAreaUnit: 'SQ_FEET' });
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(asset?.latitude != null && asset.longitude != null ? { latitude: asset.latitude, longitude: asset.longitude } : null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [key]: value }));
  const setDetail = (key: string, value: string | number | boolean | undefined) => setDetails(current => ({ ...current, [key]: value, ...(key === 'state' ? { district: undefined } : {}) }));

  const locate = () => {
    if (!navigator.geolocation) return setError(t('This phone cannot give its location.'));
    navigator.geolocation.getCurrentPosition((position) => setPin({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => setError(t('Allow location access to pin the asset where you are standing.')), { enableHighAccuracy: true, timeout: 15000 });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    // Only the fields shown for this type, without empty ones.
    const fields = FIELDS[type].filter(field => !field.when || field.when(details));
    const chosen = Object.fromEntries(fields.map(field => [field.key, details[field.key]]).filter(([, value]) => value !== '' && value !== undefined)) as AssetDetailsInput;
    const body: AssetInput = {
      assetType: type, name: form.name, description: form.description, location: form.location, estimatedValue: Number(form.estimatedValue), currency: form.currency,
      ...(form.valuationDate ? { valuationDate: form.valuationDate } : {}), ...(form.valuerName ? { valuerName: form.valuerName } : {}),
      isEncumbered: form.isEncumbered, ...(form.isEncumbered && form.encumbranceNote ? { encumbranceNote: form.encumbranceNote } : {}), intendedUse: form.intendedUse,
      ...(pin ? pin : {}),
      ...(type === 'LAND' ? { land: chosen } : type === 'BUILDING' ? { building: chosen } : type === 'VEHICLE' ? { vehicle: chosen } : isMachine(type) ? { machine: chosen } : {}),
    };
    try { onSaved(asset ? await apiClient.updateAsset(asset.id, body) : await apiClient.createAsset(body)); } catch (cause) { setError(errorText(cause, t('The asset could not be saved.'))); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <button type="button" onClick={onBack} className={back}><ArrowLeft className="w-4 h-4" />{asset ? asset.name : t('My assets')}</button>
      <h1 className="text-lg font-black">{asset ? t('Edit asset') : t('Register an asset')}</h1>
      {!asset && (
        <label className="block text-xs font-bold text-slate-500">{t('Type of asset')}
          <select value={type} onChange={(event) => setType(event.target.value as AssetTypeCode)} className={input}>{(Object.keys(ASSET_TYPE_LABELS) as AssetTypeCode[]).map(code => <option key={code} value={code}>{t(ASSET_TYPE_LABELS[code])}</option>)}</select>
        </label>
      )}
      <label className="block text-xs font-bold text-slate-500">{t('Name (e.g. Menara Hidayah, Komatsu PC200 excavator)')}<input required minLength={3} maxLength={160} value={form.name} onChange={(event) => set('name', event.target.value)} className={input} /></label>
      <label className="block text-xs font-bold text-slate-500">{t('Address or where it is kept')}<input maxLength={500} value={form.location} onChange={(event) => set('location', event.target.value)} className={input} /></label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={locate} className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-black"><MapPin className="w-4 h-4" />{t('Pin my current location')}</button>
        {pin && <span className="text-[11px] text-slate-500">{pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</span>}
      </div>

      {FIELDS[type].length > 0 && <h2 className="text-sm font-black pt-2">{t('Details from the documents')}</h2>}
      {FIELDS[type].filter(field => !field.when || field.when(details)).map(field => {
        const value = details[field.key];
        const label = `${t(field.label)}${field.required?.(details) ? ' *' : ''}`;
        if (field.kind === 'check') return <label key={field.key} className="flex items-start gap-2 text-xs font-bold"><input type="checkbox" checked={value === true} onChange={(event) => setDetail(field.key, event.target.checked)} className="mt-0.5 w-4 h-4" />{t(field.label)}</label>;
        const options = field.key === 'district' ? Object.fromEntries((DISTRICTS_BY_STATE[String(details.state ?? '')] ?? []).map(district => [district, district])) : field.options;
        if (field.kind === 'select' && options && (field.key !== 'district' || Object.keys(options).length > 0)) {
          return <label key={field.key} className="block text-xs font-bold text-slate-500">{label}<select value={String(value ?? '')} onChange={(event) => setDetail(field.key, event.target.value || undefined)} className={input}><option value="">{t('Choose')}</option>{Object.entries(options).map(([code, text]) => <option key={code} value={code}>{t(text)}</option>)}</select></label>;
        }
        return <label key={field.key} className="block text-xs font-bold text-slate-500">{label}<input type={field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'} inputMode={field.kind === 'number' ? 'decimal' : undefined} value={value === undefined ? '' : String(value)} onChange={(event) => setDetail(field.key, field.kind === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value)} className={input} /></label>;
      })}

      <h2 className="text-sm font-black pt-2">{t('Value and use')}</h2>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block text-xs font-bold text-slate-500">{t('Estimated value')} *<input required type="number" min={1} step="0.01" inputMode="decimal" value={form.estimatedValue} onChange={(event) => set('estimatedValue', event.target.value)} className={input} /></label>
        <label className="block text-xs font-bold text-slate-500">{t('Currency')}<select value={form.currency} onChange={(event) => set('currency', event.target.value)} className={input}>{['MYR', 'IDR', 'TRY', 'BDT', 'EGP', 'NGN', 'PKR', 'IRR', 'USD'].map(code => <option key={code}>{code}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-bold text-slate-500">{t('Valuation date')}<input type="date" max={today()} value={form.valuationDate} onChange={(event) => set('valuationDate', event.target.value)} className={input} /></label>
        <label className="block text-xs font-bold text-slate-500">{t('Valuer')}<input maxLength={160} value={form.valuerName} onChange={(event) => set('valuerName', event.target.value)} className={input} /></label>
      </div>
      <label className="block text-xs font-bold text-slate-500">{t('What you plan to do with it')}<select value={form.intendedUse} onChange={(event) => set('intendedUse', event.target.value)} className={input}>{(Object.keys(ASSET_USE_LABELS) as AssetIntendedUse[]).map(code => <option key={code} value={code}>{t(ASSET_USE_LABELS[code])}</option>)}</select></label>
      <label className="flex items-start gap-2 text-xs font-bold"><input type="checkbox" checked={form.isEncumbered} onChange={(event) => set('isEncumbered', event.target.checked)} className="mt-0.5 w-4 h-4" />{t('Charged to a bank or otherwise pledged')}</label>
      {form.isEncumbered && <label className="block text-xs font-bold text-slate-500">{t('Who holds the charge, and is the financing Islamic?')}<input maxLength={500} value={form.encumbranceNote} onChange={(event) => set('encumbranceNote', event.target.value)} className={input} /></label>}
      <label className="block text-xs font-bold text-slate-500">{t('Description')}<textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} className={input} /></label>
      {error && <p role="alert" className={alert}>{serverText(error)}</p>}
      <button type="submit" disabled={saving} className={primary}>{saving ? t('Saving...') : t('Save')}</button>
      <p className="text-[11px] text-slate-500">{t('Fields marked * are needed before the asset can be submitted; you can save a draft without them.')}</p>
    </form>
  );
};

const AssetDetail: React.FC<{ id: string; engagements: AssetEngagement[]; onBack: () => void; onEdit: (asset: RegisteredAsset) => void; onChanged: () => void }> = ({ id, engagements, onBack, onEdit, onChanged }) => {
  const { t, locale, serverText } = useT();
  const [asset, setAsset] = useState<RegisteredAsset | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [declaring, setDeclaring] = useState(false);
  const [declared, setDeclared] = useState([false, false, false]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<AssetDocumentType | null>(null);
  const load = useCallback(() => { apiClient.getAsset(id).then(setAsset).catch((cause) => setError(errorText(cause, t('The asset could not be loaded.')))); }, [id, t]);
  useEffect(load, [load]);

  const act = async (key: string, call: () => Promise<RegisteredAsset | unknown>) => {
    setBusy(key);
    setError('');
    try { const result = await call(); if (result && typeof result === 'object' && 'documents' in result) setAsset(result as RegisteredAsset); else load(); onChanged(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };

  /** A site photo carries where the phone was, so a reviewer can compare it with the map pin. */
  const position = () => new Promise<{ latitude: number; longitude: number; accuracyMetres?: number } | undefined>((resolve) => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition((found) => resolve({ latitude: found.coords.latitude, longitude: found.coords.longitude, accuracyMetres: found.coords.accuracy }), () => resolve(undefined), { enableHighAccuracy: true, timeout: 15000 });
  });
  const pick = (type: AssetDocumentType) => { setUploadType(type); setTimeout(() => fileInput.current?.click(), 0); };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !uploadType || !asset) return;
    const type = uploadType;
    await act(`upload-${type}`, async () => apiClient.uploadAssetDocument(asset.id, type, file, type === 'SITE_PHOTO' ? await position() : undefined));
  };

  if (!asset) return <div className="space-y-4"><button type="button" onClick={onBack} className={back}><ArrowLeft className="w-4 h-4" />{t('My assets')}</button>{error ? <p role="alert" className={alert}>{serverText(error)}</p> : <p className="text-sm text-slate-500">{t('Loading...')}</p>}</div>;

  const editable = ASSET_EDITABLE.has(asset.status);
  const checklist = documentChecklist(asset.assetType, asset.details);
  const missing = checklist.filter(item => item.required && !asset.documents.some(document => document.documentType === item.type));
  const findings = (asset.checkFindings ?? []).filter(finding => finding.result === 'MISMATCH' || finding.result === 'NOT_FOUND');
  const dates = expiries(asset);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className={back}><ArrowLeft className="w-4 h-4" />{t('My assets')}</button>
      <div>
        <h1 className="text-lg font-black">{asset.name}</h1>
        <p className="text-[11px] text-slate-500">{t(ASSET_TYPE_LABELS[asset.assetType])} · <span className="font-mono">{asset.id}</span></p>
        <span className={`inline-block mt-1 text-[10px] font-black rounded-full px-2 py-0.5 ${ASSET_STATUS[asset.status].className}`}>{t(ASSET_STATUS[asset.status].label)}</span>
      </div>
      {asset.reviewNote && ['CHANGES_REQUESTED', 'REJECTED'].includes(asset.status) && <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-xs font-bold text-amber-800 dark:text-amber-200">{t('Reviewer: {note}', { note: asset.reviewNote })}</p>}
      {asset.status === 'VERIFIED' && <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs font-bold text-emerald-800 dark:text-emerald-200">{t('Verified. You can lease it out under Leasing, or offer it to projects.')}</p>}
      {error && <p role="alert" className={alert}>{serverText(error)}</p>}

      {dates.length > 0 && (
        <section className={`${card} space-y-1.5`}>
          <h2 className="text-sm font-black">{t('Expiry dates')}</h2>
          {dates.map(item => <p key={item.label} className="flex justify-between text-xs"><span>{t(item.label)}</span><span className={`font-black ${item.days < 0 ? 'text-rose-700 dark:text-rose-400' : item.days <= 30 ? 'text-amber-700 dark:text-amber-300' : ''}`}>{new Date(`${item.date}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{item.days < 0 ? ` · ${t('expired')}` : item.days <= 30 ? ` · ${t('{days} days left', { days: item.days })}` : ''}</span></p>)}
          <p className="text-[11px] text-slate-500">{t('You are reminded 30, 14 and 7 days before each date. Upload the renewed document and update the date.')}</p>
        </section>
      )}

      <section className={`${card} space-y-2`}>
        <h2 className="text-sm font-black">{t('Documents')}</h2>
        <input ref={fileInput} type="file" accept={uploadType === 'SITE_PHOTO' || uploadType === 'SERIAL_PLATE' ? 'image/*' : 'image/*,application/pdf'} capture={uploadType === 'SITE_PHOTO' || uploadType === 'SERIAL_PLATE' ? 'environment' : undefined} className="hidden" onChange={upload} />
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {checklist.map(item => {
            const files = asset.documents.filter(document => document.documentType === item.type);
            return (
              <li key={item.type} className="py-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black">{t(documentLabel(item.type, asset.assetType))}{item.required ? ' *' : ''}</p>
                    {files.length === 0 && <p className={`text-[11px] ${item.required ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-slate-500'}`}>{item.required ? t('Required') : t('Optional')}</p>}
                  </div>
                  {editable && <button type="button" disabled={busy === `upload-${item.type}`} onClick={() => pick(item.type)} className="shrink-0 flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-[11px] font-black disabled:opacity-50">{item.type === 'SITE_PHOTO' || item.type === 'SERIAL_PLATE' ? <Camera className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}{busy === `upload-${item.type}` ? t('Uploading...') : t('Add')}</button>}
                </div>
                {files.map(document => (
                  <div key={document.id} className="flex items-center gap-2 text-[11px]">
                    <button type="button" onClick={() => apiClient.downloadAssetDocument(asset.id, document.id)} className="min-w-0 flex-1 text-left truncate font-bold text-emerald-700 dark:text-emerald-400">{document.fileName}</button>
                    {document.metadata?.latitude !== undefined && <MapPin className="w-3.5 h-3.5 text-slate-400" aria-label={t('Location recorded')} />}
                    {editable && <button type="button" aria-label={t('Remove')} disabled={busy === `remove-${document.id}`} onClick={() => act(`remove-${document.id}`, () => apiClient.removeAssetDocument(asset.id, document.id))} className="text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                ))}
              </li>
            );
          })}
        </ul>
        {editable && <p className="text-[11px] text-slate-500">{t('Take the site photo on site: the phone records where it was taken.')}</p>}
      </section>

      {findings.length > 0 && (
        <section className={`${card} space-y-1.5`}>
          <h2 className="text-sm font-black">{t('Document checks to look at')}</h2>
          {findings.map((finding, index) => <p key={index} className="text-xs"><span className="font-bold">{finding.field}</span>: {finding.result === 'MISMATCH' ? t('the document shows {found}, you entered {entered}', { found: finding.found ?? '-', entered: finding.entered ?? '-' }) : t('not found in the document')}</p>)}
        </section>
      )}

      {editable && !declaring && (
        <div className="grid gap-2">
          <button type="button" onClick={() => onEdit(asset)} className={secondary}>{t('Edit details')}</button>
          <button type="button" disabled={missing.length > 0} onClick={() => { setDeclaring(true); setDeclared([false, false, false]); }} className={primary}>{t('Submit for verification')}</button>
        </div>
      )}
      {editable && missing.length > 0 && <p className="text-[11px] text-slate-500">{t('Upload the required documents (*) before submitting.')}</p>}
      {declaring && (
        <section className={`${card} space-y-3`}>
          {['I or my organisation own this asset.', 'The asset is not used for activities that are not Shariah-compliant.', 'The details and documents are true and complete.'].map((text, index) => (
            <label key={text} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={declared[index]} onChange={(event) => setDeclared(current => current.map((value, i) => (i === index ? event.target.checked : value)))} className="mt-0.5 w-4 h-4" />{t(text)}</label>
          ))}
          <button type="button" disabled={!declared.every(Boolean) || busy === 'submit'} onClick={() => act('submit', async () => { const result = await apiClient.submitAsset(asset.id); setDeclaring(false); return result; })} className={primary}>{t('Submit for verification')}</button>
          <button type="button" onClick={() => setDeclaring(false)} className={secondary}>{t('Cancel')}</button>
        </section>
      )}

      {engagements.length > 0 && <Offers engagements={engagements} onChanged={() => { onChanged(); load(); }} />}
    </div>
  );
};

const ENGAGEMENT_STATUS: Record<string, string> = { PROPOSED: 'Under discussion', ACCEPTED: 'Awaiting Legal and Shariah approval', APPROVED: 'Approved', DECLINED: 'Declined', WITHDRAWN: 'Withdrawn', REJECTED: 'Rejected' };

/** Delivery partners' offers and requests for this asset: accept or decline here; a counter-offer is made on the web portal. */
const Offers: React.FC<{ engagements: AssetEngagement[]; onChanged: () => void }> = ({ engagements, onChanged }) => {
  const { t, locale, serverText } = useT();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const money = (amount: number | undefined, currency = 'MYR') => (amount === undefined ? '-' : `${currency === 'MYR' ? 'RM' : currency} ${amount.toLocaleString(locale, { maximumFractionDigits: 2 })}`);
  const respond = async (engagement: AssetEngagement, action: 'ACCEPT' | 'DECLINE') => {
    setBusy(engagement.id);
    setError('');
    try { await apiClient.respondAssetEngagement(engagement.id, action === 'ACCEPT' ? { action, termsHash: engagement.termsHash, confirmed: true } : { action }); setConfirming(null); onChanged(); } catch (cause) { setError(errorText(cause, t('That did not go through.'))); } finally { setBusy(''); }
  };
  return (
    <section className={`${card} space-y-3`}>
      <h2 className="text-sm font-black">{t('Project offers')}</h2>
      {error && <p role="alert" className={alert}>{serverText(error)}</p>}
      {engagements.map(engagement => (
        <div key={engagement.id} className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2 first:border-0 first:pt-0">
          <p className="text-xs font-black">{engagement.project.projectName}</p>
          <p className="text-[11px] text-slate-500">{engagement.project.organisationName} · {engagement.startDate} – {engagement.endDate}</p>
          <p className="text-xs">{engagement.akad === 'IJARAH'
            ? t('Ijarah: {rent} {frequency}', { rent: money(engagement.terms.rentAmount, engagement.terms.currency), frequency: engagement.terms.rentFrequency === 'WHOLE_PERIOD' ? t('for the whole period') : t('a month') })
            : t('Musharakah: asset valued {value}, your profit share {pct}%', { value: money(engagement.terms.contributionValue, engagement.terms.currency), pct: engagement.terms.profitSharePct ?? '-' })}</p>
          <p className="text-[11px] font-bold">{t(ENGAGEMENT_STATUS[engagement.status] ?? engagement.status)}{engagement.canRespond ? ` · ${t('Your turn')}` : ''}</p>
          {engagement.canRespond && confirming !== engagement.id && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy === engagement.id} onClick={() => setConfirming(engagement.id)} className={primary}>{t('Accept')}</button>
              <button type="button" disabled={busy === engagement.id} onClick={() => respond(engagement, 'DECLINE')} className={secondary}>{t('Decline')}</button>
            </div>
          )}
          {confirming === engagement.id && (
            <div className="space-y-2">
              <p className="text-[11px]">{t('You accept these terms on behalf of your organisation. Legal and Shariah then review the partnership.')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy === engagement.id} onClick={() => respond(engagement, 'ACCEPT')} className={primary}>{t('Confirm')}</button>
                <button type="button" onClick={() => setConfirming(null)} className={secondary}>{t('Cancel')}</button>
              </div>
            </div>
          )}
          {engagement.canRespond && <p className="text-[11px] text-slate-500">{t('To propose other terms, use the web portal.')}</p>}
        </div>
      ))}
    </section>
  );
};
