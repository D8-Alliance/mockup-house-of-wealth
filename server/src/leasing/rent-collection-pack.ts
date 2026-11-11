import PDFDocument from 'pdfkit';

/** The cover of the legal pack: the case, what was done to collect, and what the pack holds. */
export interface CaseSummary {
  language: 'ms' | 'en';
  caseId: string;
  leaseId: string;
  preparedOn: string;
  preparedBy: string;
  ownerName: string;
  tenantName: string;
  premises: string;
  period: string;
  dueDate: string;
  amount: string;
  /** RENT, or the recharged utility bill's kind. */
  item?: string;
  /** Rent and utility bills of the lease still unpaid today. */
  totalOverdue: string;
  stage: string;
  assignedName: string | null;
  history: Array<{ at: string; byName: string; action: string; note?: string }>;
  followUps: Array<{ at: string; byName: string; channel: string; note: string; promiseDate?: string }>;
  /** The files in the pack, and any document that could not be added, with why. */
  files: string[];
  missing: Array<{ item: string; reason: string }>;
}

const GREEN = '#047857';
const GREY = '#64748b';

const TEXT = {
  ms: {
    title: 'PAKEJ LEGAL: KES KUTIPAN SEWA',
    facts: { caseId: 'Kes', leaseId: 'Sewaan', owner: 'Pemilik', tenant: 'Penyewa', premises: 'Premis', item: 'Perkara', period: 'Bulan', dueDate: 'Tarikh perlu bayar', amount: 'Amaun', totalOverdue: 'Jumlah tertunggak sewaan ini hari ini (sewa dan bil utiliti)', stage: 'Peringkat', assigned: 'Pegawai', prepared: 'Disediakan' },
    item: { RENT: 'Sewa', ELECTRICITY: 'Bil elektrik', WATER: 'Bil air', SEWERAGE: 'Bil pembetungan', OTHER: 'Bil utiliti' } as Record<string, string>,
    stage: { OPEN: 'Dibuka', REMINDER_1: 'Peringatan 1', REMINDER_2: 'Peringatan 2', REMINDER_3: 'Peringatan 3', LEGAL: 'Legal', PAID: 'Dibayar', CLOSED: 'Ditutup' } as Record<string, string>,
    action: { OPENED: 'Kes dibuka', REMINDER_SENT: 'Peringatan dihantar', TO_LEGAL: 'Diserahkan kepada Legal', CLOSED: 'Kes ditutup', PAID: 'Dibayar' } as Record<string, string>,
    channel: { CALL: 'Panggilan', WHATSAPP: 'WhatsApp', EMAIL: 'E-mel', VISIT: 'Lawatan', MEETING: 'Mesyuarat', OTHER: 'Lain-lain' } as Record<string, string>,
    contents: 'Kandungan pakej', missing: 'Tidak dimasukkan', history: 'Sejarah kes', followUps: 'Susulan dengan penyewa', none: 'Tiada.', promise: 'janji bayar',
    unassigned: 'Belum ditugaskan', by: 'oleh',
    footer: 'Pakej ini dijana melalui Wealth Pooling daripada rekod kes. Perjanjian yang ditandatangani disertakan tanpa diubah.',
  },
  en: {
    title: 'LEGAL PACK: RENT COLLECTION CASE',
    facts: { caseId: 'Case', leaseId: 'Lease', owner: 'Owner', tenant: 'Tenant', premises: 'Premises', item: 'Item', period: 'Month', dueDate: 'Due date', amount: 'Amount', totalOverdue: 'Total overdue under this lease today (rent and utility bills)', stage: 'Stage', assigned: 'Officer', prepared: 'Prepared' },
    item: { RENT: 'Rent', ELECTRICITY: 'Electricity bill', WATER: 'Water bill', SEWERAGE: 'Sewerage bill', OTHER: 'Utility bill' } as Record<string, string>,
    stage: { OPEN: 'Open', REMINDER_1: 'Reminder 1', REMINDER_2: 'Reminder 2', REMINDER_3: 'Reminder 3', LEGAL: 'Legal', PAID: 'Paid', CLOSED: 'Closed' } as Record<string, string>,
    action: { OPENED: 'Case opened', REMINDER_SENT: 'Reminder sent', TO_LEGAL: 'Passed to Legal', CLOSED: 'Case closed', PAID: 'Paid' } as Record<string, string>,
    channel: { CALL: 'Call', WHATSAPP: 'WhatsApp', EMAIL: 'Email', VISIT: 'Visit', MEETING: 'Meeting', OTHER: 'Other' } as Record<string, string>,
    contents: 'Contents of the pack', missing: 'Not included', history: 'Case history', followUps: 'Follow-ups with the tenant', none: 'None.', promise: 'promised to pay by',
    unassigned: 'Not assigned', by: 'by',
    footer: 'This pack was generated through Wealth Pooling from the case records. The signed agreement is included unchanged.',
  },
};

