// Sample documents for SIT part 2 (asset partnership): the Gambang organic fertiliser plant.
// Every page says it is a test sample; all banks, valuers, sellers and takaful operators are fictional.
// Run: node docs/sit/generate-sit2-samples.cjs (needs the server's node_modules: pdfkit, xlsx).
const fs = require('fs');
const path = require('path');
const serverRequire = require('module').createRequire(path.join(__dirname, '../../server/package.json'));
const PDFDocument = serverRequire('pdfkit');

const out = path.join(__dirname, 'contoh-dokumen-bahagian-2');
fs.mkdirSync(out, { recursive: true });
const STAMP = 'DOKUMEN CONTOH UNTUK UJIAN SISTEM (SIT) - BUKAN DOKUMEN SAH / TEST SAMPLE ONLY';
const rm = (n) => 'RM ' + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DATE = new Date('2026-10-20T09:00:00+08:00');

function pdf(file, title, build) {
  // PDF 1.4: the server's PDF reader (pdf-parse 1.1.1) cannot read pdfkit's default output.
  const doc = new PDFDocument({ size: 'A4', margin: 50, pdfVersion: '1.4', compress: false, info: { Title: title, Author: 'SIT D-8 Wealth Pooling', Producer: 'SIT sample generator', CreationDate: DATE, ModDate: DATE } });
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
const kv = (doc, pairs) => { for (const [k, v] of pairs) doc.font('Helvetica-Bold').text(k + ': ', { continued: true }).font('Helvetica').text(v); doc.moveDown(); };

const PROJECT = 'Kilang Baja Organik Sisa Sawit, Gambang - Test';
const SPONSOR = 'FELCRA (test organisation ORG-MYS-1FF17D84)';
const OWNER = 'Al Hidayah Group Sdn Bhd';
const LAND = { title: 'GRN 112233', lot: 'Lot 8812', mukim: 'Mukim Gambang', district: 'Daerah Kuantan', state: 'Pahang' };
const MACHINE = { maker: 'Hitachi', model: 'ZW180-6', serial: 'HCMZW180C00071245', year: 2024 };

// ---- Project evidence (uploaded by the sponsor in Feasibility) ----
const years = [2027, 2028, 2029, 2030, 2031, 2032, 2033];
const tonnes = [0, 3000, 6000, 8000, 9000, 9000, 9000];
const fm = years.map((y, i) => {
  const revenue = tonnes[i] * 420;
  const opex = i === 0 ? 180000 : 420000 + tonnes[i] * 150 + 6500 * 12;
  return { y, revenue, opex, profit: revenue - opex };
});
pdf('01_Model_Kewangan_Kilang_Baja_Gambang.pdf', 'Financial Model - ' + PROJECT, (doc) => {
  kv(doc, [['Project', PROJECT], ['Sponsor', SPONSOR], ['Projection period', '7 years, FY2027 to FY2033 (2027-2033)'], ['Prepared', '20 October 2026']]);
  doc.font('Helvetica-Bold').text('Revenue assumptions').font('Helvetica').list(['Organic fertiliser from palm oil mill waste (empty fruit bunch and POME sludge).', 'Output 3,000 tonnes in 2028 rising to 9,000 tonnes a year from 2031.', 'Ex-factory price RM 420 per tonne (bagged, 50 kg).']).moveDown();
  doc.font('Helvetica-Bold').text('Cost assumptions').font('Helvetica').list(['Capex RM 2,400,000: plant building and composting bays RM 1,500,000; shredder, mixer and bagging line RM 600,000; working capital RM 300,000.', 'Land contributed by the asset owner under Musharakah (agreed value RM 900,000).', 'Wheel loader leased under Ijarah at RM 6,500 a month.', 'Opex RM 420,000 a year plus RM 150 per tonne after start-up.']).moveDown();
  doc.font('Helvetica-Bold').text('Valuation assumptions').font('Helvetica').list(['Discount rate 8% a year (sponsor cost of capital).', 'Sensitivity, downside case: revenue -20%.', 'Sensitivity, upside case: revenue +10%.']).moveDown();
  table(doc, [['Year', 'Revenue (RM)', 'Opex (RM)', 'Operating profit (RM)'], ...fm.map((r) => [r.y, r.revenue.toLocaleString(), r.opex.toLocaleString(), r.profit.toLocaleString()])], [70, 140, 140, 145]);
  doc.text(`Cumulative operating profit 2027-2033: ${rm(fm.reduce((s, r) => s + r.profit, 0))}. Net margin from 2031: ${Math.round(fm[4].profit / fm[4].revenue * 100)}%.`);
});
pdf('02_Unjuran_Aliran_Tunai_Kilang_Baja_Gambang.pdf', 'Cash Flow Forecast (5 years) - ' + PROJECT, (doc) => {
  kv(doc, [['Project', PROJECT], ['Projection period', '5 years, 2027-2031'], ['Funding drawdown', 'M1 RM 1,000,000 (Q1 2027), M2 RM 900,000 (Q3 2027), M3 RM 500,000 (Q1 2028)']]);
  table(doc, [
    ['Item (RM)', '2027', '2028', '2029', '2030', '2031'],
    ['Cash inflow: pool funding', '1,900,000', '500,000', '0', '0', '0'],
    ['Cash inflow: sponsor capital', '300,000', '0', '0', '0', '0'],
    ['Cash inflow: fertiliser sales receipts', '0', '1,260,000', '2,520,000', '3,360,000', '3,780,000'],
    ['Cash outflow: disbursement to works', '1,900,000', '500,000', '0', '0', '0'],
    ['Cash outflow: operating payments', '180,000', '948,000', '1,398,000', '1,698,000', '1,848,000'],
    ['Cash outflow: Ijarah rent (wheel loader)', '78,000', '78,000', '0', '0', '0'],
    ['Net cash flow', '42,000', '234,000', '1,122,000', '1,662,000', '1,932,000'],
  ], [185, 62, 62, 62, 62, 62]);
  doc.text('Profit is shared with investors and the land owner under the Musharakah from 2029, after the plant reaches steady output.');
});
pdf('03_Laporan_Penilaian_Tanah_dan_Jentera_Gambang.pdf', 'Valuation Report - Industrial Land and Wheel Loader, Gambang', (doc) => {
  kv(doc, [['Valuer', 'Penilai Contoh & Rakan Sdn Bhd (fictional), registered valuer V-0000'], ['Our reference', 'PCR/VAL/2026/2210'], ['Date of valuation', '16 October 2026'], ['Purpose', 'Appraisal of assets contributed to a Shariah-compliant project']]);
  doc.font('Helvetica-Bold').text('1. Industrial land').font('Helvetica').text(`${LAND.lot}, ${LAND.mukim}, ${LAND.district}, ${LAND.state} (${LAND.title}); 5.00 acres, freehold, industrial use. Comparison method, three sales in Gambang 2025-2026 at RM 170,000 to RM 190,000 per acre.`).moveDown(0.5);
  doc.text('Market value of the land: RM 900,000.00.').moveDown();
  doc.font('Helvetica-Bold').text('2. Wheel loader').font('Helvetica').text(`${MACHINE.maker} ${MACHINE.model}, serial ${MACHINE.serial}, year ${MACHINE.year}, 1,850 operating hours. Depreciated replacement cost method.`).moveDown(0.5);
  doc.text('Market value of the wheel loader: RM 380,000.00.').moveDown();
  doc.font('Helvetica-Bold').fontSize(12).text('Total appraised value: RM 1,280,000.00');
});
pdf('04_Hak_Milik_dan_Persetujuan_Pemilik_Tanah_Gambang.pdf', 'Land Title and Owner Consent - Sample', (doc) => {
  kv(doc, [['Title', `${LAND.title} (sample)`], ['Lot', `${LAND.lot}, ${LAND.mukim}, ${LAND.district}, Negeri ${LAND.state}`], ['Area', '2.023 hectares (5.00 acres)'], ['Category of land use', 'Industry'], ['Registered proprietor', `${OWNER} (registered owner of the whole lot)`]]);
  doc.text(`This land title certifies that the registered proprietor named above holds ownership of the land described. The registered owner, ${OWNER}, consents to the land being used for the ${PROJECT} under a Musharakah with the delivery partner, as approved in the platform's asset partnership.`);
});

// ---- Sponsor capital and takaful (uploaded by the sponsor) ----
pdf('05_Penyata_Bank_Modal_Penaja_Gambang.pdf', 'Bank Statement - Sponsor Capital (Gambang plant)', (doc) => {
  kv(doc, [['Bank', 'Bank Ujian Berhad (fictional)'], ['Account holder', SPONSOR], ['Account number', '0000-1234-5678 (sample)'], ['Statement period', '1 October 2026 to 20 October 2026']]);
  table(doc, [['Date', 'Description', 'Debit (RM)', 'Credit (RM)', 'Balance (RM)'], ['01/10/2026', 'Opening balance', '', '', '180,000.00'], ['12/10/2026', 'Transfer from reserves', '', '300,000.00', '480,000.00'], ['20/10/2026', 'Closing balance', '', '', '480,000.00']], [70, 165, 85, 85, 90]);
  doc.text("RM 300,000.00 is set aside as the sponsor's own capital for the Gambang organic fertiliser plant.");
});
const cover = (file, title, coverName, number, sum, participant, payee, extra = []) => pdf(file, title, (doc) => {
  kv(doc, [['Takaful operator', 'Takaful Contoh Berhad (fictional)'], ['Certificate number', number], ['Cover', coverName], ['Participant', participant], ['Project', PROJECT], ...extra, ['Sum covered', rm(sum)], ['Contribution', rm(Math.round(sum * 0.004))], ['Period', '20 October 2026 to 19 October 2027'], ['Claims paid to', payee]]);
  doc.text('This certificate confirms the takaful cover above under a Wakalah model. Subject to the terms of the takaful contract.');
});
cover('06_Sijil_Takaful_CAR_Gambang.pdf', "Takaful Certificate - Contractor's All Risk", "Contractor's All Risk", 'TCB-CAR-2026-0201', 2400000, SPONSOR, 'FELCRA (project account)');
cover('07_Sijil_Takaful_Public_Liability_Gambang.pdf', 'Takaful Certificate - Public Liability', 'Public liability', 'TCB-PL-2026-0202', 1000000, SPONSOR, 'Third-party claimants');
cover('08_Sijil_PERKESO_Pekerja_Gambang.pdf', 'PERKESO Registration - Workers', 'PERKESO (workers) - Employment Injury Scheme', 'PERKESO-E-000456 (sample)', 500000, SPONSOR, 'Insured workers');
cover('09_Sijil_Takaful_Jentera_Wheel_Loader.pdf', 'Takaful Certificate - Machinery All-Risk', 'Machinery all-risk / breakdown', 'TCB-MAR-2026-0203', 380000, `${OWNER} (lessor under Ijarah)`, OWNER, [['Machine', `${MACHINE.maker} ${MACHINE.model}, serial ${MACHINE.serial}`]]);
pdf('10_Slip_Deposit_Akaun_Projek_Gambang.pdf', 'Deposit Confirmation - Project Account', (doc) => {
  kv(doc, [['Bank', 'Bank Ujian Berhad (fictional)'], ['Credited account', 'Gambang plant project account 0000-9999-0002 (sample)'], ['Amount', rm(300000)], ['Date', '27 October 2026'], ['Bank reference', 'BUB-TT-20261027-8842'], ['From', SPONSOR]]);
});

// ---- Asset documents (uploaded by the asset owner in Assets) ----
pdf('A1_Geran_Tanah_Lot_8812_Gambang.pdf', 'Land Title (Geran) - Sample', (doc) => {
  kv(doc, [['Title', `${LAND.title} (sample)`], ['Lot', LAND.lot], ['Mukim', LAND.mukim], ['District', LAND.district], ['State', `Negeri ${LAND.state}`], ['Area', '2.023 hectares'], ['Category of land use', 'Industry'], ['Tenure', 'Freehold'], ['Registered proprietor', OWNER]]);
  doc.text('Registered at the Pejabat Tanah Kuantan (sample entry).');
});
pdf('A2_Carian_Rasmi_Lot_8812_Gambang.pdf', 'Official Search (Carian Rasmi) - Sample', (doc) => {
  kv(doc, [['Search date', '20/10/2026'], ['Title', `${LAND.title}`], ['Lot', LAND.lot], ['Mukim', LAND.mukim], ['District', LAND.district], ['State', LAND.state], ['Registered proprietor', `${OWNER}, share 1/1`], ['Endorsements', 'None registered'], ['Express condition', 'Industrial use']]);
  doc.text('Result of the official search at the Pejabat Tanah Kuantan on 20/10/2026 (sample).');
});
pdf('A3_Invois_Pembelian_Wheel_Loader.pdf', 'Tax Invoice - Purchase of Wheel Loader', (doc) => {
  kv(doc, [['Seller', 'Jentera Contoh Sdn Bhd (fictional)'], ['Invoice number', 'JCS-INV-2024-0457'], ['Invoice date', '14 March 2024'], ['Buyer', OWNER], ['Description', `${MACHINE.maker} wheel loader, model ${MACHINE.model}`], ['Serial number', MACHINE.serial], ['Year of manufacture', String(MACHINE.year)], ['Amount paid', rm(465000)], ['Payment', 'Paid in full by bank transfer; owned outright']]);
});
pdf('A4_Plat_Siri_Wheel_Loader.pdf', 'Serial Plate (photo transcript) - Sample', (doc) => {
  doc.fontSize(14).text(`${MACHINE.maker.toUpperCase()} CONSTRUCTION MACHINERY`).moveDown(0.5);
  doc.fontSize(12).text(`MODEL: ${MACHINE.model}`).text(`SERIAL NO: ${MACHINE.serial}`).text(`YEAR: ${MACHINE.year}`).text('OPERATING WEIGHT: 14,700 kg').moveDown();
  doc.fontSize(10).text('Transcript of the serial plate on the machine at Lot 8812, Gambang (photo taken 20/10/2026).');
});
console.log('written to', out);
