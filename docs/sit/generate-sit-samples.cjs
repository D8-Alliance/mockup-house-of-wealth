// Sample documents for the SIT of the Durian Jengka project. Every page says it is a test sample.
const fs = require('fs');
const path = require('path');
const PDFDocument = require('module').createRequire('C:/clone_how/mockup-house-of-wealth/server/package.json')('pdfkit');
const XLSX = require('module').createRequire('C:/clone_how/mockup-house-of-wealth/server/package.json')('xlsx');

const out = 'C:/clone_how/mockup-house-of-wealth/docs/sit/contoh-dokumen';
fs.mkdirSync(out, { recursive: true });
const STAMP = 'DOKUMEN CONTOH UNTUK UJIAN SISTEM (SIT) - BUKAN DOKUMEN SAH / TEST SAMPLE ONLY';
const rm = (n) => 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function pdf(file, title, build) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, pdfVersion: '1.4', compress: false, info: { Title: title, Author: 'SIT D-8 Wealth Pooling', Producer: 'SIT sample generator', CreationDate: new Date('2026-10-20T09:00:00+08:00'), ModDate: new Date('2026-10-20T09:00:00+08:00') } });
  doc.pipe(fs.createWriteStream(path.join(out, file)));
  const stamp = () => { doc.save().fontSize(8).fillColor('#b91c1c').text(STAMP, 50, 20, { width: 495, align: 'center' }).restore(); doc.fillColor('black'); };
  stamp(); doc.on('pageAdded', stamp);
  doc.moveDown(2).fontSize(16).font('Helvetica-Bold').text(title).font('Helvetica').fontSize(10).moveDown();
  build(doc);
  doc.moveDown(2).fontSize(8).fillColor('#555').text('All names, numbers and references in this document are fictional and were prepared only to test the D-8 Wealth Pooling system.');
  doc.end();
}
function table(doc, rows, widths) {
  for (const [i, row] of rows.entries()) {
    const y = doc.y; let x = 50;
    doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica');
    row.forEach((cell, c) => { doc.text(String(cell), x, y, { width: widths[c], align: c === 0 ? 'left' : 'right' }); x += widths[c]; });
    doc.moveDown(0.4);
  }
  doc.font('Helvetica').x = 50; doc.moveDown();
}
const kv = (doc, pairs) => { for (const [k, v] of pairs) { doc.font('Helvetica-Bold').text(k + ': ', { continued: true }).font('Helvetica').text(v); } doc.moveDown(); };

const PROJECT = 'Durian Musang King Replanting, 10 Acres, Jengka - Test';
const SPONSOR = 'FELCRA (test organisation ORG-MYS-1FF17D84)';

// 1. Financial model (10 years). Revenue from year 2031 as trees bear fruit.
const years = [2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036];
const kgPerTree = [0, 0, 0, 0, 15, 30, 50, 70, 80, 80];
const fm = years.map((y, i) => {
  const revenue = 450 * kgPerTree[i] * 35;
  const capex = [300000, 450000, 450000, 0, 0, 0, 0, 0, 0, 0][i];
  const opex = i < 4 ? 60000 : 120000 + kgPerTree[i] * 450 * 4;
  return { y, revenue, capex, opex, profit: revenue - opex };
});
pdf('01_Model_Kewangan_Durian_Jengka.pdf', 'Financial Model - ' + PROJECT, (doc) => {
  kv(doc, [['Project', PROJECT], ['Sponsor', SPONSOR], ['Projection period', '10 years, FY2027 to FY2036 (2027-2036)'], ['Prepared', '20 October 2026']]);
  doc.font('Helvetica-Bold').text('Revenue assumptions').font('Helvetica').list(['450 Musang King trees on 10 acres (45 trees per acre).', 'First harvest in 2031 (year 5); yield rises from 15 kg to 80 kg per tree by 2035.', 'Farm-gate price RM 35 per kg (grade A and B average).']).moveDown();
  doc.font('Helvetica-Bold').text('Cost assumptions').font('Helvetica').list(['Capex RM 1,200,000 in three tranches: land clearing and terracing RM 300,000; seedlings and irrigation RM 450,000; maintenance to first harvest RM 450,000.', 'Opex RM 60,000 a year before harvest; RM 120,000 a year plus RM 4 per kg harvested after.']).moveDown();
  doc.font('Helvetica-Bold').text('Valuation assumptions').font('Helvetica').list(['Discount rate 8% a year (sponsor cost of capital).', 'Sensitivity, downside case: revenue -20%.', 'Sensitivity, upside case: revenue +10%.']).moveDown();
  table(doc, [['Year', 'Revenue (RM)', 'Capex (RM)', 'Opex (RM)', 'Operating profit (RM)'], ...fm.map((r) => [r.y, r.revenue.toLocaleString(), r.capex.toLocaleString(), r.opex.toLocaleString(), r.profit.toLocaleString()])], [60, 110, 100, 100, 125]);
  const total = fm.reduce((s, r) => s + r.profit, 0);
  doc.text(`Cumulative operating profit 2027-2036: ${rm(total)}. Average net margin 2033-2036: ${Math.round(fm.slice(6).reduce((s, r) => s + r.profit / r.revenue, 0) / 4 * 100)}%.`);
});

