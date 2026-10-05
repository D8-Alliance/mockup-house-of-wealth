import { inspectDocument, inspectPdf, parsePdfDate, sha256Hex, withStoredChecks } from './document-integrity';

/** A tiny PDF-shaped buffer: header, an Info dictionary, and one or more %%EOF sections. */
function pdf(info: string, options: { updates?: string[]; linearized?: boolean } = {}) {
  const head = `%PDF-1.7\n${options.linearized ? '1 0 obj\n<< /Linearized 1 /L 1000 >>\nendobj\n' : ''}2 0 obj\n<< ${info} >>\nendobj\ntrailer\n<< /Info 2 0 R >>\n%%EOF\n`;
  const updates = (options.updates || []).map((update) => `3 0 obj\n<< ${update} >>\nendobj\ntrailer\n<< /Info 3 0 R /Prev 10 >>\n%%EOF\n`).join('');
  return Buffer.from(head + (options.linearized ? 'xref\n%%EOF\n' : '') + updates, 'latin1');
}

const NOW = new Date('2026-10-05T00:00:00Z');

describe('parsePdfDate', () => {
  it('reads PDF dates with and without a time zone, and ISO dates from XMP', () => {
    expect(parsePdfDate("D:20260115093000+08'00'")).toBe('2026-01-15T01:30:00.000Z');
    expect(parsePdfDate('D:20260115093000Z')).toBe('2026-01-15T09:30:00.000Z');
    expect(parsePdfDate('D:2026')).toBe('2026-01-01T00:00:00.000Z');
    expect(parsePdfDate('2026-01-15T09:30:00+08:00')).toBe('2026-01-15T01:30:00.000Z');
    expect(parsePdfDate('not a date')).toBeNull();
  });
});

describe('inspectDocument', () => {
  it('raises no flags for an original, unedited PDF', () => {
    const result = inspectDocument(pdf("/CreationDate (D:20260115093000+08'00') /ModDate (D:20260115093000+08'00') /Producer (Microsoft Word for Microsoft 365)"), NOW);
    expect(result.flags).toEqual([]);
    expect(result.pdf).toMatchObject({ eofMarkers: 1, incrementalUpdates: 0, producer: 'Microsoft Word for Microsoft 365' });
    expect(result.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('flags an incremental update, a later modification date and editing software', () => {
    const result = inspectDocument(pdf("/CreationDate (D:20260115093000Z) /Producer (Microsoft Word)", { updates: ["/CreationDate (D:20260115093000Z) /ModDate (D:20260301120000Z) /Producer (iLovePDF)"] }), NOW);
    expect(result.flags.map((flag) => flag.code)).toEqual(['INCREMENTAL_UPDATE', 'MODIFIED_AFTER_CREATION', 'EDITING_SOFTWARE']);
    // After an incremental update the last Info values win.
    expect(result.pdf?.producer).toBe('iLovePDF');
  });

  it('does not treat the second %%EOF of a linearized PDF as an edit', () => {
    const result = inspectPdf(pdf('/Producer (Adobe PDF Library)', { linearized: true }));
    expect(result).toMatchObject({ linearized: true, eofMarkers: 2, incrementalUpdates: 0 });
  });

  it('flags dates in the future', () => {
    expect(inspectDocument(pdf('/CreationDate (D:20300101000000Z)'), NOW).flags.map((flag) => flag.code)).toEqual(['FUTURE_DATE']);
  });

  it('decodes UTF-16 hex strings in the Info dictionary', () => {
    const hex = Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from('Sejda', 'utf16le').swap16()]).toString('hex');
    expect(inspectPdf(pdf(`/Producer <${hex}>`)).producer).toBe('Sejda');
  });

  it('only hashes non-PDF files', () => {
    const result = inspectDocument(Buffer.from('year,revenue\n2026,100'), NOW);
    expect(result).toMatchObject({ pdf: null, flags: [], sha256: sha256Hex(Buffer.from('year,revenue\n2026,100')) });
  });
});

describe('withStoredChecks', () => {
  const base = inspectDocument(Buffer.from('a,b\n1,2'), NOW);

  it('flags a stored file that no longer matches its upload hash', () => {
    expect(withStoredChecks(base, { storedSha256: sha256Hex(Buffer.from('original')), otherProjectCount: 0 }).flags.map((flag) => flag.code)).toEqual(['CONTENT_CHANGED_AFTER_UPLOAD']);
    expect(withStoredChecks(base, { storedSha256: base.sha256, otherProjectCount: 0 }).flags).toEqual([]);
  });

  it('reports reuse in other projects as a count only', () => {
    const [flag] = withStoredChecks(base, { otherProjectCount: 2 }).flags;
    expect(flag).toEqual({ code: 'DUPLICATE_IN_OTHER_PROJECT', message: 'The identical file was also uploaded to 2 other project(s).' });
  });
});
