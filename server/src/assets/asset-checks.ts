import { CheckFinding } from '../kyc/checks/check-types';
import { DocumentText } from '../kyc/checks/document-text-reader';
import { closestLine, datesInText, nameOnDocument, PROOF_OF_ADDRESS_MAX_AGE_DAYS } from '../kyc/checks/providers/document-content.provider';

/** Land title details as saved on the asset (see LandDetailsDto). */
export interface LandDetails {
  titleType?: string;
  titleNumber?: string;
  lotNumber?: string;
  mukim?: string;
  district?: string;
  state?: string;
  areaValue?: number;
  areaUnit?: string;
  landUseCategory?: string;
  tenure?: string;
  leaseExpiry?: string;
  ownershipShare?: string;
  malayReserve?: boolean;
  restrictions?: string;
}

/** Documents an asset must have before it is submitted. Land also needs a current official search. */
export function requiredDocuments(assetType: string): string[] {
  return assetType === 'LAND' ? ['OWNERSHIP', 'OFFICIAL_SEARCH'] : ['OWNERSHIP'];
}

/** Title fields still missing before a land asset can be submitted. */
export function landGaps(land: LandDetails | null | undefined): string[] {
  const gaps: string[] = [];
  const need = (value: unknown, label: string) => { if (value === undefined || value === null || value === '') gaps.push(label); };
  need(land?.titleType, 'title type');
  need(land?.titleNumber, 'title number');
  need(land?.lotNumber, 'lot number');
  need(land?.mukim, 'mukim');
  need(land?.district, 'district');
  need(land?.state, 'state');
  need(land?.areaValue, 'area');
  need(land?.landUseCategory, 'land use category');
  need(land?.tenure, 'freehold or leasehold');
  if (land?.tenure === 'LEASEHOLD') need(land?.leaseExpiry, 'lease expiry date');
  return gaps;
}

