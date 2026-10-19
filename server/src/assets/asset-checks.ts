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

/** A heavy vehicle (see VehicleDetailsDto). */
export interface VehicleDetails {
  registrationNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  make?: string;
  model?: string;
  yearOfManufacture?: number;
  category?: string;
  roadTaxExpiry?: string;
  insuranceExpiry?: string;
  inspectionExpiry?: string;
  permitNumber?: string;
  hirePurchase?: boolean;
}

/** Machinery or equipment (see MachineDetailsDto). */
export interface MachineDetails {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  yearOfManufacture?: number;
  purchaseDate?: string;
  operatingHours?: number;
  requiresDoshCertificate?: boolean;
  doshCertificateNumber?: string;
  doshCertificateExpiry?: string;
  hirePurchase?: boolean;
}

/** A building (see BuildingDetailsDto). */
export interface BuildingDetails {
  titleKind?: string;
  titleNumber?: string;
  lotNumber?: string;
  mukim?: string;
  district?: string;
  state?: string;
  strataTitleNumber?: string;
  parcelNumber?: string;
  storey?: string;
  buildingName?: string;
  buildingUse?: string;
  floorArea?: number;
  floorAreaUnit?: string;
  yearCompleted?: number;
  completionCertificateNumber?: string;
  hasTenants?: boolean;
  tenantActivity?: string;
}

export type AssetDetails = LandDetails & VehicleDetails & MachineDetails & BuildingDetails;

const isMachine = (assetType: string) => assetType === 'MACHINERY' || assetType === 'EQUIPMENT';

/** Documents an asset must have before it is submitted. */
export function requiredDocuments(assetType: string, details?: AssetDetails | null): string[] {
  if (assetType === 'LAND') return ['OWNERSHIP', 'OFFICIAL_SEARCH'];
  if (assetType === 'BUILDING') return ['OWNERSHIP', 'COMPLETION_CERT'];
  // The serial plate ties the paperwork to the machine standing on site.
  if (isMachine(assetType)) return ['OWNERSHIP', 'SERIAL_PLATE', ...(details?.requiresDoshCertificate ? ['DOSH_CERTIFICATE'] : [])];
  return ['OWNERSHIP'];
}

/** Sabah and Sarawak titles are not divided into mukims (Sarawak uses land districts and blocks). */
export function usesMukim(state: string | undefined): boolean {
  return !/^(sabah|sarawak)$/i.test((state ?? '').trim());
}

const need = (gaps: string[], value: unknown, label: string) => { if (value === undefined || value === null || value === '') gaps.push(label); };

/** Title fields still missing before a land asset can be submitted. */
export function landGaps(land: LandDetails | null | undefined): string[] {
  const gaps: string[] = [];
  need(gaps, land?.titleType, 'title type');
  need(gaps, land?.titleNumber, 'title number');
  need(gaps, land?.lotNumber, 'lot number');
  if (usesMukim(land?.state)) need(gaps, land?.mukim, 'mukim');
  need(gaps, land?.district, 'district');
  need(gaps, land?.state, 'state');
  need(gaps, land?.areaValue, 'area');
  need(gaps, land?.landUseCategory, 'land use category');
  need(gaps, land?.tenure, 'freehold or leasehold');
  if (land?.tenure === 'LEASEHOLD') need(gaps, land?.leaseExpiry, 'lease expiry date');
  return gaps;
}

