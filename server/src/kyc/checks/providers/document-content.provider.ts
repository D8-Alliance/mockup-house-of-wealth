import { CheckContext, CheckFinding, CheckOutcome, KycCheckProvider, KycCheckType } from '../check-types';
import { DocumentText, DocumentTextReader } from '../document-text-reader';
import { nameTokens } from '../recommendation';

/** Field-level result of comparing what the applicant typed with what a document says. */
export type FieldMatch = 'MATCH' | 'MISMATCH' | 'NOT_FOUND';

// OCR commonly confuses these; folding them on both sides avoids false mismatches on ID numbers.
const CONFUSABLES: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
const MONTHS: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, MEI: 5, JUN: 6, JUL: 7, AUG: 8, OGO: 8, SEP: 9, OCT: 10, OKT: 10, NOV: 11, DEC: 12, DIS: 12 };

/** A proof of address must be no older than this (the upload form says "under 3 months old"). */
export const PROOF_OF_ADDRESS_MAX_AGE_DAYS = 92;

const foldId = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/[OQDILZSBG]/g, (char) => CONFUSABLES[char]);

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

function tokenFound(token: string, found: Set<string>): boolean {
  return found.has(token) || (token.length >= 5 && [...found].some((candidate) => Math.abs(candidate.length - token.length) <= 1 && editDistance(candidate, token) <= 1));
}

/** Share of the claimed tokens present in the text; longer tokens may differ by one OCR error. */
function tokenCoverage(claimTokens: string[], text: string): number {
  if (!claimTokens.length) return 0;
  const found = new Set(nameTokens(text));
  return claimTokens.filter((token) => tokenFound(token, found)).length / claimTokens.length;
}

/** The document line most like the entered value, so the officer sees what was actually read. */
export function closestLine(claimed: string, text: string): string | undefined {
  const tokens = nameTokens(claimed);
  let best: { line: string; hits: number } | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const found = new Set(nameTokens(line));
    const hits = tokens.filter((token) => tokenFound(token, found)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { line, hits };
  }
  return best ? best.line.slice(0, 120) : undefined;
}

export function nameOnDocument(claimedName: string, text: string): FieldMatch {
  const tokens = nameTokens(claimedName);
  if (!tokens.length || !text.trim()) return 'NOT_FOUND';
  return tokenCoverage(tokens, text) >= 0.75 ? 'MATCH' : 'MISMATCH';
}

export function idNumberOnDocument(claimedId: string, text: string): FieldMatch {
  const claim = foldId(claimedId);
  if (claim.length < 5 || !text.trim()) return 'NOT_FOUND';
  return foldId(text).includes(claim) ? 'MATCH' : 'MISMATCH';
}

/** Every date written on the document, as YYYY-MM-DD (dd-mm-yyyy, yyyy-mm-dd, "12 May 1990", ...). */
export function datesInText(text: string): string[] {
  const dates = new Set<string>();
  const add = (year: number, month: number, day: number) => {
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) dates.add(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };
  for (const match of text.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) add(+match[1], +match[2], +match[3]);
  for (const match of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) add(+match[3], +match[2], +match[1]);
  for (const match of text.toUpperCase().matchAll(/\b(\d{1,2})\s*([A-Z]{3})[A-Z]*\s*(\d{4})\b/g)) if (MONTHS[match[2]]) add(+match[3], MONTHS[match[2]], +match[1]);
  return [...dates];
}

export function dateOfBirthOnDocument(claimed: Date | null, text: string): FieldMatch {
  if (!claimed) return 'NOT_FOUND';
  const dates = datesInText(text);
  // Documents also carry issue/expiry dates; a mismatch is only reported when no date on the document matches.
  if (!dates.length) return 'NOT_FOUND';
  return dates.includes(claimed.toISOString().slice(0, 10)) ? 'MATCH' : 'MISMATCH';
}

export function addressOnDocument(claimedAddress: string, text: string): FieldMatch {
  const tokens = nameTokens(claimedAddress);
  if (tokens.length < 2 || !text.trim()) return 'NOT_FOUND';
  const postcode = claimedAddress.match(/\b\d{5}\b/)?.[0];
  if (postcode && !text.includes(postcode)) return 'MISMATCH';
  return tokenCoverage(tokens, text) >= 0.6 ? 'MATCH' : 'MISMATCH';
}

/**
 * How recent a proof of address is: its latest date that is not in the future (a bill also shows
 * a later due date, so dates up to 45 days ahead are ignored rather than taken as the bill date).
 */
export function proofOfAddressAge(text: string, now: Date): { result: FieldMatch; date?: string } {
  const today = now.toISOString().slice(0, 10);
  const past = datesInText(text).filter((date) => date <= today).sort();
  if (!past.length) return { result: 'NOT_FOUND' };
  const latest = past[past.length - 1];
  const ageDays = (now.getTime() - new Date(`${latest}T00:00:00Z`).getTime()) / 86_400_000;
  return { result: ageDays <= PROOF_OF_ADDRESS_MAX_AGE_DAYS ? 'MATCH' : 'MISMATCH', date: latest };
}

