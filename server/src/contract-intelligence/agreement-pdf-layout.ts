import type PDFKit from 'pdfkit';
import { AgreementFront, Section } from './agreement-document';

/** How each party's execution block reads: signed on the Platform, or blank lines to sign by hand. */
export interface ExecutionBlock { defined: string; name: string; registration: string; signed?: string }

export interface AgreementLayout {
  contractNumber: string;
  title: string;
  version: number;
  status: string;
  /** "23rd day of October 2026" once executed; blank lines otherwise. */
  dated?: string;
  front?: AgreementFront | null;
  sections: Section[];
  execution: ExecutionBlock[];
}

const INK = '#000000';
const GREY = '#666666';
const SERIF = 'Times-Roman';
const SERIF_BOLD = 'Times-Bold';
const SERIF_ITALIC = 'Times-Italic';

const ordinal = (day: number) => `${day}${[11, 12, 13].includes(day % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;

/** "23rd day of October 2026" in Malaysian time. */
export function datedLine(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(value);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${ordinal(Number(get('day')))} day of ${get('month')} ${get('year')}`;
}

/**
 * Draws a whole agreement: the cover page in the usual Malaysian form, the parties and recitals, the
 * numbered clauses, the schedules and the execution page. Agreements drafted before the cover page
 * existed (no `front`) get a plain heading instead.
 */