/** Details still missing before an asset of this type can be submitted. */
export function detailGaps(assetType: string, details: AssetDetails | null | undefined): string[] {
  if (assetType === 'LAND') return landGaps(details);
  const gaps: string[] = [];
  if (assetType === 'VEHICLE') {
    need(gaps, details?.registrationNumber, 'registration number');
    need(gaps, details?.chassisNumber, 'chassis number');
    need(gaps, details?.engineNumber, 'engine number');
    need(gaps, details?.make, 'make');
    need(gaps, details?.yearOfManufacture, 'year of manufacture');
  } else if (isMachine(assetType)) {
    need(gaps, details?.manufacturer, 'manufacturer');
    need(gaps, details?.model, 'model');
    need(gaps, details?.serialNumber, 'serial number');
    if (details?.requiresDoshCertificate) {
      need(gaps, details?.doshCertificateNumber, 'JKKP certificate number');
      need(gaps, details?.doshCertificateExpiry, 'JKKP certificate expiry');
    }
  } else if (assetType === 'BUILDING') {
    need(gaps, details?.titleKind, 'title kind');
    if (details?.titleKind === 'STRATA') {
      need(gaps, details?.strataTitleNumber, 'strata title number');
      need(gaps, details?.parcelNumber, 'parcel number');
    } else if (details?.titleKind) {
      need(gaps, details?.titleNumber, 'title number');
      need(gaps, details?.lotNumber, 'lot number');
      if (usesMukim(details?.state)) need(gaps, details?.mukim, 'mukim');
      need(gaps, details?.state, 'state');
      if (details.titleKind === 'MASTER_TITLE') need(gaps, details?.parcelNumber, 'parcel number');
    }
    need(gaps, details?.buildingUse, 'building use');
    need(gaps, details?.floorArea, 'floor area');
    need(gaps, details?.yearCompleted, 'year completed');
    if (details?.hasTenants) need(gaps, details?.tenantActivity, "tenants' business");
  }
  return gaps;
}

const norm = (value: string | undefined) => (value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** The same lot in the same mukim (or, in Sabah and Sarawak, district), district and state is the same land, whoever registers it. */
export function landIdentityKey(land: LandDetails | null | undefined): string | null {
  if (!land?.lotNumber || !land.state || (usesMukim(land.state) ? !land.mukim : !land.district)) return null;
  return `LAND:${norm(land.state)}|${norm(land.district)}|${norm(land.mukim)}|${norm(land.lotNumber)}`;
}

/**
 * What makes this asset the same asset if registered again: the lot for land, the chassis number for a
 * vehicle, manufacturer and serial number for a machine, the title and parcel for a building.
 */
export function assetIdentityKey(assetType: string, details: AssetDetails | null | undefined): string | null {
  if (!details) return null;
  if (assetType === 'LAND') return landIdentityKey(details);
  if (assetType === 'VEHICLE') return details.chassisNumber && norm(details.chassisNumber).length >= 5 ? `VEHICLE:${norm(details.chassisNumber)}` : null;
  if (isMachine(assetType)) return details.serialNumber && details.manufacturer ? `MACHINE:${norm(details.manufacturer)}|${norm(details.serialNumber)}` : null;
  if (assetType === 'BUILDING') {
    if (details.titleKind === 'STRATA') return details.strataTitleNumber && details.parcelNumber ? `STRATA:${norm(details.strataTitleNumber)}|${norm(details.parcelNumber)}` : null;
    const lot = landIdentityKey(details);
    if (!lot) return null;
    return details.titleKind === 'MASTER_TITLE' ? `PARCEL:${lot}|${norm(details.parcelNumber)}` : `BUILDING:${lot}`;
  }
  return null;
}

/** Letters and digits OCR mistakes for each other (O/0, I/1, B/8...), folded to one form for comparing. */
const ocrFold = (value: string) => value.replace(/[OQ]/g, '0').replace(/[IL]/g, '1').replace(/Z/g, '2').replace(/S/g, '5').replace(/G/g, '6').replace(/B/g, '8');

/**
 * Whether a reference (title, lot, chassis or serial number) appears on the document, ignoring spacing
 * and punctuation. 'OCR_MATCH': it appears once letters OCR confuses with digits are allowed for.
 */
function referenceOnDocument(reference: string | undefined, text: string): 'MATCH' | 'OCR_MATCH' | 'MISMATCH' | 'NOT_FOUND' {
  const wanted = norm(reference);
  if (wanted.length < 2 || !text.trim()) return 'NOT_FOUND';
  if (norm(text).includes(wanted)) return 'MATCH';
  return wanted.length >= 4 && ocrFold(norm(text)).includes(ocrFold(wanted)) ? 'OCR_MATCH' : 'MISMATCH';
}

const ENCUMBRANCE = /\b(GADAIAN|CHARGE|KAVEAT|CAVEAT|LIEN|TEGAHAN|PROHIBITORY ORDER)\b/i;
const MALAY_RESERVE = /\b(RIZAB MELAYU|MALAY RESERVE|TANAH SIMPANAN MELAYU)\b/i;
/** A financier's ownership claim on a vehicle or machine under hire purchase. */
const HIRE_PURCHASE = /\b(TUNTUTAN HAK ?MILIK|HAK ?MILIK TUNTUTAN|HIRE[ -]PURCHASE|SEWA ?BELI|OWNERSHIP CLAIM)\b/i;
const COMPLETION = /\b(PERAKUAN SIAP DAN PEMATUHAN|CERTIFICATE OF COMPLETION AND COMPLIANCE|CCC|SIJIL LAYAK MENDUDUKI|CERTIFICATE OF FITNESS FOR OCCUPATION|CFO)\b/i;
/** Tenant businesses that are not Shariah-compliant; a match is for the Shariah reviewer to look at. */
const NON_COMPLIANT_ACTIVITY = /\b(bar|pub|alcohol|arak|liquor|beer|wine|casino|gambling|judi|betting|lottery|nightclub|karaoke|pork|babi|conventional bank|insurance company|loan ?shark|ah ?long)\b/i;

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
  /** Where the owner says it is, for comparing with an assessment bill. */
  location?: string;
  details: AssetDetails | null;
}