/** Malaysian issuers accepted as proof of address; matched on whole words of the document text. */
const ISSUERS: Array<{ name: string; kind: string; pattern: RegExp }> = [
  { name: 'Tenaga Nasional (TNB)', kind: 'electricity bill', pattern: /\b(TENAGA NASIONAL|TNB)\b/ },
  { name: 'Sabah Electricity (SESB)', kind: 'electricity bill', pattern: /\b(SABAH ELECTRICITY|SESB)\b/ },
  { name: 'Sarawak Energy', kind: 'electricity bill', pattern: /\bSARAWAK ENERGY\b/ },
  { name: 'Air Selangor', kind: 'water bill', pattern: /\b(AIR SELANGOR|PENGURUSAN AIR SELANGOR|SYABAS)\b/ },
  { name: 'Ranhill SAJ', kind: 'water bill', pattern: /\b(RANHILL SAJ|SAJ RANHILL)\b/ },
  { name: 'PBA Pulau Pinang', kind: 'water bill', pattern: /\b(PBAPP|PERBADANAN BEKALAN AIR PULAU PINANG)\b/ },
  { name: 'Water utility', kind: 'water bill', pattern: /\b(AIR KELANTAN|AIR PERAK|LEMBAGA AIR PERAK|SYARIKAT AIR MELAKA|SYARIKAT AIR NEGERI SEMBILAN|SAINS|SADA|SAINS AIR|AIR KEDAH)\b/ },
  { name: 'Indah Water', kind: 'sewerage bill', pattern: /\bINDAH WATER\b/ },
  { name: 'Gas Malaysia', kind: 'gas bill', pattern: /\bGAS MALAYSIA\b/ },
  { name: 'Telekom Malaysia / Unifi', kind: 'phone or internet bill', pattern: /\b(TELEKOM MALAYSIA|UNIFI|TM NET)\b/ },
  { name: 'Mobile or fibre operator', kind: 'phone or internet bill', pattern: /\b(MAXIS|CELCOM|DIGI|CELCOMDIGI|U MOBILE|TIME DOTCOM|YES 4G)\b/ },
  { name: 'Bank', kind: 'bank statement', pattern: /\b(MAYBANK|MALAYAN BANKING|CIMB|BANK ISLAM|BANK MUAMALAT|RHB|PUBLIC BANK|AMBANK|HONG LEONG|AFFIN|ALLIANCE BANK|BANK RAKYAT|BANK SIMPANAN NASIONAL|BSN|AGROBANK|OCBC|HSBC|STANDARD CHARTERED|UOB|MBSB|KUWAIT FINANCE HOUSE|AL RAJHI)\b/ },
  { name: 'Government agency', kind: 'government letter', pattern: /\b(LEMBAGA HASIL|LHDN|KWSP|PERKESO|CUKAI TAKSIRAN|MAJLIS BANDARAYA|MAJLIS PERBANDARAN|DEWAN BANDARAYA)\b/ },
];

export function issuerOfDocument(text: string): { name: string; kind: string } | undefined {
  const upper = text.toUpperCase();
  return ISSUERS.find((issuer) => issuer.pattern.test(upper));
}

const DOCUMENT_LABELS: Record<string, string> = { ID_FRONT: 'ID card (front)', ID_BACK: 'ID card (back)', PASSPORT: 'passport', PROOF_OF_ADDRESS: 'proof of address' };

/**
 * Reads the uploaded documents on this server (PDF text or OCR) and compares
 * them with what the applicant entered. Advisory: a mismatch or an unreadable
 * document is REVIEW, so the officer sees an alert; it never decides alone.
 * It does not detect forged documents.
 */
export class DocumentContentProvider implements KycCheckProvider {
  readonly name = 'local-ocr';
  readonly version = '1.1.0';

  constructor(private readonly reader: DocumentTextReader = new DocumentTextReader(), private readonly now: () => Date = () => new Date()) {}

  supports(check: KycCheckType): boolean {
    return check === 'DOCUMENT_CONTENT';
  }

