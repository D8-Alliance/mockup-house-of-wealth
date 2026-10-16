import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500';
const LABEL = 'text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1';

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onChange: (latitude: number | undefined, longitude: number | undefined) => void;
}

const valid = (latitude?: number, longitude?: number) => typeof latitude === 'number' && typeof longitude === 'number' && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

/** OpenStreetMap preview of a point, without an API key or a map library. */
export function mapEmbedUrl(latitude: number, longitude: number): string {
  const d = 0.01;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - d}%2C${latitude - d}%2C${longitude + d}%2C${latitude + d}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

export function mapLinkUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Where the asset is: typed in (e.g. copied from Google Maps), or the phone's position when the
 * owner stands at the asset. A site photo taken later is compared with this pin.
 */
export const LocationPicker: React.FC<LocationPickerProps> = ({ latitude, longitude, onChange }) => {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCurrent = () => {
    if (!navigator.geolocation) { setError('This browser cannot read your location.'); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => { onChange(Number(position.coords.latitude.toFixed(6)), Number(position.coords.longitude.toFixed(6))); setLocating(false); },
      (cause) => { setError(cause.code === cause.PERMISSION_DENIED ? 'Location access was blocked. Allow it for this site, or type the coordinates.' : 'Your location could not be read. Type the coordinates instead.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const parse = (value: string) => (value.trim() === '' ? undefined : Number(value));

  return (
    <fieldset className="sm:col-span-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
      <legend className="px-2 text-xs font-black text-slate-600 dark:text-slate-300 uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Map location</legend>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label htmlFor="asset-lat" className={LABEL}>Latitude</label>
          <input id="asset-lat" type="number" step="0.000001" min={-90} max={90} value={latitude ?? ''} onChange={(e) => onChange(parse(e.target.value), longitude)} placeholder="e.g. 2.943700" className={INPUT} />
        </div>
        <div>
          <label htmlFor="asset-lng" className={LABEL}>Longitude</label>
          <input id="asset-lng" type="number" step="0.000001" min={-180} max={180} value={longitude ?? ''} onChange={(e) => onChange(latitude, parse(e.target.value))} placeholder="e.g. 101.843700" className={INPUT} />
        </div>
        <button type="button" disabled={locating} onClick={useCurrent} className="px-4 py-2.5 rounded-xl border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer disabled:opacity-60">{locating ? 'Locating…' : 'Use my current location'}</button>
      </div>
      <p className="text-[11px] text-slate-500">Use your location when you are at the asset, or copy the coordinates from Google Maps (press and hold on the spot).</p>
      {error && <p className="text-[11px] font-bold text-amber-600">{error}</p>}
      {valid(latitude, longitude) && (
        <div className="space-y-1">
          <iframe title="Asset location map" src={mapEmbedUrl(latitude!, longitude!)} className="w-full h-48 rounded-xl border border-slate-200 dark:border-slate-700" loading="lazy" />
          <a href={mapLinkUrl(latitude!, longitude!)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-600 hover:underline">Open in Google Maps</a>
        </div>
      )}
    </fieldset>
  );
};
