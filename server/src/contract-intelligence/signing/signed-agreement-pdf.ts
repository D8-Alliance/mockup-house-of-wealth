import PDFDocument from 'pdfkit';

export interface CompletionCertificate {
  contractNumber: string;
  title: string;
  version: number;
  versionSha256: string;
  completedAt: string;
  signers: Array<{ side: string; organisation: string; name: string; typedSignature: string; signedAt: string; identity: string; code: string }>;
  approvals: Array<{ step: string; by: string; at: string }>;
}

interface Section { number: string; title: string; paragraphs: string[] }

const GREEN = '#047857';
const GREY = '#64748b';

/**
 * The final agreement: the approved text, then a Certificate of Completion saying who signed, when, how
 * each signer was identified and which version they signed. The platform seals this file afterwards.
 */
export function renderSignedAgreementPdf(sections: Section[], certificate: CompletionCertificate): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 54, bufferPages: true, info: { Title: `${certificate.title} ${certificate.contractNumber}`, Author: 'Wealth Pooling' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text(certificate.title, { align: 'center' });
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(GREY).text(`Document No. ${certificate.contractNumber} | Version ${certificate.version} | Executed`, { align: 'center' });
    for (const section of sections) {
      doc.moveDown().font('Helvetica-Bold').fontSize(12).fillColor('#000000').text(`${section.number}. ${section.title}`);
      doc.moveDown(0.3).font('Helvetica').fontSize(10).text(section.paragraphs.join('\n\n'), { lineGap: 3 });
    }

    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN).text('Certificate of Completion', left, doc.y);
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(GREY).text(`${certificate.title}, ${certificate.contractNumber}. Completed ${certificate.completedAt}.`, { width });
    const row = (label: string, value: string) => doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true, width }).fillColor('#000000').text(value);
    doc.moveDown(0.8);
    row('Version signed', `${certificate.version}`);
    row('SHA-256 of the signed version', certificate.versionSha256);

    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(11).fillColor(GREEN).text('Signatures', left);
    for (const signer of certificate.signers) {
      doc.moveDown(0.5).font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`${signer.side}: ${signer.organisation}`, left, doc.y, { width });
      row('Signed by', `${signer.name}, typed signature "${signer.typedSignature}"`);
      row('Signed at', signer.signedAt);
      row('Identity', signer.identity);
      row('One-time code', signer.code);
    }
    if (certificate.approvals.length) {
      doc.moveDown(0.8).font('Helvetica-Bold').fontSize(11).fillColor(GREEN).text('Reviews before signing', left);
      for (const approval of certificate.approvals) row(approval.step, `${approval.by}, ${approval.at}`);
    }
    doc.moveDown(1).font('Helvetica').fontSize(8.5).fillColor(GREY).text('Each party signed electronically on the Wealth Pooling platform, signed in to their own account and entering a one-time code sent to them; the identity check (KYC) of each signer is listed above. The platform then sealed this file with its certificate and obtained a time-stamp from an independent time-stamp authority. Any change to this file breaks the seal. Signatures are electronic signatures under the Electronic Commerce Act 2006.', left, doc.y, { width });

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`${certificate.contractNumber}  |  Page ${index + 1} of ${range.count}`, left, doc.page.height - 36, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
