import PDFDocument from 'pdfkit';

/** One line of the statement: a month's rent or a utility bill the owner recharged. */
export interface StatementLine {
  kind: 'RENT' | 'ELECTRICITY' | 'WATER' | 'SEWERAGE' | 'OTHER';
  period: string;
  dueDate: string | null;
  amount: number;
  /** DUE, OVERDUE, RECORDED (received, Accounts still confirming) or PAID. */
  status: string;
  paidAt: string | null;
  reference: string | null;
}

export interface LeaseStatement {
  language: 'ms' | 'en';
  leaseId: string;
  issuedOn: string;
  month: string;
  ownerName: string;
  tenantName: string;
  unit: string;
  asset: string;
  leaseStart: string;
  leaseEnd: string;
  currency: string;
  lines: StatementLine[];
}

const GREEN = '#047857';
const GREY = '#64748b';
const RED = '#b91c1c';

/** The lines billed by the statement date (due on or before it); later months are not yet owed. */
export function statementTotals(lines: StatementLine[], issuedOn: string) {
  const billed = lines.filter((line) => !line.dueDate || line.dueDate <= issuedOn);
  const round = (value: number) => Math.round(value * 100) / 100;
  const total = (items: StatementLine[]) => round(items.reduce((sum, line) => sum + line.amount, 0));
  const unpaid = billed.filter((line) => line.status === 'DUE' || line.status === 'OVERDUE');
  return {
    billed,
    billedTotal: total(billed),
    paid: total(billed.filter((line) => line.status === 'PAID')),
    beingConfirmed: total(billed.filter((line) => line.status === 'RECORDED')),
    outstanding: total(unpaid),
    overdue: total(unpaid.filter((line) => line.dueDate !== null && line.dueDate < issuedOn)),
  };
}

const TEXT = {
  ms: {
    title: 'PENYATA AKAUN',
    ref: 'Sewaan', date: 'Tarikh penyata', month: 'Bulan', to: 'Kepada', premises: 'Premis', term: 'Tempoh sewaan',
    columns: ['Perkara', 'Tarikh perlu bayar', 'Amaun', 'Status', 'Tarikh bayar', 'Rujukan'],
    kind: { RENT: 'Sewa', ELECTRICITY: 'Elektrik', WATER: 'Air', SEWERAGE: 'Pembetungan', OTHER: 'Lain-lain' },
    status: { DUE: 'Belum dibayar', OVERDUE: 'Tertunggak', RECORDED: 'Diterima, sedang disahkan', PAID: 'Dibayar' } as Record<string, string>,
    billed: 'Jumlah dikenakan setakat tarikh penyata', paid: 'Jumlah dibayar', confirming: 'Diterima, sedang disahkan', outstanding: 'BAKI TERTUNGGAK', overdue: 'Daripadanya telah lewat tarikh',
    none: 'Tiada caj dikenakan setakat tarikh penyata ini.',
    ask: 'Sila jelaskan baki tertunggak ke akaun bank kami dan nyatakan nombor sewaan sebagai rujukan.',
    clear: 'Tiada baki tertunggak. Terima kasih atas bayaran anda.',
    footer: 'Penyata ini dijana melalui Wealth Pooling. Tiada caj lewat dikenakan. Sila maklumkan kami jika terdapat sebarang percanggahan.',
  },
  en: {
    title: 'STATEMENT OF ACCOUNT',
    ref: 'Lease', date: 'Statement date', month: 'Month', to: 'To', premises: 'Premises', term: 'Lease term',
    columns: ['Item', 'Due date', 'Amount', 'Status', 'Paid on', 'Reference'],
    kind: { RENT: 'Rent', ELECTRICITY: 'Electricity', WATER: 'Water', SEWERAGE: 'Sewerage', OTHER: 'Other' },
    status: { DUE: 'Unpaid', OVERDUE: 'Overdue', RECORDED: 'Received, being confirmed', PAID: 'Paid' } as Record<string, string>,
    billed: 'Billed up to the statement date', paid: 'Paid', confirming: 'Received, being confirmed', outstanding: 'OUTSTANDING BALANCE', overdue: 'Of which past due',
    none: 'Nothing has been billed up to the date of this statement.',
    ask: 'Please settle the outstanding balance to our bank account, quoting the lease number as the reference.',
    clear: 'Nothing is outstanding. Thank you for your payments.',
    footer: 'This statement was generated through Wealth Pooling. No late charge is applied. Please tell us of any discrepancy.',
  },
};