  async run(_check: KycCheckType, { subject }: CheckContext): Promise<CheckOutcome> {
    const identityTypes = subject.idDocumentType === 'PASSPORT' ? ['PASSPORT'] : ['ID_FRONT', 'ID_BACK'];
    const texts: Record<string, DocumentText> = {};
    const reasons: string[] = [];
    for (const type of [...identityTypes, 'PROOF_OF_ADDRESS']) {
      const document = await subject.loadDocument(type);
      if (!document) continue;
      texts[type] = await this.reader.read(document);
      if (texts[type].method === 'none') reasons.push(`Could not read any text from the ${DOCUMENT_LABELS[type]} - check it manually`);
    }

    const identityText = identityTypes.map((type) => texts[type]?.text ?? '').join('\n');
    const addressText = texts.PROOF_OF_ADDRESS?.text ?? '';
    const isMyKad = subject.idDocumentType === 'NATIONAL_ID' && subject.countryNodeId === 'CN-MYS';
    const results: Array<{ field: string; source: string; result: FieldMatch; claimed: string; found?: string }> = [
      { field: 'Name', source: 'identity document', result: nameOnDocument(subject.fullName, identityText), claimed: subject.fullName, found: closestLine(subject.fullName, identityText) },
      { field: 'ID number', source: 'identity document', result: idNumberOnDocument(subject.idDocumentNumber, identityText), claimed: subject.idDocumentNumber },
      // MyKad does not print the date of birth separately; it is checked against the ID number by DOCUMENT_CONSISTENCY.
      ...(isMyKad ? [] : [{ field: 'Date of birth', source: 'identity document', result: dateOfBirthOnDocument(subject.dateOfBirth, identityText), claimed: subject.dateOfBirth?.toISOString().slice(0, 10) ?? '', found: datesInText(identityText).slice(0, 3).join(', ') || undefined }]),
      { field: 'Name', source: 'proof of address', result: nameOnDocument(subject.fullName, addressText), claimed: subject.fullName, found: closestLine(subject.fullName, addressText) },
      { field: 'Address', source: 'proof of address', result: addressOnDocument(subject.residentialAddress, addressText), claimed: subject.residentialAddress, found: closestLine(subject.residentialAddress, addressText) },
    ];

    for (const { field, source, result, claimed } of results) {
      if (result === 'MISMATCH') reasons.push(`${field} on the ${source} does not match the application (entered: "${claimed}")`);
      else if (result === 'NOT_FOUND' && (source === 'identity document' ? identityText : addressText).trim()) reasons.push(`${field} could not be found on the ${source}`);
    }

    const findings: CheckFinding[] = results.map(({ field, source, result, claimed, found }) => ({ source, field, result, entered: claimed, ...(result !== 'MATCH' && found ? { found } : {}) }));

    if (addressText.trim()) {
      // The upload form asks for a document under 3 months old; nothing checked that before.
      const age = proofOfAddressAge(addressText, this.now());
      if (age.result === 'MISMATCH') reasons.push(`The proof of address is dated ${age.date}, older than 3 months`);
      if (age.result === 'NOT_FOUND') reasons.push('No date was found on the proof of address - check it is under 3 months old');
      results.push({ field: 'Date', source: 'proof of address', result: age.result, claimed: 'under 3 months old' });
      findings.push({ source: 'proof of address', field: 'Date', result: age.result, entered: 'Under 3 months old', ...(age.date ? { found: age.date } : {}) });

      const issuer = issuerOfDocument(addressText);
      findings.push({ source: 'proof of address', field: 'Issued by', result: 'INFO', found: issuer ? `${issuer.name} (${issuer.kind})` : 'Not recognised', note: issuer ? undefined : 'Not a known utility, telco, bank or government issuer: check the document is a genuine bill or statement.' });
    }

    if (isMyKad && identityText.trim() && subject.residentialAddress.trim()) {
      // MyKad prints the holder's registered address. A different one is normal after a move, so it is
      // explained here instead of raising an issue; the proof of address is what must match.
      const onCard = addressOnDocument(subject.residentialAddress, identityText);
      const proofMatches = results.find((item) => item.source === 'proof of address' && item.field === 'Address')?.result === 'MATCH';
      findings.push({
        source: 'identity document',
        field: 'Address on MyKad',
        result: onCard === 'MATCH' ? 'MATCH' : 'INFO',
        entered: subject.residentialAddress,
        ...(onCard !== 'MATCH' ? { found: closestLine(subject.residentialAddress, identityText), note: proofMatches ? 'Different from the entered address, which is normal if the applicant has moved: the proof of address matches it.' : 'Different from the entered address, and the proof of address does not confirm it either.' } : {}),
      });
    }

    const compared = results.filter((item) => item.result !== 'NOT_FOUND');
    const matched = compared.filter((item) => item.result === 'MATCH').length;
    return {
      status: reasons.length ? 'REVIEW' : 'PASS',
      score: compared.length ? matched / compared.length : 0,
      reasons,
      findings,
      // Stored for audit only; never returned by the API.
      raw: { fields: results.map(({ field, source, result }) => ({ field, source, result })), methods: Object.fromEntries(Object.entries(texts).map(([type, value]) => [type, value.method])), text: Object.fromEntries(Object.entries(texts).map(([type, value]) => [type, value.text.slice(0, 2000)])) },
    };
  }
}
