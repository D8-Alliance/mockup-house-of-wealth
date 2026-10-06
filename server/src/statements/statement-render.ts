import PDFDocument from 'pdfkit';
import { Statement } from './statements.service';

/** RFC 4180 cell, with a leading quote on formula-like values so spreadsheets do not execute them. */
function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function renderStatementCsv(statement: Statement) {
  const lines: Array<Array<string | number>> = [
    [statement.title],
    ['Reference', statement.reference],
    ['Period', `${statement.period.from} to ${statement.period.to} (${statement.period.timezone})`],
    ['Generated', statement.generatedAt],
    ...statement.subject,
    [],
    ['Summary'],
    ...statement.summary,
  ];
  for (const section of statement.sections) {
    lines.push([], [section.title], section.columns, ...section.rows);
    if (section.note) lines.push([section.note]);
  }
  lines.push([], ['Notes'], ...statement.notes.map((note) => [note]));
  // BOM so Excel opens UTF-8 names correctly.
  return '﻿' + lines.map((line) => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function renderStatementPdf(statement: Statement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferPages: true, info: { Title: `${statement.title} ${statement.reference}`, Author: 'Wealth Pooling' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc.font('Helvetica-Bold').fontSize(18).text(statement.title);
    doc.font('Helvetica').fontSize(9).fillColor('#555555').text(`Reference ${statement.reference}  |  Period ${statement.period.from} to ${statement.period.to} (${statement.period.timezone})  |  Generated ${statement.generatedAt}`);
    doc.moveDown(0.6).fillColor('#000000');
    for (const [label, value] of statement.subject) doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true }).font('Helvetica').text(value);

    doc.moveDown(0.6).font('Helvetica-Bold').fontSize(12).text('Summary');
    for (const [label, value] of statement.summary) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).text(label, left, y, { width: width * 0.4 });
      doc.text(value, left + width * 0.4, y, { width: width * 0.2, align: 'right' });
    }

    for (const section of statement.sections) {
      doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).text(section.title, left);
      const columnWidth = width / section.columns.length;
      const row = (cells: Array<string | number>, bold: boolean) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
        const heights = cells.map((cell) => doc.heightOfString(String(cell), { width: columnWidth - 4 }));
        const height = Math.max(...heights, 10) + 4;
        if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
        const y = doc.y;
        cells.forEach((cell, index) => doc.text(String(cell), left + index * columnWidth, y + 2, { width: columnWidth - 4 }));
        doc.moveTo(left, y + height).lineTo(left + width, y + height).strokeColor('#dddddd').stroke();
        doc.x = left;
        doc.y = y + height;
      };
      row(section.columns, true);
      section.rows.forEach((cells) => row(cells, false));
      if (section.note) doc.moveDown(0.3).font('Helvetica-Oblique').fontSize(9).text(section.note, left);
    }

    doc.moveDown(0.8).font('Helvetica-Bold').fontSize(10).text('Notes', left);
    statement.notes.forEach((note) => doc.font('Helvetica').fontSize(8).fillColor('#444444').text(`- ${note}`, left, undefined, { width }));

    const range = doc.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      doc.switchToPage(range.start + index);
      // Writing inside the bottom margin would otherwise make pdfkit start a new, blank page.
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font('Helvetica').fontSize(7).fillColor('#888888').text(`${statement.reference}  |  Page ${index + 1} of ${range.count}`, left, doc.page.height - 28, { width, align: 'right', lineBreak: false });
      doc.page.margins.bottom = bottom;
    }
    doc.end();
  });
}