const norm = (value: string | undefined) => (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The same lot in the same mukim, district and state is the same land, whoever registers it. */
export function landIdentityKey(land: LandDetails | null | undefined): string | null {
  if (!land?.lotNumber || !land.mukim || !land.state) return null;
  return `LAND:${norm(land.state)}|${norm(land.district)}|${norm(land.mukim)}|${norm(land.lotNumber)}`;
}

/** Whether a reference (title or lot number) appears on the document, ignoring spacing and punctuation. */
function referenceOnDocument(reference: string | undefined, text: string): 'MATCH' | 'MISMATCH' | 'NOT_FOUND' {
  const wanted = norm(reference);
  if (wanted.length < 2 || !text.trim()) return 'NOT_FOUND';
  return norm(text).includes(wanted) ? 'MATCH' : 'MISMATCH';
}

const ENCUMBRANCE = /\b(GADAIAN|CHARGE|KAVEAT|CAVEAT|LIEN|TEGAHAN|PROHIBITORY ORDER)\b/i;
const MALAY_RESERVE = /\b(RIZAB MELAYU|MALAY RESERVE|TANAH SIMPANAN MELAYU)\b/i;

export interface CheckedDocument {
  documentType: string;
  text: DocumentText | null;
  metadata?: { latitude?: number; longitude?: number } | null;
}

export interface CheckedAsset {
  assetType: string;
  ownerName: string;
  isEncumbered: boolean;
  latitude: number | null;
  longitude: number | null;
  land: LandDetails | null;
}

const LABELS: Record<string, string> = { OWNERSHIP: 'land title (geran)', OFFICIAL_SEARCH: 'official search (Carian Rasmi)', QUIT_RENT: 'quit rent receipt (cukai tanah)', SITE_PHOTO: 'site photo' };

/** Kilometres between two points (haversine). */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Reads what the asset's documents say and compares it with what the owner entered. Advisory,
 * like the KYC document checks: a mismatch is for the reviewer to look at, never a decision.
 */
export function checkAssetDocuments(asset: CheckedAsset, documents: CheckedDocument[], now = new Date()): CheckFinding[] {
  const findings: CheckFinding[] = [];
  const latest = (type: string) => documents.filter((document) => document.documentType === type).pop();
  const unreadable = (type: string) => findings.push({ source: LABELS[type] ?? type, field: 'Readable text', result: 'NOT_FOUND', note: 'No text could be read (blurred, very dark, or a PDF stored in an unusual image format). Check this document by eye, or upload a clearer photo of it.' });

  if (asset.assetType === 'LAND' && asset.land) {
    const land = asset.land;
    for (const type of ['OWNERSHIP', 'OFFICIAL_SEARCH']) {
      const document = latest(type);
      if (!document) continue;
      const text = document.text?.text ?? '';
      if (!text.trim()) { unreadable(type); continue; }
      const source = LABELS[type];
      for (const [field, value] of [['Title number', land.titleNumber], ['Lot number', land.lotNumber]] as const) {
        const result = referenceOnDocument(value, text);
        findings.push({ source, field, result, entered: value, ...(result !== 'MATCH' ? { found: closestLine(value ?? '', text) } : {}) });
      }
      const mukim = referenceOnDocument(land.mukim, text);
      findings.push({ source, field: 'Mukim', result: mukim, entered: land.mukim, ...(mukim !== 'MATCH' ? { found: closestLine(land.mukim ?? '', text) } : {}) });
    }

    const search = latest('OFFICIAL_SEARCH');
    const searchText = search?.text?.text ?? '';
    if (search && searchText.trim()) {
      const source = LABELS.OFFICIAL_SEARCH;
      // The search shows the registered owner today; the title copy may be out of date.
      const owner = nameOnDocument(asset.ownerName, searchText);
      findings.push({ source, field: 'Registered owner', result: owner, entered: asset.ownerName, ...(owner !== 'MATCH' ? { found: closestLine(asset.ownerName, searchText), note: 'The owner on the search must be the registering organisation or person; otherwise ask for proof of the right to deal with the land.' } : {}) });
      const today = now.toISOString().slice(0, 10);
      const dates = datesInText(searchText).filter((date) => date <= today).sort();
      const searched = dates[dates.length - 1];
      const ageDays = searched ? (now.getTime() - new Date(`${searched}T00:00:00Z`).getTime()) / 86_400_000 : null;
      findings.push({ source, field: 'Search date', result: ageDays === null ? 'NOT_FOUND' : ageDays <= PROOF_OF_ADDRESS_MAX_AGE_DAYS ? 'MATCH' : 'MISMATCH', entered: 'Under 3 months old', ...(searched ? { found: searched } : {}), ...(ageDays !== null && ageDays > PROOF_OF_ADDRESS_MAX_AGE_DAYS ? { note: 'An older search may not show a charge or caveat registered since. Ask for a new one.' } : {}) });
      const charge = searchText.match(ENCUMBRANCE)?.[0];
      if (charge && !asset.isEncumbered) findings.push({ source, field: 'Charge or caveat', result: 'MISMATCH', entered: 'Not charged (declared)', found: closestLine(charge, searchText) ?? charge, note: 'The search mentions a charge, caveat or prohibitory order, but the owner declared the land free of charges.' });
      else if (charge) findings.push({ source, field: 'Charge or caveat', result: 'MATCH', entered: 'Charged (declared)', found: closestLine(charge, searchText) ?? charge });
      else if (asset.isEncumbered) findings.push({ source, field: 'Charge or caveat', result: 'INFO', entered: 'Charged (declared)', note: 'The owner declared a charge, but none was read on the search. Check the search by eye.' });
      const reserve = MALAY_RESERVE.test(searchText);
      if (reserve !== Boolean(land.malayReserve)) findings.push({ source, field: 'Malay reserve land', result: reserve ? 'MISMATCH' : 'INFO', entered: land.malayReserve ? 'Yes' : 'No', found: reserve ? 'Malay reserve wording found' : 'No Malay reserve wording read', note: reserve ? 'Malay reserve land can only be dealt with as the Malay Reservations Enactment of the state allows.' : undefined });
    }

    const rent = latest('QUIT_RENT');
    if (rent) {
      const text = rent.text?.text ?? '';
      if (!text.trim()) unreadable('QUIT_RENT');
      else {
        const year = now.getUTCFullYear();
        const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0])).filter((value) => value <= year);
        const newest = years.length ? Math.max(...years) : null;
        findings.push({ source: LABELS.QUIT_RENT, field: 'Year paid', result: newest === null ? 'NOT_FOUND' : newest >= year - 1 ? 'MATCH' : 'MISMATCH', entered: `${year - 1} or ${year}`, ...(newest ? { found: String(newest) } : {}), ...(newest !== null && newest < year - 1 ? { note: 'Quit rent appears unpaid for recent years; arrears can lead to forfeiture of the land.' } : {}) });
      }
    }

    if (land.tenure === 'LEASEHOLD' && land.leaseExpiry) {
      const years = (new Date(land.leaseExpiry).getTime() - now.getTime()) / (365.25 * 86_400_000);
      findings.push({ source: 'details entered', field: 'Lease remaining', result: years < 0 ? 'MISMATCH' : 'INFO', found: years < 0 ? 'Expired' : `${Math.floor(years)} years`, note: years < 0 ? 'The lease has expired.' : 'An Ijarah or Musharakah may not run beyond the remaining lease.' });
    }
  }

  // Any asset: a site photo taken far from the pinned location deserves a look.
  const photo = latest('SITE_PHOTO');
  if (photo) {
    const where = photo.metadata;
    const pinned = asset.latitude !== null && asset.longitude !== null;
    if (!where || typeof where.latitude !== 'number' || typeof where.longitude !== 'number') {
      findings.push({ source: LABELS.SITE_PHOTO, field: 'Photo location', result: 'NOT_FOUND', note: 'The photo has no location. Take it with the camera button on site and allow location access.' });
    } else if (!pinned) {
      findings.push({ source: LABELS.SITE_PHOTO, field: 'Photo location', result: 'INFO', found: `${where.latitude.toFixed(5)}, ${where.longitude.toFixed(5)}`, note: 'No map pin was set for the asset to compare with.' });
    } else {
      const km = distanceKm({ latitude: asset.latitude!, longitude: asset.longitude! }, { latitude: where.latitude, longitude: where.longitude });
      findings.push({ source: LABELS.SITE_PHOTO, field: 'Photo location', result: km <= 2 ? 'MATCH' : 'MISMATCH', entered: 'Within 2 km of the map pin', found: km < 1 ? `${Math.round(km * 1000)} m from the pin` : `${km.toFixed(1)} km from the pin` });
    }
  }
  return findings;
}
