/**
 * Generates a set of SAMPLE KYC documents for testing, with the details you pass in, so that
 * the "Documents vs entered details" check matches what you type into the KYC form.
 * Every run adds a random reference, so two testers never upload byte-identical files
 * (which would trip the duplicate-identity check).
 *
 * Usage (from the server folder):
 *   npm run kyc:samples -- --name "AMINAH BINTI YUSOF" --id 900512-10-1234 --dob 1990-05-12 --address "No. 8, Jalan Tun Razak, 50400 Kuala Lumpur"
 * Output: C:\clone_how\kyc-test-files\<name>\ (override with --out <folder>)
 *
 * Renders with Microsoft Edge in headless mode (installed on Windows by default).
 * All files are clearly marked SAMPLE - TEST ONLY.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function arg(name: string, fallback?: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (value) return value;
  if (fallback !== undefined) return fallback;
  console.error(`Missing --${name}. Example:\n  npm run kyc:samples -- --name "AMINAH BINTI YUSOF" --id 900512-10-1234 --dob 1990-05-12 --address "No. 8, Jalan Tun Razak, 50400 Kuala Lumpur"`);
  process.exit(1);
}

const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]!);

const name = arg('name').toUpperCase();
const idNumber = arg('id');
const dob = arg('dob');
const address = arg('address');
const outDir = path.resolve(arg('out', path.join('C:\\clone_how\\kyc-test-files', name.replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase())));
if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
  console.error('--dob must be YYYY-MM-DD, e.g. 1990-05-12');
  process.exit(1);
}
const [year, month, day] = dob.split('-');
const ref = randomUUID().slice(0, 8).toUpperCase();
const edge = EDGE_PATHS.find((candidate) => existsSync(candidate));
if (!edge) {
  console.error('Microsoft Edge was not found; it is needed to render the sample documents.');
  process.exit(1);
}

const style = `
  body { margin: 0; font-family: Arial, sans-serif; background: #e2e8f0; }
  .card { width: 640px; height: 400px; margin: 20px; border-radius: 22px; padding: 26px; box-sizing: border-box; position: relative; overflow: hidden; background: linear-gradient(135deg, #dbeafe, #f0fdf4); border: 2px solid #94a3b8; }
  .title { font-weight: 800; font-size: 20px; color: #1e3a8a; letter-spacing: 1px; }
  .row { margin-top: 12px; font-size: 18px; color: #0f172a; }
  .photo { position: absolute; right: 30px; top: 80px; width: 130px; height: 160px; border-radius: 10px; background: #cbd5e1; display: flex; align-items: center; justify-content: center; color: #475569; font-size: 13px; text-align: center; }
  .stamp { position: absolute; left: 20px; bottom: 18px; font-size: 15px; font-weight: 900; color: #dc2626; }
  .bill { width: 600px; padding: 40px; background: white; }`;
const stamp = `<div class="stamp">SAMPLE - TEST ONLY - NOT A REAL DOCUMENT · Ref ${ref}</div>`;
const e = { name: escapeHtml(name), id: escapeHtml(idNumber), address: escapeHtml(address) };
const pages: Array<{ file: string; html: string; pdf?: boolean }> = [
  { file: '1-national-id-front.png', html: `<div class="card"><div class="title">IDENTITY CARD (SAMPLE)</div><div class="row">Name: <b>${e.name}</b></div><div class="row">ID No: <b>${e.id}</b></div><div class="row">Date of birth: ${day}-${month}-${year}</div><div class="photo">PHOTO<br>(sample)</div>${stamp}</div>` },
  { file: '2-national-id-back.png', html: `<div class="card"><div class="title">IDENTITY CARD - BACK (SAMPLE)</div><div class="row">ID No: <b>${e.id}</b></div><div class="row">Address:</div><div class="row"><b>${e.address}</b></div>${stamp}</div>` },
  { file: '3-selfie-with-id.png', html: `<div class="card" style="background:linear-gradient(135deg,#fef3c7,#fde68a)"><div class="title">SELFIE HOLDING ID (SAMPLE)</div><div class="row">Applicant: <b>${e.name}</b></div><div class="photo" style="right:220px;top:120px;width:150px;height:190px;border-radius:50%">FACE<br>(sample)</div><div class="photo" style="top:180px;width:150px;height:95px">ID CARD<br>(sample)</div>${stamp}</div>` },
  { file: '4-proof-of-address.pdf', pdf: true, html: `<div class="bill"><div class="title">UTILITY BILL (SAMPLE)</div><div class="row">Account holder: <b>${e.name}</b></div><div class="row">Service address: <b>${e.address}</b></div><div class="row">Bill date: 15-09-2026</div><div class="row">Amount due: RM 87.40</div><p style="margin-top:40px;color:#b91c1c;font-weight:800">SAMPLE DOCUMENT - FOR TESTING ONLY - NOT A REAL BILL · Ref ${ref}</p></div>` },
];

mkdirSync(outDir, { recursive: true });
const workDir = path.join(os.tmpdir(), `kyc-samples-${ref}`);
mkdirSync(workDir, { recursive: true });
try {
  for (const page of pages) {
    const htmlFile = path.join(workDir, `${page.file}.html`);
    writeFileSync(htmlFile, `<!doctype html><html><head><meta charset="utf-8"><style>${style}</style></head><body>${page.html}</body></html>`);
    const target = path.join(outDir, page.file);
    const output = page.pdf ? [`--print-to-pdf=${target}`, '--no-pdf-header-footer'] : [`--screenshot=${target}`, '--window-size=680,440', '--hide-scrollbars'];
    execFileSync(edge, ['--headless=new', '--disable-gpu', ...output, `file:///${htmlFile.replace(/\\/g, '/')}`], { stdio: 'ignore' });
    if (!existsSync(target)) throw new Error(`Edge did not produce ${page.file}`);
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
console.log(`Sample KYC documents for ${name} (ref ${ref}):\n  ${outDir}\n${pages.map((page) => `    ${page.file}`).join('\n')}`);