// 2. Cash flow forecast (5 years).
pdf('02_Unjuran_Aliran_Tunai_Durian_Jengka.pdf', 'Cash Flow Forecast (5 years) - ' + PROJECT, (doc) => {
  kv(doc, [['Project', PROJECT], ['Projection period', '5 years, 2027-2031'], ['Funding drawdown', 'M1 RM 300,000 (Q1 2027), M2 RM 450,000 (Q3 2027), M3 RM 450,000 (Q2 2028)']]);
  const rows = [
    ['Item (RM)', '2027', '2028', '2029', '2030', '2031'],
    ['Cash inflow: pool funding', '750,000', '450,000', '0', '0', '0'],
    ['Cash inflow: sponsor capital', '120,000', '0', '0', '0', '0'],
    ['Cash inflow: durian sales receipts', '0', '0', '0', '0', '236,250'],
    ['Cash outflow: disbursement to works', '750,000', '450,000', '0', '0', '0'],
    ['Cash outflow: operating payments', '60,000', '60,000', '60,000', '60,000', '147,000'],
    ['Net cash flow', '60,000', '-60,000', '-60,000', '-60,000', '89,250'],
    ['Closing cash', '60,000', '0', '-60,000', '-120,000', '-30,750'],
  ];
  table(doc, rows, [175, 64, 64, 64, 64, 64]);
  doc.text('The pre-harvest gap of 2029-2030 is met from the sponsor\'s working capital line; profit sharing to investors starts after the first full harvest.');
});

// 3. Valuation report.
pdf('03_Laporan_Penilaian_Tanah_Jengka.pdf', 'Valuation Report - Agricultural Land, Jengka', (doc) => {
  kv(doc, [['Valuer', 'Penilai Contoh & Rakan Sdn Bhd (fictional), registered valuer V-0000'], ['Our reference', 'PCR/VAL/2026/1044'], ['Property', 'Lot 12345 (sample), Mukim Jengka, Daerah Maran, Pahang'], ['Land area', '10.00 acres (4.047 hectares), agricultural, freehold'], ['Date of valuation', '15 October 2026'], ['Purpose', 'Appraisal for a Shariah-compliant agricultural project financing']]);
  doc.text('Method: comparison method, supported by three sales of agricultural land in Maran district in 2025-2026 at RM 58,000 to RM 72,000 per acre.').moveDown();
  doc.font('Helvetica-Bold').fontSize(12).text('Market value: RM 650,000.00 (Ringgit Malaysia Six Hundred Fifty Thousand only)').font('Helvetica').fontSize(10).moveDown();
  doc.text('The land is valued at RM 650,000 with vacant possession, free from encumbrances. Forced sale value: RM 520,000.');
});

