import { createHash } from 'node:crypto';

/**
 * Cheap, advisory tamper signals for uploaded evidence. None of them proves a
 * document is forged (or genuine): they tell the human reviewer where to look.
 * Signature validation (PAdES), OCR-versus-text-layer comparison and issuer
 * cross-checks are separate, later steps.
 */

export type IntegrityFlagCode =
  | 'CONTENT_CHANGED_AFTER_UPLOAD'
  | 'INCREMENTAL_UPDATE'
  | 'MODIFIED_AFTER_CREATION'
  | 'EDITING_SOFTWARE'
  | 'FUTURE_DATE'
  | 'DUPLICATE_IN_OTHER_PROJECT';

export type IntegrityFlag = { code: IntegrityFlagCode; message: string };

export type PdfIntegrity = {
  eofMarkers: number;
  linearized: boolean;
  incrementalUpdates: number;
  creationDate: string | null;
  modDate: string | null;
  producer: string | null;
  creator: string | null;
}

export type DocumentIntegrity = {
  sha256: string;
  checkedAt: string;
  pdf: PdfIntegrity | null;
  flags: IntegrityFlag[];
}

// Tools mostly used to edit an existing PDF or image rather than export an original.
const EDITING_TOOLS = /photoshop|gimp|ilovepdf|smallpdf|sejda|pdfescape|pdf-xchange editor|pdffiller|pdfelement|foxit phantompdf|nitro pdf|inkscape|canva|libreoffice draw|pdf candy|sodapdf|pdf24/i;
// Allow for clock skew and for a save immediately after creation.
const MODIFIED_TOLERANCE_MS = 5 * 60 * 1000;

export function sha256Hex(content: Buffer | Uint8Array) {
  return createHash('sha256').update(content).digest('hex');
}

export function isPdf(content: Buffer | Uint8Array) {
  return Buffer.from(content.subarray(0, 1024)).toString('latin1').includes('%PDF-');
}

/** Decodes a PDF string literal or hex string, including UTF-16BE with a BOM. */
function decodePdfString(raw: string, hex: boolean): string {
  let bytes: Buffer;
  if (hex) {
    bytes = Buffer.from(raw.replace(/\s+/g, ''), 'hex');
  } else {
    const unescaped = raw.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, code: string) => {
      const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
      return simple[code] ?? String.fromCharCode(parseInt(code, 8));
    });
    bytes = Buffer.from(unescaped, 'latin1');
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.from(bytes.subarray(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  return bytes.toString('latin1');
}

/** Last value of an Info-dictionary key (the last one wins after incremental updates). */
function infoValue(text: string, key: string): string | null {
  const pattern = new RegExp(`/${key}\\s*(?:\\(((?:\\\\.|[^\\\\)])*)\\)|<([0-9A-Fa-f\\s]*)>)`, 'g');
  let value: string | null = null;
  for (const match of text.matchAll(pattern)) value = match[1] !== undefined ? decodePdfString(match[1], false) : decodePdfString(match[2], true);
  return value?.trim() || null;
}

function xmpValue(text: string, tag: string): string | null {
  const match = text.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)) || text.match(new RegExp(`${tag}="([^"]*)"`));
  return match?.[1].trim() || null;
}

/** Parses "D:YYYYMMDDHHmmSSOHH'mm'" (PDF) or ISO 8601 (XMP) into an ISO string. */
export function parsePdfDate(value: string | null): string | null {
  if (!value) return null;
  const pdf = value.match(/^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?\s*([Zz+-])?\s*(\d{2})?'?(\d{2})?'?/);
  if (pdf) {
    const [, year, month = '01', day = '01', hour = '00', minute = '00', second = '00', sign, offsetHour = '00', offsetMinute = '00'] = pdf;
    const zone = !sign || sign.toUpperCase() === 'Z' ? 'Z' : `${sign}${offsetHour}:${offsetMinute}`;
    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${zone}`);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function inspectPdf(content: Buffer | Uint8Array): PdfIntegrity {
  const text = Buffer.from(content).toString('latin1');
  const eofMarkers = (text.match(/%%EOF/g) || []).length;
  // A linearized ("fast web view") file legitimately carries two %%EOF markers.
  const linearized = /\/Linearized\s/.test(text.slice(0, 2048));
  const baseline = linearized ? 2 : 1;
  return {
    eofMarkers,
    linearized,
    incrementalUpdates: Math.max(0, eofMarkers - baseline),
    creationDate: parsePdfDate(infoValue(text, 'CreationDate') || xmpValue(text, 'xmp:CreateDate')),
    modDate: parsePdfDate(infoValue(text, 'ModDate') || xmpValue(text, 'xmp:ModifyDate')),
    producer: infoValue(text, 'Producer') || xmpValue(text, 'pdf:Producer'),
    creator: infoValue(text, 'Creator') || xmpValue(text, 'xmp:CreatorTool'),
  };
}

/** Signals derived from the file alone (computed at upload and re-checked at analysis). */
export function inspectDocument(content: Buffer | Uint8Array, now = new Date()): DocumentIntegrity {
  const pdf = isPdf(content) ? inspectPdf(content) : null;
  const flags: IntegrityFlag[] = [];
  if (pdf) {
    if (pdf.incrementalUpdates > 0) flags.push({ code: 'INCREMENTAL_UPDATE', message: `The PDF was saved ${pdf.incrementalUpdates} more time(s) after it was first written (incremental update). Edits or added signatures appear this way.` });
    if (pdf.creationDate && pdf.modDate && Date.parse(pdf.modDate) - Date.parse(pdf.creationDate) > MODIFIED_TOLERANCE_MS) flags.push({ code: 'MODIFIED_AFTER_CREATION', message: `The PDF was modified on ${pdf.modDate}, after it was created on ${pdf.creationDate}.` });
    const tool = [pdf.producer, pdf.creator].find((value) => value && EDITING_TOOLS.test(value));
    if (tool) flags.push({ code: 'EDITING_SOFTWARE', message: `The PDF was produced with editing software (${tool}).` });
    const future = [pdf.creationDate, pdf.modDate].find((value) => value && Date.parse(value) - now.getTime() > MODIFIED_TOLERANCE_MS);
    if (future) flags.push({ code: 'FUTURE_DATE', message: `The PDF carries a date in the future (${future}).` });
  }
  return { sha256: sha256Hex(content), checkedAt: now.toISOString(), pdf, flags };
}

/** Adds the signals that need stored state: the hash recorded at upload, and reuse elsewhere. */
export function withStoredChecks(integrity: DocumentIntegrity, context: { storedSha256?: string | null; otherProjectCount: number }): DocumentIntegrity {
  const flags = [...integrity.flags];
  if (context.storedSha256 && context.storedSha256 !== integrity.sha256) flags.unshift({ code: 'CONTENT_CHANGED_AFTER_UPLOAD', message: 'The stored file no longer matches the SHA-256 hash recorded at upload.' });
  // Only a count: naming the other projects could leak another tenant's data.
  if (context.otherProjectCount > 0) flags.push({ code: 'DUPLICATE_IN_OTHER_PROJECT', message: `The identical file was also uploaded to ${context.otherProjectCount} other project(s).` });
  return { ...integrity, flags };
}
