import PDFDocument from 'pdfkit';
import { ReceiptAkad } from './receipt-akad';
import { RECEIPT_LOGO_PNG } from './receipt-logo';

export interface Receipt {
  /** e.g. "Payment receipt" or "Promotion receipt". */
  title: string;
  receiptNumber: string;
  issuedAt: string;
  billedTo: Array<[string, string]>;
  /** What was paid for, one line each. */
  items: Array<{ description: string; amount: number }>;
  currency: string;
  status: string;
  /** The Shariah contract the payment was made under. */
  akad?: ReceiptAkad;
  /** Payment method, gateway references and similar. */
  payment: Array<[string, string]>;
  notes: string[];
}

const GREEN = '#047857';
const GREY = '#64748b';

function money(amount: number, currency: string) {
  return `${amount < 0 ? '-' : ''}${currency} ${Math.abs(amount).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** An A4 receipt: issuer and receipt number, billed to, items with the total, payment details and notes. */
export function renderReceiptPdf(receipt: Receipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${receipt.title} ${receipt.receiptNumber}`, Author: 'Wealth Pooling' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const right = left + width;

    // Logo and issuer on the left, receipt title and number on the right.
    const top = doc.y;
    doc.image(RECEIPT_LOGO_PNG, left, top - 4, { width: 70 });
    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN).text('Wealth Pooling', left + 78, top + 6);
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text('D-8 Islamic Circular Economy Platform', left + 78, doc.y);
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text(receipt.title.toUpperCase(), left, top, { width, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text(`No. ${receipt.receiptNumber}`, left, doc.y, { width, align: 'right' });
    doc.text(`Issued ${receipt.issuedAt}`, left, doc.y, { width, align: 'right' });
    const status = receipt.status.toUpperCase();
    const paid = status === 'PAID';
    doc.font('Helvetica-Bold').fillColor(paid ? GREEN : '#b45309').text(status, left, doc.y, { width, align: 'right' });

    // The logo is taller than the issuer text; start below whichever ends lower.
    doc.y = Math.max(doc.y, top + 44);
    doc.moveTo(left, doc.y + 12).lineTo(right, doc.y + 12).strokeColor('#e2e8f0').stroke();
    doc.y += 24;

    doc.font('Helvetica-Bold').fontSize(10).fillColor(GREY).text('BILLED TO', left);
    doc.moveDown(0.3);
    for (const [label, value] of receipt.billedTo) doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);

    // Items and total.
    doc.moveDown(1.2);
    const header = doc.y;
    doc.rect(left, header, width, 20).fill('#f1f5f9');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GREY).text('DESCRIPTION', left + 8, header + 6).text('AMOUNT', left, header + 6, { width: width - 8, align: 'right' });
    doc.y = header + 28;
    for (const item of receipt.items) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor('#000000').text(item.description, left + 8, y, { width: width * 0.7 });
      const after = doc.y;
      doc.text(money(item.amount, receipt.currency), left, y, { width: width - 8, align: 'right' });
      doc.y = Math.max(after, doc.y) + 6;
    }
    doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e2e8f0').stroke();
    doc.y += 8;
    const total = receipt.items.reduce((sum, item) => sum + item.amount, 0);
    const totalY = doc.y;
    doc.font('Helvetica-Bold').fontSize(12).text(paid ? 'Total paid' : 'Total', left + 8, totalY).text(money(total, receipt.currency), left, totalY, { width: width - 8, align: 'right' });

    if (receipt.akad) {
      doc.moveDown(1.5);
      const boxTop = doc.y;
      const inner = width - 24;
      const labelHeight = doc.font('Helvetica-Bold').fontSize(9).heightOfString('AKAD', { width: inner });
      const nameHeight = doc.font('Helvetica-Bold').fontSize(10).heightOfString(receipt.akad.name, { width: inner });
      const textHeight = doc.font('Helvetica').fontSize(9).heightOfString(receipt.akad.explanation, { width: inner });
      const height = 10 + labelHeight + 2 + nameHeight + 2 + textHeight + 12;
      doc.roundedRect(left, boxTop, width, height, 6).fillAndStroke('#ecfdf5', '#a7f3d0');
      doc.font('Helvetica-Bold').fontSize(9).fillColor(GREEN).text('AKAD (SHARIAH CONTRACT)', left + 12, boxTop + 10);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(receipt.akad.name, left + 12, doc.y + 2, { width: inner });
      doc.font('Helvetica').fontSize(9).fillColor('#334155').text(receipt.akad.explanation, left + 12, doc.y + 2, { width: inner });
      doc.y = boxTop + height;
    }

    if (receipt.payment.length) {
      doc.moveDown(1.5).font('Helvetica-Bold').fontSize(10).fillColor(GREY).text('PAYMENT', left);
      doc.moveDown(0.3);
      for (const [label, value] of receipt.payment) doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);
    }

    doc.moveDown(2).font('Helvetica').fontSize(8).fillColor(GREY);
    for (const note of [...receipt.notes, 'This receipt is computer-generated and needs no signature.']) doc.text(note, left, doc.y, { width });
    doc.end();
  });
}
