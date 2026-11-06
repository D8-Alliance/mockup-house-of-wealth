import PDFDocument from 'pdfkit';

export interface ReminderLetter {
  number: 1 | 2 | 3;
  language: 'ms' | 'en';
  caseId: string;
  issuedOn: string;
  payBy: string;
  ownerName: string;
  tenantName: string;
  unit: string;
  asset: string;
  leaseId: string;
  leaseStart: string;
  period: string;
  dueDate: string;
  amount: string;
  /** Every month of this lease still unpaid, this one included. */
  totalOverdue: string;
}

const GREEN = '#047857';
const GREY = '#64748b';

const TEXT = {
  ms: {
    title: ['', 'NOTIS PERINGATAN PERTAMA', 'NOTIS PERINGATAN KEDUA', 'NOTIS PERINGATAN KETIGA DAN TERAKHIR'],
    ref: 'Rujukan', date: 'Tarikh', to: 'Kepada', subject: 'Perkara',
    subjectText: (l: ReminderLetter) => `Tunggakan sewa ${l.unit}, ${l.asset} bagi ${l.period}`,
    opening: (l: ReminderLetter) => `Merujuk perjanjian sewaan Ijarah ${l.leaseId} yang berkuat kuasa mulai ${l.leaseStart}, sewa bulanan sebanyak ${l.amount} bagi ${l.period} yang perlu dibayar pada ${l.dueDate} masih belum diterima.`,
    total: (l: ReminderLetter) => `Jumlah sewa yang masih tertunggak bagi sewaan ini setakat tarikh surat ini ialah ${l.totalOverdue}.`,
    ask: (l: ReminderLetter) => `Sila jelaskan tunggakan tersebut ke akaun bank kami sebelum ${l.payBy}.`,
    last: (l: ReminderLetter) => `Ini adalah peringatan terakhir. Sekiranya tunggakan tidak dijelaskan sebelum ${l.payBy}, perkara ini akan diserahkan kepada bahagian undang-undang kami tanpa notis lanjut.`,
    paid: 'Sekiranya bayaran telah dibuat, sila abaikan notis ini dan kemukakan bukti bayaran kepada kami.',
    contact: 'Untuk sebarang pertanyaan, sila hubungi bahagian kutipan kami.',
    sign: 'Bahagian Kutipan dan Komunikasi',
    footer: 'Notis ini dijana melalui Wealth Pooling. Tiada caj lewat dikenakan.',
  },
  en: {
    title: ['', 'FIRST REMINDER NOTICE', 'SECOND REMINDER NOTICE', 'THIRD AND FINAL REMINDER NOTICE'],
    ref: 'Reference', date: 'Date', to: 'To', subject: 'Subject',
    subjectText: (l: ReminderLetter) => `Rent arrears for ${l.unit}, ${l.asset}, ${l.period}`,
    opening: (l: ReminderLetter) => `Under the Ijarah lease ${l.leaseId} in force from ${l.leaseStart}, the monthly rent of ${l.amount} for ${l.period}, due on ${l.dueDate}, has not been received.`,
    total: (l: ReminderLetter) => `The rent outstanding under this lease as at the date of this notice is ${l.totalOverdue}.`,
    ask: (l: ReminderLetter) => `Please settle it to our bank account by ${l.payBy}.`,
    last: (l: ReminderLetter) => `This is the final reminder. If the arrears are not settled by ${l.payBy}, the matter will be passed to our legal team without further notice.`,
    paid: 'If you have already paid, please disregard this notice and send us the proof of payment.',
    contact: 'For any question, please contact our collection team.',
    sign: 'Collection and Communication',
    footer: 'This notice was generated through Wealth Pooling. No late charge is applied.',
  },
};

/** An A4 reminder letter from the owner to the tenant for an unpaid month, in Malay or English. */
export function renderReminderLetter(letter: ReminderLetter): Promise<Buffer> {
  const text = TEXT[letter.language];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60, info: { Title: `${text.title[letter.number]} ${letter.caseId}`, Author: letter.ownerName } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN).text(letter.ownerName, left);
    doc.moveTo(left, doc.y + 6).lineTo(left + width, doc.y + 6).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.5);
    for (const [label, value] of [[text.ref, letter.caseId], [text.date, letter.issuedOn], [text.to, letter.tenantName]]) {
      doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);
    }
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(letter.number === 3 ? '#b91c1c' : '#000000').text(text.title[letter.number], left, doc.y, { width, align: 'center' });
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000').text(`${text.subject}: ${text.subjectText(letter)}`, left, doc.y, { width });
    doc.moveDown(1);
    const paragraph = (value: string) => { doc.font('Helvetica').fontSize(10.5).fillColor('#000000').text(value, left, doc.y, { width, align: 'justify', lineGap: 2 }); doc.moveDown(0.8); };
    paragraph(text.opening(letter));
    paragraph(text.total(letter));
    paragraph(letter.number === 3 ? text.last(letter) : text.ask(letter));
    paragraph(text.paid);
    paragraph(text.contact);
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(10.5).text(text.sign, left);
    doc.font('Helvetica').text(letter.ownerName, left);
    doc.font('Helvetica').fontSize(8).fillColor(GREY).text(text.footer, left, doc.page.height - doc.page.margins.bottom - 20, { width, align: 'center' });
    doc.end();
  });
}
