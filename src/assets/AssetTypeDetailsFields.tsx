import React from 'react';
import { BuildingDetailsInput, MachineDetailsInput, VehicleDetailsInput } from '../services/apiClient';
import { BUILDING_TITLE_KIND_LABELS, BUILDING_USE_LABELS, FLOOR_AREA_UNIT_LABELS, MALAYSIAN_STATES, VEHICLE_CATEGORY_LABELS } from './assetLabels';

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';
const CHECK = 'flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';

interface FieldsProps<T> {
  value: T;
  onChange: (value: T) => void;
}

const Group: React.FC<{ legend: string; children: React.ReactNode }> = ({ legend, children }) => (
  <fieldset className="sm:col-span-2 p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
    <legend className="px-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase">{legend}</legend>
    {children}
  </fieldset>
);

const text = (id: string, label: string, value: string | undefined, onChange: (next: string) => void, options: { placeholder?: string; maxLength?: number } = {}) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    <input id={id} maxLength={options.maxLength ?? 40} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={options.placeholder} className={INPUT} />
  </div>
);

const number = (id: string, label: string, value: number | undefined, onChange: (next: number | undefined) => void, options: { min?: number; max?: number } = {}) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    <input id={id} type="number" min={options.min ?? 0} max={options.max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} className={INPUT} />
  </div>
);

const date = (id: string, label: string, value: string | undefined, onChange: (next: string | undefined) => void) => (
  <div>
    <label htmlFor={id} className={LABEL}>{label}</label>
    <input id={id} type="date" value={value?.slice(0, 10) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={INPUT} />
  </div>
);

function select<T extends string>(id: string, label: string, value: T | undefined, labels: Record<T, string>, onChange: (next: T | undefined) => void) {
  return (
    <div>
      <label htmlFor={id} className={LABEL}>{label}</label>
      <select id={id} value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)} className={`${INPUT} cursor-pointer`}>
        <option value="">Choose…</option>
        {(Object.keys(labels) as T[]).map((key) => <option key={key} value={key}>{labels[key]}</option>)}
      </select>
    </div>
  );
}

const thisYear = new Date().getFullYear();

/** A heavy vehicle as on its JPJ ownership certificate (VOC). The numbers are compared with the VOC on submit. */
export const VehicleDetailsFields: React.FC<FieldsProps<VehicleDetailsInput>> = ({ value, onChange }) => {
  const set = <K extends keyof VehicleDetailsInput>(key: K, next: VehicleDetailsInput[K]) => onChange({ ...value, [key]: next });
  return (
    <Group legend="Vehicle details (as on the JPJ VOC)">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {text('vehicle-reg', 'Registration number', value.registrationNumber, (next) => set('registrationNumber', next.toUpperCase()), { placeholder: 'e.g. WXY 1234', maxLength: 20 })}
        {text('vehicle-chassis', 'Chassis number', value.chassisNumber, (next) => set('chassisNumber', next.toUpperCase()), { placeholder: 'No. casis / VIN' })}
        {text('vehicle-engine', 'Engine number', value.engineNumber, (next) => set('engineNumber', next.toUpperCase()), { placeholder: 'No. enjin' })}
        {text('vehicle-make', 'Make', value.make, (next) => set('make', next), { placeholder: 'e.g. Hino, Scania', maxLength: 60 })}
        {text('vehicle-model', 'Model', value.model, (next) => set('model', next), { maxLength: 60 })}
        {number('vehicle-year', 'Year of manufacture', value.yearOfManufacture, (next) => set('yearOfManufacture', next), { min: 1950, max: thisYear + 1 })}
        {select('vehicle-category', 'Category', value.category, VEHICLE_CATEGORY_LABELS, (next) => set('category', next))}
        {text('vehicle-permit', 'APAD permit / licence (optional)', value.permitNumber, (next) => set('permitNumber', next))}
        {date('vehicle-road-tax', 'Road tax expiry', value.roadTaxExpiry, (next) => set('roadTaxExpiry', next))}
        {date('vehicle-insurance', 'Insurance or takaful expiry', value.insuranceExpiry, (next) => set('insuranceExpiry', next))}
        {date('vehicle-inspection', 'PUSPAKOM inspection expiry', value.inspectionExpiry, (next) => set('inspectionExpiry', next))}
      </div>
      <label className={CHECK}>
        <input type="checkbox" checked={Boolean(value.hirePurchase)} onChange={(e) => set('hirePurchase', e.target.checked)} className="accent-emerald-600" />
        Still under hire purchase (the financier has an ownership claim on the VOC)
      </label>
    </Group>
  );
};

