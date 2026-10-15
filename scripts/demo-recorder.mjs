#!/usr/bin/env node
/**
 * Records backend responses for the static frontend demo (VITE_DATA_SOURCE=static).
 *
 * It sits between the frontend and the backend:
 *   frontend (VITE_API_BASE_URL=http://localhost:3002) -> this proxy :3002 -> backend :3001
 * Every GET response is saved to public/demo-data/<user>__<role>.json, keyed "GET /path?query",
 * the same key src/services/apiFetch.ts looks up. Write requests (POST/PUT/PATCH/DELETE) are
 * refused, so clicking around while recording never changes the database.
 *
 * Usage:
 *   1. Start the backend (port 3001) with the seed database.
 *   2. node scripts/demo-recorder.mjs            (options: --port 3002 --target http://localhost:3001)
 *   3. In another terminal: set VITE_API_BASE_URL=http://localhost:3002 and run npm run dev.
 *   4. Sign in as each demo persona and open the screens to record. Files update as you go.
 */
import http from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith('--') ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []));
const port = Number(args.port || 3002);
const target = new URL(args.target || 'http://localhost:3001');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo-data');
mkdirSync(outDir, { recursive: true });

/** Same rule as personaKey() in src/services/apiFetch.ts. */
function personaKey(authorization) {
  const token = (authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return 'public';
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    return `${claims.mock ?? 'unknown'}__${claims.role ?? 'default'}`.replace(/[^A-Za-z0-9_-]+/g, '-');
  } catch {
    return 'public';
  }
}

const cache = new Map();
const pending = new Set();
function store(persona, key, entry) {
  if (!cache.has(persona)) {
    const file = join(outDir, `${persona}.json`);
    cache.set(persona, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {});
  }
  cache.get(persona)[key] = entry;
  pending.add(persona);
}
setInterval(() => {
  for (const persona of pending) {
    const data = cache.get(persona);
    const sorted = Object.fromEntries(Object.keys(data).sort().map((key) => [key, data[key]]));
    writeFileSync(join(outDir, `${persona}.json`), JSON.stringify(sorted, null, 1));
  }
  pending.clear();
}, 1000);

const textual = (type) => /json|text|xml|csv|javascript/.test(type || '');
let recorded = 0;

http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': req.headers.origin || '*', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'Access-Control-Expose-Headers': 'Content-Disposition' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  if (req.method !== 'GET') {
    res.writeHead(403, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Recording mode: write actions are blocked so the database is not changed.' }));
    return;
  }
  const upstream = http.request({ hostname: target.hostname, port: target.port, path: req.url, method: 'GET', headers: { ...req.headers, host: target.host } }, (up) => {
    const chunks = [];
    up.on('data', (chunk) => chunks.push(chunk));
    up.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = up.headers['content-type'] || 'application/json';
      const key = `GET ${new URL(req.url, 'http://demo.local').pathname}${new URL(req.url, 'http://demo.local').search}`;
      // Only successful answers become demo data; errors would just replay the error.
      if (up.statusCode >= 200 && up.statusCode < 300) {
        store(personaKey(req.headers.authorization), key, { status: up.statusCode, contentType, ...(up.headers['content-disposition'] ? { contentDisposition: up.headers['content-disposition'] } : {}), ...(textual(contentType) ? { body: body.toString('utf8') } : { bodyBase64: body.toString('base64') }) });
        recorded += 1;
        process.stdout.write(`\rrecorded ${recorded} responses  ${key.slice(0, 70).padEnd(70)}`);
      }
      // Drop the backend's own CORS headers: sending them twice makes the browser reject the response.
      const headers = Object.fromEntries(Object.entries(up.headers).filter(([name]) => !name.startsWith('access-control-')));
      res.writeHead(up.statusCode, { ...headers, ...cors });
      res.end(body);
    });
  });
  upstream.on('error', (error) => { res.writeHead(502, cors); res.end(JSON.stringify({ message: `Backend unreachable: ${error.message}` })); });
  upstream.end();
}).listen(port, () => console.log(`Demo recorder on http://localhost:${port} -> ${target.origin}, writing to ${outDir}`));
