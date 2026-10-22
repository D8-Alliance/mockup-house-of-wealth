import PDFDocument from 'pdfkit';
import { RECEIPT_LOGO_PNG } from '../billing/receipt-logo';

export interface EngagementRecordPdf {
  engagementId: string;
  generatedAt: string;
  generatedBy: string;
  status: string;
  parties: Array<[string, string]>;
  current: string;
  entries: Array<{ at: string; who: string; action: string; terms?: string; note?: string; extra: string[]; verification: string; hash: string }>;
  fingerprint: string;
}

const GREEN = '#047857';
const GREY = '#64748b';
const VERIFICATION_TEXT: Record<string, string> = { VERIFIED: 'Matches the audit log', LEGACY: 'Recorded before fingerprinting began', MISMATCH: 'DOES NOT MATCH THE AUDIT LOG' };

/**
 * A partnership's full record for the parties and reviewers: who did what and when (local time),
 * the terms at each step, notes, checks, and each entry's fingerprint against the audit log.
 */
export function renderEngagementRecordPdf(record: EngagementRecordPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, info: { Title: `Partnership record ${record.engagementId}`, Author: 'Wealth Pooling' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    const top = doc.y;
    doc.image(RECEIPT_LOGO_PNG, left, top - 4, { width: 60 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN).text('Wealth Pooling', left + 68, top + 4);
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text('Asset partnership record', left + 68, doc.y);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(record.engagementId, left, top, { width, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`Status: ${record.status}`, left, doc.y, { width, align: 'right' });
    doc.text(`Generated ${record.generatedAt}`, left, doc.y, { width, align: 'right' });
    doc.text(`by ${record.generatedBy}`, left, doc.y, { width, align: 'right' });
    doc.y = Math.max(doc.y, top + 50) + 10;

    for (const [label, value] of record.parties) doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);
    doc.moveDown(0.5).font('Helvetica-Bold').fontSize(10).fillColor('#000000').text('Terms on the table: ', left, doc.y, { continued: true }).font('Helvetica').text(record.current);

    doc.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor(GREEN).text('HISTORY', left);
    record.entries.forEach((entry, index) => {
      doc.moveDown(0.6);
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`${index + 1}. ${entry.who} ${entry.action}`, left, doc.y, { width });
      doc.font('Helvetica').fontSize(9).fillColor(GREY).text(entry.at, left, doc.y, { width });
      if (entry.terms) doc.fillColor('#000000').text(entry.terms, left, doc.y, { width });
      if (entry.note) doc.fillColor('#334155').text(`"${entry.note}"`, left, doc.y, { width });
      for (const line of entry.extra) doc.fillColor('#334155').text(line, left, doc.y, { width });
      doc.fontSize(7).fillColor(entry.verification === 'MISMATCH' ? '#b91c1c' : GREY).text(`${VERIFICATION_TEXT[entry.verification] ?? entry.verification} · SHA-256 ${entry.hash}`, left, doc.y, { width });
    });

    doc.moveDown(1.2).font('Helvetica').fontSize(8).fillColor(GREY);
    doc.text(`Record fingerprint (SHA-256 of all entries): ${record.fingerprint}`, left, doc.y, { width });
    doc.text('Each entry is also written to the platform\'s append-only audit log. Times are local to the country. This record is computer-generated and needs no signature.', left, doc.y, { width });

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`${record.engagementId}  |  Page ${index + 1} of ${range.count}`, left, doc.page.height - 36, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