const amountText = (currency: string, value: number) => `${currency === 'MYR' ? 'RM' : currency} ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** An A4 statement of account from the owner to the tenant: every charge billed so far and the balance, in Malay or English. */
export function renderLeaseStatement(statement: LeaseStatement): Promise<Buffer> {
  const text = TEXT[statement.language];
  const totals = statementTotals(statement.lines, statement.issuedOn);
  const money = (value: number) => amountText(statement.currency, value);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `${text.title} ${statement.leaseId} ${statement.month}`, Author: statement.ownerName } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const bottom = () => doc.page.height - doc.page.margins.bottom - 30;

    doc.font('Helvetica-Bold').fontSize(16).fillColor(GREEN).text(statement.ownerName, left);
    doc.moveTo(left, doc.y + 6).lineTo(left + width, doc.y + 6).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.2);
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000').text(text.title, left, doc.y, { width, align: 'center' });
    doc.moveDown(0.8);
    const facts: Array<[string, string]> = [
      [text.to, statement.tenantName], [text.ref, statement.leaseId], [text.premises, `${statement.unit}, ${statement.asset}`],
      [text.term, `${statement.leaseStart} – ${statement.leaseEnd}`], [text.month, statement.month], [text.date, statement.issuedOn],
    ];
    for (const [label, value] of facts) doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(`${label}: `, left, doc.y, { continued: true }).fillColor('#000000').text(value);
    doc.moveDown(1);

    // Columns: item, due date, amount, status, paid on, reference.
    const widths = [0.17, 0.15, 0.15, 0.2, 0.13, 0.2].map((share) => share * width);
    const row = (cells: string[], options: { bold?: boolean; colour?: string; fill?: string } = {}) => {
      if (doc.y > bottom() - 20) doc.addPage();
      const top = doc.y;
      if (options.fill) doc.rect(left, top - 2, width, 16).fill(options.fill);
      let x = left;
      cells.forEach((cell, index) => {
        doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(index === 3 && options.colour ? options.colour : '#000000')
          .text(cell, x + 3, top, { width: widths[index] - 6, align: index === 2 ? 'right' : 'left', lineBreak: false, ellipsis: true });
        x += widths[index];
      });
      doc.y = top + 16;
      doc.x = left;
    };
    row(text.columns, { bold: true, fill: '#ecfdf5' });
    if (!totals.billed.length) {
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9.5).fillColor(GREY).text(text.none, left, doc.y, { width });
    }
    for (const line of totals.billed) {
      const colour = line.status === 'OVERDUE' ? RED : line.status === 'PAID' ? GREEN : undefined;
      row([`${text.kind[line.kind]} ${line.period}`, line.dueDate ?? '', money(line.amount), text.status[line.status] ?? line.status, line.paidAt ?? '', line.reference ?? ''], { colour });
    }
    doc.moveTo(left, doc.y + 2).lineTo(left + width, doc.y + 2).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1);

    const total = (label: string, value: number, options: { bold?: boolean; colour?: string } = {}) => {
      if (doc.y > bottom()) doc.addPage();
      const top = doc.y;
      doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(options.bold ? 11 : 9.5).fillColor(options.colour ?? '#000000');
      doc.text(label, left + width * 0.35, top, { width: width * 0.4 });
      doc.text(money(value), left + width * 0.75, top, { width: width * 0.25, align: 'right' });
      doc.x = left;
    };
    total(text.billed, totals.billedTotal);
    total(text.paid, totals.paid);
    if (totals.beingConfirmed > 0) total(text.confirming, totals.beingConfirmed);
    doc.moveDown(0.3);
    total(text.outstanding, totals.outstanding, { bold: true, colour: totals.outstanding > 0 ? RED : GREEN });
    if (totals.overdue > 0) total(text.overdue, totals.overdue, { colour: RED });
    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(10).fillColor('#000000').text(totals.outstanding > 0 ? text.ask : text.clear, left, doc.y, { width });
    doc.font('Helvetica').fontSize(7.5).fillColor(GREY).text(text.footer, left, doc.page.height - doc.page.margins.bottom - 20, { width, align: 'center' });
    doc.end();
  });
}
