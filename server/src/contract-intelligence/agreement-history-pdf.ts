import PDFDocument from 'pdfkit';
import { RECEIPT_LOGO_PNG } from '../billing/receipt-logo';

export interface AgreementHistoryPdf {
  contractNumber: string;
  title: string;
  status: string;
  generatedAt: string;
  generatedBy: string;
  /** Label and value lines at the top: type, project or partnership, amends. */
  facts: Array<[string, string]>;
  versions: Array<{ version: number; at: string; by: string; status: string }>;
  parties: Array<{ name: string; agreed: string; signed: string }>;
  events: Array<{ at: string; who: string; what: string; note?: string }>;
  views: Array<{ who: string; last: string; times: number }>;
}

const GREEN = '#047857';
const GREY = '#64748b';

/**
 * An agreement's history for the parties and reviewers: its versions, who agreed to and signed which version,
 * every step (drafted, revised, reviewed, signed) and who has opened it, with local times.
 */
export function renderAgreementHistoryPdf(record: AgreementHistoryPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, info: { Title: `Agreement history ${record.contractNumber}`, Author: 'Wealth Pooling' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const room = (lines = 3) => { if (doc.y > doc.page.height - 60 - lines * 14) doc.addPage(); };
    const heading = (text: string) => { room(4); doc.moveDown(1).font('Helvetica-Bold').fontSize(11).fillColor(GREEN).text(text, left); doc.moveDown(0.3); };

    const top = doc.y;
    doc.image(RECEIPT_LOGO_PNG, left, top - 4, { width: 60 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(GREEN).text('Wealth Pooling', left + 68, top + 4);
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text('Agreement history', left + 68, doc.y);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(record.contractNumber, left, top, { width, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`Status: ${record.status}`, left, doc.y, { width, align: 'right' });
    doc.text(`Generated ${record.generatedAt}`, left, doc.y, { width, align: 'right' });
    doc.text(`by ${record.generatedBy}`, left, doc.y, { width, align: 'right' });
    doc.y = Math.max(doc.y, top + 50) + 10;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(record.title, left, doc.y, { width });
    for (const [label, value] of record.facts) doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);

    heading('VERSIONS');
    for (const item of record.versions) { room(); doc.font('Helvetica').fontSize(9).fillColor('#000000').text(`Version ${item.version} · ${item.status} · ${item.at} · ${item.by}`, left, doc.y, { width }); }

    if (record.parties.length) {
      heading('PARTIES');
      for (const party of record.parties) { room(); doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(party.name, left, doc.y, { width }); doc.font('Helvetica').fillColor(GREY).text(`Agreed: ${party.agreed} · Signed: ${party.signed}`, left, doc.y, { width }); }
    }

    heading('HISTORY');
    record.events.forEach((event, index) => {
      room(3);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000').text(`${index + 1}. ${event.who}: ${event.what}`, left, doc.y, { width });
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(event.at, left, doc.y, { width });
      if (event.note) doc.fillColor('#334155').text(`"${event.note}"`, left, doc.y, { width });
      doc.moveDown(0.3);
    });

    heading('OPENED BY');
    if (!record.views.length) doc.font('Helvetica').fontSize(9).fillColor(GREY).text('No one has opened this agreement since views began to be recorded.', left, doc.y, { width });
    for (const view of record.views) { room(); doc.font('Helvetica').fontSize(9).fillColor('#000000').text(`${view.who} · last ${view.last}${view.times > 1 ? ` · ${view.times} times` : ''}`, left, doc.y, { width }); }

    doc.moveDown(1.2).font('Helvetica').fontSize(8).fillColor(GREY);
    doc.text('Every step is also written to the platform\'s append-only audit log. Times are local to the country. Openings are counted at most once an hour per person. This record is computer-generated and needs no signature.', left, doc.y, { width });

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`${record.contractNumber}  |  Page ${index + 1} of ${range.count}`, left, doc.page.height - 36, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