export function drawAgreement(doc: PDFKit.PDFDocument, layout: AgreementLayout): void {
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const front = layout.front;
  if (!front) {
    doc.font('Helvetica-Bold').fontSize(18).fillColor(INK).text(layout.title, { align: 'center' });
    doc.moveDown(0.3).font('Helvetica').fontSize(10).fillColor(GREY).text(`Document No. ${layout.contractNumber} | Version ${layout.version} | ${layout.status}`, { align: 'center' });
    for (const section of layout.sections) {
      doc.moveDown().font('Helvetica-Bold').fontSize(12).fillColor(INK).text(`${section.number}. ${section.title}`);
      doc.moveDown(0.3).font('Helvetica').fontSize(10).text(section.paragraphs.join('\n\n'), { lineGap: 3 });
    }
    return;
  }

  // Starts a new page when the next block would not fit, so a clause number is never left alone at a page foot.
  const fit = (value: string, indent: number) => {
    const needed = doc.font(SERIF).fontSize(11).heightOfString(value, { width: width - indent, lineGap: 2 });
    if (doc.y + Math.min(needed, 120) > doc.page.height - doc.page.margins.bottom) doc.addPage();
  };

  // Cover page.
  doc.font('Helvetica').fontSize(8).fillColor(GREY).text('PRIVATE AND CONFIDENTIAL', left, 40, { width, align: 'right' });
  doc.font(SERIF_BOLD).fontSize(12).fillColor(INK).text(`DATED THIS ${layout.dated ? layout.dated.toUpperCase() : '______ DAY OF ________________ 20____'}`, left, 120, { width, align: 'center' });
  doc.font(SERIF).fontSize(12).text('BETWEEN', left, 200, { width, align: 'center' });
  let y = 250;
  front.parties.forEach((party, index) => {
    if (index > 0) {
      doc.font(SERIF).fontSize(12).fillColor(INK).text('AND', left, y, { width, align: 'center' });
      y += 40;
    }
    doc.font(SERIF_BOLD).fontSize(20).fillColor(INK).text(party.name.toUpperCase(), left, y, { width, align: 'center' });
    y = doc.y + 2;
    doc.font(SERIF).fontSize(12).text(`(${/^\d|^\[/.test(party.registration) ? `Company No.: ${party.registration}` : party.registration})`, left, y, { width, align: 'center' });
    y = doc.y + 2;
    doc.font(SERIF_ITALIC).fontSize(12).text(`(${party.description})`, left, y, { width, align: 'center' });
    y = doc.y + 40;
  });
  const ruleTop = Math.max(y + 10, 520);
  doc.moveTo(left, ruleTop).lineTo(left + width, ruleTop).lineWidth(1).strokeColor(INK).stroke();
  doc.font(SERIF_BOLD).fontSize(24).fillColor(INK).text(front.title.toUpperCase(), left, ruleTop + 22, { width, align: 'center' });
  doc.font(SERIF_BOLD).fontSize(11).text(`"${front.projectName.toUpperCase()}" PROJECT`, left, doc.y + 10, { width, align: 'center' });
  const ruleBottom = doc.y + 18;
  doc.moveTo(left, ruleBottom).lineTo(left + width, ruleBottom).lineWidth(1).stroke();
  doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`Document No. ${layout.contractNumber}  |  Version ${layout.version}  |  ${layout.status}`, left, ruleBottom + 14, { width, align: 'center' });

  // Parties and recitals.
  doc.addPage();
  const para = (value: string, options: PDFKit.Mixins.TextOptions = {}) => doc.font(SERIF).fontSize(11).fillColor(INK).text(value, { align: 'justify', lineGap: 2, ...options });
  doc.font(SERIF_BOLD).fontSize(11).fillColor(INK).text('THIS AGREEMENT', left, doc.y, { continued: true }).font(SERIF).text(' is made on the date stated on the first page.');
  doc.moveDown(0.8).font(SERIF_BOLD).text('BETWEEN:');
  front.parties.forEach((party, index) => {
    doc.moveDown(0.6);
    const top = doc.y;
    doc.font(SERIF).fontSize(11).text(`(${index + 1})`, left, top, { width: 30 });
    doc.font(SERIF_BOLD).text(`${party.name.toUpperCase()} `, left + 30, top, { width: width - 30, continued: true }).font(SERIF).text(`(${/^\d|^\[/.test(party.registration) ? `Company No.: ${party.registration}` : party.registration}) of ${party.address} ("${party.defined.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())}")${index < front.parties.length - 1 ? '; and' : '.'}`, { align: 'justify' });
  });
  doc.moveDown(0.6);
  para('(each a "Party" and together the "Parties")', { width, align: 'left' });
  doc.moveDown(0.8).font(SERIF_BOLD).fontSize(11).text('WHEREAS:', left);
  front.recitals.forEach((recital, index) => {
    doc.moveDown(0.5);
    fit(recital, 30);
    const top = doc.y;
    doc.font(SERIF).fontSize(11).text(`(${String.fromCharCode(65 + index)})`, left, top, { width: 30 });
    doc.text(recital, left + 30, top, { width: width - 30, align: 'justify', lineGap: 2 });
  });
  doc.moveDown(0.8).font(SERIF_BOLD).fontSize(11).text('NOW IT IS AGREED', left, doc.y, { continued: true }).font(SERIF).text(' as follows:');

  // Clauses, then each schedule on its own page.
  for (const section of layout.sections) {
    const schedule = section.number.startsWith('Schedule');
    if (schedule) {
      doc.addPage();
      doc.font(SERIF_BOLD).fontSize(12).text(section.number.toUpperCase(), left, doc.y, { width, align: 'center' });
      doc.font(SERIF_BOLD).fontSize(12).text(section.title.toUpperCase(), { width, align: 'center' });
      doc.moveDown(0.6);
      for (const line of section.paragraphs) { para(line, { width }); doc.moveDown(0.3); }
      continue;
    }
    if (doc.y > doc.page.height - 140) doc.addPage();
    doc.moveDown(0.9).font(SERIF_BOLD).fontSize(11.5).fillColor(INK).text(`${section.number}.  ${section.title.toUpperCase()}`, left, doc.y, { width });
    for (const line of section.paragraphs) {
      doc.moveDown(0.35);
      const sub = line.match(/^(\d+\.\d+)\s+(.*)$/s);
      fit(sub ? sub[2] : line, 36);
      const top = doc.y;
      if (sub) {
        doc.font(SERIF).fontSize(11).text(sub[1], left, top, { width: 36 });
        doc.text(sub[2], left + 36, top, { width: width - 36, align: 'justify', lineGap: 2 });
      } else if (line.startsWith('"')) {
        doc.font(SERIF).fontSize(11).text(line, left + 36, top, { width: width - 36, align: 'justify', lineGap: 2 });
      } else {
        doc.font(SERIF).fontSize(11).text(line, left + 36, top, { width: width - 36, align: 'justify', lineGap: 2 });
      }
    }
  }

  // Execution page.
  doc.addPage();
  doc.font(SERIF_BOLD).fontSize(11).fillColor(INK).text('IN WITNESS WHEREOF', left, doc.y, { continued: true }).font(SERIF).text(' the Parties have signed this Agreement on the date stated on the first page.', { align: 'justify' });
  for (const block of layout.execution) {
    doc.moveDown(1.5);
    doc.font(SERIF_BOLD).fontSize(11).text(`SIGNED for and on behalf of ${block.name.toUpperCase()}`, left, doc.y, { width });
    doc.font(SERIF).text(`(${/^\d|^\[/.test(block.registration) ? `Company No.: ${block.registration}` : block.registration}), as ${block.defined}`, { width });
    doc.moveDown(0.5);
    if (block.signed) {
      doc.font(SERIF_ITALIC).text(block.signed, { width, align: 'justify' });
    } else {
      for (const label of ['Signature', 'Name', 'Designation', 'Date']) doc.font(SERIF).text(`${label}: ________________________________________`, { width });
      doc.moveDown(0.4).font(SERIF).text('In the presence of:', { width });
      for (const label of ['Signature', 'Name', 'NRIC No.']) doc.font(SERIF).text(`${label}: ________________________________________`, { width });
    }
  }
}

/** "Document No. … | p. X of Y" at the foot of every page, and a DRAFT watermark across it until the agreement is executed. */
export function drawFooters(doc: PDFKit.PDFDocument, contractNumber: string, watermark?: string): void {
  const range = doc.bufferedPageRange();
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(GREY).text(`${contractNumber}  |  p. ${index + 1} of ${range.count}`, left, doc.page.height - 36, { width, align: 'center', lineBreak: false });
    if (watermark) {
      doc.save();
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.font('Helvetica-Bold').fontSize(110).fillColor('#cc0000').opacity(0.12).text(watermark, 0, doc.page.height / 2 - 55, { width: doc.page.width, align: 'center', lineBreak: false });
      doc.restore();
    }
    doc.page.margins.bottom = bottom;
  }
}