/** Machinery or equipment as on its invoice and serial plate; cranes, boilers and pressure vessels also need a JKKP certificate. */
export const MachineDetailsFields: React.FC<FieldsProps<MachineDetailsInput>> = ({ value, onChange }) => {
  const set = <K extends keyof MachineDetailsInput>(key: K, next: MachineDetailsInput[K]) => onChange({ ...value, [key]: next });
  return (
    <Group legend="Machine details (as on the invoice and serial plate)">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {text('machine-manufacturer', 'Manufacturer', value.manufacturer, (next) => set('manufacturer', next), { placeholder: 'e.g. Tadano, Caterpillar', maxLength: 80 })}
        {text('machine-model', 'Model', value.model, (next) => set('model', next), { maxLength: 80 })}
        {text('machine-serial', 'Serial number', value.serialNumber, (next) => set('serialNumber', next.toUpperCase()), { placeholder: 'No. siri, as on the plate', maxLength: 60 })}
        {number('machine-year', 'Year of manufacture', value.yearOfManufacture, (next) => set('yearOfManufacture', next), { min: 1950, max: thisYear + 1 })}
        {date('machine-purchased', 'Purchase date', value.purchaseDate, (next) => set('purchaseDate', next))}
        {number('machine-hours', 'Operating hours (optional)', value.operatingHours, (next) => set('operatingHours', next))}
      </div>
      <label className={CHECK}>
        <input type="checkbox" checked={Boolean(value.requiresDoshCertificate)} onChange={(e) => set('requiresDoshCertificate', e.target.checked)} className="accent-emerald-600" />
        Needs a JKKP certificate of fitness (cranes, hoists, boilers, pressure vessels)
      </label>
      {value.requiresDoshCertificate && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {text('machine-dosh-no', 'JKKP certificate number', value.doshCertificateNumber, (next) => set('doshCertificateNumber', next.toUpperCase()), { placeholder: 'e.g. PMA-SL-123456' })}
          {date('machine-dosh-expiry', 'Certificate expiry', value.doshCertificateExpiry, (next) => set('doshCertificateExpiry', next))}
        </div>
      )}
      <label className={CHECK}>
        <input type="checkbox" checked={Boolean(value.hirePurchase)} onChange={(e) => set('hirePurchase', e.target.checked)} className="accent-emerald-600" />
        Still under hire purchase or leasing
      </label>
    </Group>
  );
};

/** A building on its own title, a strata parcel, or a parcel whose strata title is not issued yet. */
export const BuildingDetailsFields: React.FC<FieldsProps<BuildingDetailsInput>> = ({ value, onChange }) => {
  const set = <K extends keyof BuildingDetailsInput>(key: K, next: BuildingDetailsInput[K]) => onChange({ ...value, [key]: next });
  const strata = value.titleKind === 'STRATA';
  return (
    <Group legend="Building details (as on the title and CCC)">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3">{select('building-title-kind', 'Title', value.titleKind, BUILDING_TITLE_KIND_LABELS, (next) => set('titleKind', next))}</div>
        {strata ? (
          <>
            {text('building-strata-no', 'Strata title number', value.strataTitleNumber, (next) => set('strataTitleNumber', next), { placeholder: 'e.g. GRN 1/M1/2/34' })}
            {text('building-parcel', 'Parcel number', value.parcelNumber, (next) => set('parcelNumber', next), { placeholder: 'e.g. A-12-3' })}
            {text('building-storey', 'Storey', value.storey, (next) => set('storey', next), { maxLength: 20 })}
          </>
        ) : value.titleKind && (
          <>
            {text('building-title-no', 'Title number', value.titleNumber, (next) => set('titleNumber', next), { placeholder: 'e.g. GRN 11223' })}
            {text('building-lot', 'Lot number', value.lotNumber, (next) => set('lotNumber', next))}
            {text('building-mukim', 'Mukim / town', value.mukim, (next) => set('mukim', next), { maxLength: 80 })}
            {text('building-district', 'District', value.district, (next) => set('district', next), { maxLength: 80 })}
            <div>
              <label htmlFor="building-state" className={LABEL}>State</label>
              <select id="building-state" value={value.state ?? ''} onChange={(e) => set('state', e.target.value || undefined)} className={`${INPUT} cursor-pointer`}>
                <option value="">Choose…</option>
                {MALAYSIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>
            {value.titleKind === 'MASTER_TITLE' && text('building-parcel', 'Parcel number (from the sale agreement)', value.parcelNumber, (next) => set('parcelNumber', next))}
          </>
        )}
        {text('building-name', 'Building name (optional)', value.buildingName, (next) => set('buildingName', next), { maxLength: 120 })}
        {select('building-use', 'Use', value.buildingUse, BUILDING_USE_LABELS, (next) => set('buildingUse', next))}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          {number('building-area', 'Floor area', value.floorArea, (next) => set('floorArea', next))}
          <div>
            <label htmlFor="building-area-unit" className={LABEL}>Unit</label>
            <select id="building-area-unit" value={value.floorAreaUnit ?? 'SQ_FEET'} onChange={(e) => set('floorAreaUnit', e.target.value as BuildingDetailsInput['floorAreaUnit'])} className={`${INPUT} cursor-pointer`}>
              {(Object.keys(FLOOR_AREA_UNIT_LABELS) as Array<keyof typeof FLOOR_AREA_UNIT_LABELS>).map((unit) => <option key={unit} value={unit}>{FLOOR_AREA_UNIT_LABELS[unit]}</option>)}
            </select>
          </div>
        </div>
        {number('building-year', 'Year completed', value.yearCompleted, (next) => set('yearCompleted', next), { min: 1800, max: thisYear })}
        {text('building-ccc', 'CCC / CF number (optional)', value.completionCertificateNumber, (next) => set('completionCertificateNumber', next), { maxLength: 60 })}
      </div>
      <label className={CHECK}>
        <input type="checkbox" checked={Boolean(value.hasTenants)} onChange={(e) => set('hasTenants', e.target.checked)} className="accent-emerald-600" />
        The building is let to tenants
      </label>
      {value.hasTenants && (
        <div>
          <label htmlFor="building-tenants" className={LABEL}>What the tenants do there</label>
          <input id="building-tenants" maxLength={300} value={value.tenantActivity ?? ''} onChange={(e) => set('tenantActivity', e.target.value)} placeholder="e.g. clinic, grocery store, warehouse for a logistics company" className={INPUT} />
          <p className="mt-1 text-[11px] text-slate-500">Rent from a business that is not Shariah-compliant cannot be distributed to investors.</p>
        </div>
      )}
    </Group>
  );
};