const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');

/** The legal pack's cover PDF, in Malay or English. */
export function renderCaseSummary(summary: CaseSummary): Promise<Buffer> {
  const text = TEXT[summary.language];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${text.title} ${summary.caseId}`, Author: summary.ownerName } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN).text(summary.ownerName, left);
    doc.moveTo(left, doc.y + 6).lineTo(left + width, doc.y + 6).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000').text(text.title, left, doc.y, { width, align: 'center' });
    doc.moveDown(0.8);
    const facts: Array<[string, string]> = [
      [text.facts.caseId, summary.caseId], [text.facts.leaseId, summary.leaseId], [text.facts.owner, summary.ownerName], [text.facts.tenant, summary.tenantName],
      [text.facts.premises, summary.premises], [text.facts.item, text.item[summary.item ?? 'RENT'] ?? summary.item ?? ''], [text.facts.period, summary.period], [text.facts.dueDate, summary.dueDate], [text.facts.amount, summary.amount],
      [text.facts.totalOverdue, summary.totalOverdue], [text.facts.stage, text.stage[summary.stage] ?? summary.stage], [text.facts.assigned, summary.assignedName ?? text.unassigned],
      [text.facts.prepared, `${summary.preparedOn} ${text.by} ${summary.preparedBy}`],
    ];
    for (const [label, value] of facts) doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);

    const heading = (value: string) => { doc.moveDown(1); doc.font('Helvetica-Bold').fontSize(11).fillColor(GREEN).text(value, left, doc.y, { width }); doc.moveDown(0.3); };
    const line = (value: string, note?: string) => {
      doc.font('Helvetica').fontSize(9).fillColor('#000000').text(value, left, doc.y, { width });
      if (note) doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(GREY).text(note, left + 12, doc.y, { width: width - 12 });
      doc.moveDown(0.2);
    };
    heading(text.contents);
    summary.files.forEach((name) => line(`• ${name}`));
    if (summary.missing.length) {
      heading(text.missing);
      summary.missing.forEach((item) => line(`• ${item.item}`, item.reason));
    }
    heading(text.history);
    if (!summary.history.length) line(text.none);
    summary.history.forEach((entry) => line(`${when(entry.at)} · ${text.action[entry.action] ?? entry.action} · ${entry.byName}`, entry.note));
    heading(text.followUps);
    if (!summary.followUps.length) line(text.none);
    summary.followUps.forEach((entry) => line(`${when(entry.at)} · ${text.channel[entry.channel] ?? entry.channel} · ${entry.byName}${entry.promiseDate ? ` · ${text.promise} ${entry.promiseDate}` : ''}`, entry.note));
    doc.moveDown(1.5);
    doc.font('Helvetica').fontSize(7.5).fillColor(GREY).text(text.footer, left, doc.y, { width, align: 'center' });
    doc.end();
  });
}