const LABELS: Record<string, string> = {
  OFFICIAL_SEARCH: 'official search (Carian Rasmi)',
  QUIT_RENT: 'quit rent receipt (cukai tanah)',
  SERIAL_PLATE: 'serial plate photo',
  DOSH_CERTIFICATE: 'JKKP certificate (PMA)',
  INSPECTION: 'PUSPAKOM inspection',
  ROAD_TAX: 'road tax (LKM)',
  ASSESSMENT: 'assessment bill (cukai pintu)',
  COMPLETION_CERT: 'completion certificate (CCC)',
  SITE_PHOTO: 'site photo',
};

/** The proof of ownership is a different document for each type of asset. */
function ownershipLabel(assetType: string): string {
  if (assetType === 'LAND') return 'land title (geran)';
  if (assetType === 'VEHICLE') return 'JPJ ownership certificate (VOC)';
  if (isMachine(assetType)) return 'purchase invoice';
  if (assetType === 'BUILDING') return 'title or sale agreement';
  return 'proof of ownership';
}

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
  const details = asset.details ?? {};
  const label = (type: string) => (type === 'OWNERSHIP' ? ownershipLabel(asset.assetType) : LABELS[type] ?? type);
  const latest = (type: string) => documents.filter((document) => document.documentType === type).pop();
  /** The text of the latest document of this type, or null (with a finding) when it cannot be read. */
  const textOf = (type: string): string | null => {
    const document = latest(type);
    if (!document) return null;
    const text = document.text?.text ?? '';
    if (!text.trim()) {
      findings.push({ source: label(type), field: 'Readable text', result: 'NOT_FOUND', note: 'No text could be read (blurred, very dark, or a PDF stored in an unusual image format). Check this document by eye, or upload a clearer photo of it.' });
      return null;
    }
    return text;
  };
  const reference = (type: string, field: string, value: string | undefined, text: string) => {
    if (!value) return;
    const result = referenceOnDocument(value, text);
    if (result === 'OCR_MATCH') {
      findings.push({ source: label(type), field, result: 'MATCH', entered: value, found: closestLine(value, text), note: 'Matches once characters the text reader often confuses (O and 0, I and 1, B and 8) are allowed for. Glance at the document to confirm.' });
      return;
    }
    findings.push({ source: label(type), field, result, entered: value, ...(result !== 'MATCH' ? { found: closestLine(value, text) } : {}) });
  };
  const owner = (type: string, text: string, note: string) => {
    const result = nameOnDocument(asset.ownerName, text);
    findings.push({ source: label(type), field: 'Registered owner', result, entered: asset.ownerName, ...(result !== 'MATCH' ? { found: closestLine(asset.ownerName, text), note } : {}) });
  };
  const today = now.toISOString().slice(0, 10);
  /** An expiry date the owner entered: expired is a mismatch, within 30 days a note. */
  const expiry = (field: string, value: string | undefined) => {
    if (!value) return;
    const days = (new Date(value).getTime() - now.getTime()) / 86_400_000;
    findings.push({ source: 'details entered', field, result: days < 0 ? 'MISMATCH' : days <= 30 ? 'INFO' : 'MATCH', entered: value.slice(0, 10), ...(days < 0 ? { note: 'Expired. Ask for a renewed one before verifying.' } : days <= 30 ? { note: `Expires in ${Math.ceil(days)} days.` } : {}) });
  };
  /** A financier's claim found on the documents but not declared by the owner. */
  const financierClaim = (type: string, text: string, declared: boolean) => {
    const claim = text.match(HIRE_PURCHASE)?.[0];
    if (claim && !declared) findings.push({ source: label(type), field: 'Hire purchase claim', result: 'MISMATCH', entered: 'Owned outright (declared)', found: closestLine(claim, text) ?? claim, note: 'The document shows a financier\'s ownership claim, but the owner declared no hire purchase or charge. Until it is settled the financier must consent to any lease or sale.' });
    else if (claim) findings.push({ source: label(type), field: 'Hire purchase claim', result: 'MATCH', entered: 'Under hire purchase (declared)', found: closestLine(claim, text) ?? claim });
  };

  if (asset.assetType === 'LAND') {
    for (const type of ['OWNERSHIP', 'OFFICIAL_SEARCH']) {
      const text = textOf(type);
      if (!text) continue;
      reference(type, 'Title number', details.titleNumber, text);
      reference(type, 'Lot number', details.lotNumber, text);
      reference(type, 'Mukim', details.mukim, text);
    }
    const searchText = latest('OFFICIAL_SEARCH')?.text?.text ?? '';
    if (searchText.trim()) {
      const source = label('OFFICIAL_SEARCH');
      // The search shows the registered owner today; the title copy may be out of date.
      owner('OFFICIAL_SEARCH', searchText, 'The owner on the search must be the registering organisation or person; otherwise ask for proof of the right to deal with the land.');
      const dates = datesInText(searchText).filter((date) => date <= today).sort();
      const searched = dates[dates.length - 1];
      const ageDays = searched ? (now.getTime() - new Date(`${searched}T00:00:00Z`).getTime()) / 86_400_000 : null;
      findings.push({ source, field: 'Search date', result: ageDays === null ? 'NOT_FOUND' : ageDays <= PROOF_OF_ADDRESS_MAX_AGE_DAYS ? 'MATCH' : 'MISMATCH', entered: 'Under 3 months old', ...(searched ? { found: searched } : {}), ...(ageDays !== null && ageDays > PROOF_OF_ADDRESS_MAX_AGE_DAYS ? { note: 'An older search may not show a charge or caveat registered since. Ask for a new one.' } : {}) });
      const charge = searchText.match(ENCUMBRANCE)?.[0];
      if (charge && !asset.isEncumbered) findings.push({ source, field: 'Charge or caveat', result: 'MISMATCH', entered: 'Not charged (declared)', found: closestLine(charge, searchText) ?? charge, note: 'The search mentions a charge, caveat or prohibitory order, but the owner declared the land free of charges.' });
      else if (charge) findings.push({ source, field: 'Charge or caveat', result: 'MATCH', entered: 'Charged (declared)', found: closestLine(charge, searchText) ?? charge });
      else if (asset.isEncumbered) findings.push({ source, field: 'Charge or caveat', result: 'INFO', entered: 'Charged (declared)', note: 'The owner declared a charge, but none was read on the search. Check the search by eye.' });
      const reserve = MALAY_RESERVE.test(searchText);
      if (reserve !== Boolean(details.malayReserve)) findings.push({ source, field: 'Malay reserve land', result: reserve ? 'MISMATCH' : 'INFO', entered: details.malayReserve ? 'Yes' : 'No', found: reserve ? 'Malay reserve wording found' : 'No Malay reserve wording read', note: reserve ? 'Malay reserve land can only be dealt with as the Malay Reservations Enactment of the state allows.' : undefined });
    }
    const rentText = textOf('QUIT_RENT');
    if (rentText) {
      const year = now.getUTCFullYear();
      const years = [...rentText.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0])).filter((value) => value <= year);
      const newest = years.length ? Math.max(...years) : null;
      findings.push({ source: label('QUIT_RENT'), field: 'Year paid', result: newest === null ? 'NOT_FOUND' : newest >= year - 1 ? 'MATCH' : 'MISMATCH', entered: `${year - 1} or ${year}`, ...(newest ? { found: String(newest) } : {}), ...(newest !== null && newest < year - 1 ? { note: 'Quit rent appears unpaid for recent years; arrears can lead to forfeiture of the land.' } : {}) });
    }
    if (details.tenure === 'LEASEHOLD' && details.leaseExpiry) {
      const years = (new Date(details.leaseExpiry).getTime() - now.getTime()) / (365.25 * 86_400_000);
      findings.push({ source: 'details entered', field: 'Lease remaining', result: years < 0 ? 'MISMATCH' : 'INFO', found: years < 0 ? 'Expired' : `${Math.floor(years)} years`, note: years < 0 ? 'The lease has expired.' : 'An Ijarah or Musharakah may not run beyond the remaining lease.' });
    }
  }

  if (asset.assetType === 'VEHICLE') {
    const voc = textOf('OWNERSHIP');
    if (voc) {
      reference('OWNERSHIP', 'Registration number', details.registrationNumber, voc);
      reference('OWNERSHIP', 'Chassis number', details.chassisNumber, voc);
      reference('OWNERSHIP', 'Engine number', details.engineNumber, voc);
      owner('OWNERSHIP', voc, 'The registered owner on the VOC must be the registering organisation or person.');
      financierClaim('OWNERSHIP', voc, Boolean(details.hirePurchase) || asset.isEncumbered);
    }
    const inspection = textOf('INSPECTION');
    if (inspection) {
      reference('INSPECTION', 'Registration number', details.registrationNumber, inspection);
      reference('INSPECTION', 'Chassis number', details.chassisNumber, inspection);
    }
    expiry('Road tax expiry', details.roadTaxExpiry);
    expiry('Insurance or takaful expiry', details.insuranceExpiry);
    expiry('PUSPAKOM inspection expiry', details.inspectionExpiry);
  }

  if (isMachine(asset.assetType)) {
    const invoice = textOf('OWNERSHIP');
    if (invoice) {
      reference('OWNERSHIP', 'Serial number', details.serialNumber, invoice);
      reference('OWNERSHIP', 'Model', details.model, invoice);
      owner('OWNERSHIP', invoice, 'The buyer on the invoice must be the registering organisation or person; otherwise ask for proof of transfer.');
      financierClaim('OWNERSHIP', invoice, Boolean(details.hirePurchase) || asset.isEncumbered);
    }
    // The plate is on the machine itself: a matching serial ties the invoice to what is on site.
    const plate = textOf('SERIAL_PLATE');
    if (plate) {
      reference('SERIAL_PLATE', 'Serial number', details.serialNumber, plate);
      reference('SERIAL_PLATE', 'Manufacturer', details.manufacturer, plate);
    }
    const certificate = textOf('DOSH_CERTIFICATE');
    if (certificate) {
      reference('DOSH_CERTIFICATE', 'Certificate number', details.doshCertificateNumber, certificate);
      reference('DOSH_CERTIFICATE', 'Serial number', details.serialNumber, certificate);
    }
    if (details.requiresDoshCertificate) expiry('JKKP certificate expiry', details.doshCertificateExpiry);
  }

  if (asset.assetType === 'BUILDING') {
    const title = textOf('OWNERSHIP');
    if (title) {
      if (details.titleKind === 'STRATA') {
        reference('OWNERSHIP', 'Strata title number', details.strataTitleNumber, title);
        reference('OWNERSHIP', 'Parcel number', details.parcelNumber, title);
      } else {
        reference('OWNERSHIP', 'Title number', details.titleNumber, title);
        reference('OWNERSHIP', 'Lot number', details.lotNumber, title);
        if (details.titleKind === 'MASTER_TITLE') reference('OWNERSHIP', 'Parcel number', details.parcelNumber, title);
      }
      owner('OWNERSHIP', title, details.titleKind === 'MASTER_TITLE' ? 'Before the strata title is issued, the buyer named in the sale agreement must be the registering organisation or person.' : 'The owner on the title must be the registering organisation or person.');
      const charge = title.match(ENCUMBRANCE)?.[0];
      if (charge && !asset.isEncumbered) findings.push({ source: label('OWNERSHIP'), field: 'Charge or caveat', result: 'MISMATCH', entered: 'Not charged (declared)', found: closestLine(charge, title) ?? charge, note: 'The document mentions a charge or caveat, but the owner declared the building free of charges.' });
    }
    const assessment = textOf('ASSESSMENT');
    if (assessment) {
      owner('ASSESSMENT', assessment, 'The assessment bill is usually in the registered owner\'s name.');
      const year = now.getUTCFullYear();
      const years = [...assessment.matchAll(/\b(19|20)\d{2}\b/g)].map((match) => Number(match[0])).filter((value) => value <= year);
      const newest = years.length ? Math.max(...years) : null;
      findings.push({ source: label('ASSESSMENT'), field: 'Year', result: newest === null ? 'NOT_FOUND' : newest >= year - 1 ? 'MATCH' : 'MISMATCH', entered: `${year - 1} or ${year}`, ...(newest ? { found: String(newest) } : {}) });
    }
    const completion = textOf('COMPLETION_CERT');
    if (completion) {
      const found = completion.match(COMPLETION)?.[0];
      findings.push({ source: label('COMPLETION_CERT'), field: 'Certificate', result: found ? 'MATCH' : 'NOT_FOUND', entered: 'CCC or certificate of fitness', ...(found ? { found: closestLine(found, completion) ?? found } : { note: 'No completion wording was read. Check the document is a CCC or certificate of fitness for occupation.' }) });
      reference('COMPLETION_CERT', 'Certificate number', details.completionCertificateNumber, completion);
    }
    if (details.hasTenants) {
      const activity = details.tenantActivity ?? '';
      const flagged = activity.match(NON_COMPLIANT_ACTIVITY)?.[0];
      findings.push({ source: 'details entered', field: "Tenants' business", result: flagged ? 'MISMATCH' : 'INFO', entered: activity || '-', note: flagged ? `"${flagged}" suggests a business that is not Shariah-compliant. Rent from it cannot be distributed to investors; the Shariah reviewer must decide.` : 'Check the tenancy agreements: rent from an activity that is not Shariah-compliant cannot be distributed.' });
    }
  }

  // Any asset: a site photo taken far from the pinned location deserves a look.
  const photo = latest('SITE_PHOTO');
  if (photo) {
    const where = photo.metadata;
    const pinned = asset.latitude !== null && asset.longitude !== null;
    if (!where || typeof where.latitude !== 'number' || typeof where.longitude !== 'number') {
      findings.push({ source: label('SITE_PHOTO'), field: 'Photo location', result: 'NOT_FOUND', note: 'The photo has no location. Take it with the camera button on site and allow location access.' });
    } else if (!pinned) {
      findings.push({ source: label('SITE_PHOTO'), field: 'Photo location', result: 'INFO', found: `${where.latitude.toFixed(5)}, ${where.longitude.toFixed(5)}`, note: 'No map pin was set for the asset to compare with.' });
    } else {
      const km = distanceKm({ latitude: asset.latitude!, longitude: asset.longitude! }, { latitude: where.latitude, longitude: where.longitude });
      findings.push({ source: label('SITE_PHOTO'), field: 'Photo location', result: km <= 2 ? 'MATCH' : 'MISMATCH', entered: 'Within 2 km of the map pin', found: km < 1 ? `${Math.round(km * 1000)} m from the pin` : `${km.toFixed(1)} km from the pin` });
    }
  }
  return findings;
}
