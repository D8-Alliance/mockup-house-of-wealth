import PDFDocument from 'pdfkit';
import { readPdfPageItems, readPdfText } from './pdf-reader';

/** A pdfkit PDF with compressed streams, the kind pdf-parse 1.1.1 rejected with "bad XRef entry". */
function compressedPdf(lines: number, pdfVersion?: '1.4'): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, ...(pdfVersion ? { pdfVersion } : {}) });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    for (let i = 0; i < lines; i += 1) doc.text(`Line ${i} Lot 8812 Mukim Gambang registered owner Al Hidayah Group Sdn Bhd`);
    doc.addPage().text('Second page: GRN 112233');
    doc.end();
  });
}

describe('PDF reader', () => {
  it.each([[5, '1.4'], [40, '1.4'], [15, undefined], [40, undefined]] as const)('reads a compressed pdfkit PDF (%i lines, version %s)', async (lines, version) => {
    const text = await readPdfText(await compressedPdf(lines, version));
    expect(text).toContain('Line 0 Lot 8812 Mukim Gambang registered owner Al Hidayah Group Sdn Bhd');
    expect(text).toContain('Second page: GRN 112233');
    expect(text).not.toMatch(/-- \d+ of \d+ --/);
  });

  it('gives each page its positioned text items, in page order', async () => {
    const pages = await readPdfPageItems(await compressedPdf(5, '1.4'));
    expect(pages).toHaveLength(2);
    expect(pages[0][0].str).toContain('Line 0');
    expect(pages[0][0].transform).toHaveLength(6);
    expect(pages[1].map((item) => item.str).join('')).toContain('GRN 112233');
  });
});