// 4. Land title.
pdf('04_Geran_Tanah_Lot_Jengka.pdf', 'Land Title (Certificate of Title) - Sample', (doc) => {
  kv(doc, [['Title', 'Geran Mukim 99999 (sample)'], ['Lot', 'Lot 12345, Mukim Jengka, Daerah Maran, Negeri Pahang'], ['Area', '4.047 hectares'], ['Category of land use', 'Agriculture'], ['Registered proprietor', 'FELCRA test organisation (registered owner of the whole lot)'], ['Express condition', 'Agricultural use: fruit orchard'], ['Encumbrances', 'None registered']]);
  doc.text('This land title certifies that the registered proprietor named above holds ownership of the land described. Registration recorded at the Pejabat Tanah Maran (sample entry).');
});

// 5. Bank statement for sponsor capital evidence.
pdf('05_Penyata_Bank_Modal_Penaja.pdf', 'Bank Statement - Sponsor Capital', (doc) => {
  kv(doc, [['Bank', 'Bank Ujian Berhad (fictional)'], ['Account holder', SPONSOR], ['Account number', '0000-1234-5678 (sample)'], ['Statement period', '1 October 2026 to 20 October 2026']]);
  table(doc, [['Date', 'Description', 'Debit (RM)', 'Credit (RM)', 'Balance (RM)'], ['01/10/2026', 'Opening balance', '', '', '35,000.00'], ['08/10/2026', 'Transfer from reserves', '', '150,000.00', '185,000.00'], ['15/10/2026', 'Office expenses', '5,000.00', '', '180,000.00'], ['20/10/2026', 'Closing balance', '', '', '180,000.00']], [70, 165, 85, 85, 90]);
  doc.text('RM 150,000.00 is set aside as the sponsor\'s own capital for the Durian Jengka project.');
});

// 6-8. Takaful certificates.
const cover = (file, title, coverName, number, sum, payee) => pdf(file, title, (doc) => {
  kv(doc, [['Takaful operator', 'Takaful Contoh Berhad (fictional)'], ['Certificate number', number], ['Cover', coverName], ['Participant', SPONSOR], ['Project', PROJECT], ['Sum covered', rm(sum)], ['Contribution', rm(Math.round(sum * 0.004))], ['Period', '20 October 2026 to 19 October 2027'], ['Claims paid to', payee]]);
  doc.text('This certificate confirms the takaful cover above under a Wakalah model. Subject to the terms of the takaful contract.');
});
cover('06_Sijil_Takaful_Contractors_All_Risk.pdf', "Takaful Certificate - Contractor's All Risk", "Contractor's All Risk", 'TCB-CAR-2026-0101', 1200000, 'FELCRA (project account)');
cover('07_Sijil_Takaful_Public_Liability.pdf', 'Takaful Certificate - Public Liability', 'Public liability', 'TCB-PL-2026-0102', 1000000, 'Third-party claimants');
cover('08_Sijil_PERKESO_Pekerja.pdf', 'PERKESO Registration - Workers', 'PERKESO (workers) - Employment Injury Scheme', 'PERKESO-E-000123 (sample)', 0 + 500000, 'Insured workers');

// 9. Deposit slip.
pdf('09_Slip_Deposit_Akaun_Projek.pdf', 'Deposit Confirmation - Project Account', (doc) => {
  kv(doc, [['Bank', 'Bank Ujian Berhad (fictional)'], ['Credited account', 'Durian Jengka project account 0000-9999-0001 (sample)'], ['Amount', rm(150000)], ['Date', '27 October 2026'], ['Bank reference', 'BUB-TT-20261027-7781'], ['From', SPONSOR]]);
});

// Spreadsheet version of the financial model (XLSX is also accepted).
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Financial model - ' + PROJECT], [STAMP], [], ['Year', 'Revenue', 'Capex', 'Opex', 'Operating profit'], ...fm.map((r) => [r.y, r.revenue, r.capex, r.opex, r.profit])]), 'Model');
XLSX.writeFile(wb, path.join(out, '01b_Model_Kewangan_Durian_Jengka.xlsx'));
console.log('written to', out);
