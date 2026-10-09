#!/usr/bin/env node
/**
 * Removes personal data from the demo recordings before they are published.
 *
 * Recordings must contain seed data only. Users who registered themselves on a local or test
 * server (ids USR-REG-*) are real people testing the system, so everything that belongs to them
 * is dropped: their rows in lists, their own detail responses (e.g. a KYC application) and any
 * response whose path names one of their records. Afterwards the files are checked again for
 * their emails and names, and the script fails if any remain.
 *
 * Usage: node scripts/demo-sanitize.mjs   (npm run demo:sanitize; run after every recording)
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo-data');
const isPrivateUser = (value) => typeof value === 'string' && /^USR-REG-/.test(value);
const OWNER_FIELDS = ['id', 'userId', 'investorUserId', 'ownerUserId', 'createdBy', 'applicantId'];
const ownedByPrivateUser = (item) => item && typeof item === 'object' && OWNER_FIELDS.some((field) => isPrivateUser(item[field]));

const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
const recordings = Object.fromEntries(files.map((name) => [name, JSON.parse(readFileSync(join(dir, name), 'utf8'))]));

// 1. Collect the private users' record ids, emails and names from every response.
const privateIds = new Set();
const privateText = new Set();
const collect = (value) => {
  if (Array.isArray(value)) return value.forEach(collect);
  if (!value || typeof value !== 'object') return;
  if (ownedByPrivateUser(value)) {
    if (value.id) privateIds.add(value.id);
    for (const field of ['email', 'userEmail', 'fullName', 'name']) if (typeof value[field] === 'string' && value[field].trim().length > 3) privateText.add(value[field].trim());
  }
  Object.values(value).forEach(collect);
};
const parse = (entry) => { try { return entry.body ? JSON.parse(entry.body) : undefined; } catch { return undefined; } };
for (const recording of Object.values(recordings)) for (const entry of Object.values(recording)) collect(parse(entry));

// 2. Drop their records from every response, and responses about their records.
const scrub = (value) => {
  if (Array.isArray(value)) return value.filter((item) => !ownedByPrivateUser(item)).map(scrub);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, scrub(inner)]));
};
let removedResponses = 0;
for (const [name, recording] of Object.entries(recordings)) {
  for (const [key, entry] of Object.entries(recording)) {
    const body = parse(entry);
    if ([...privateIds].some((id) => key.includes(id)) || ownedByPrivateUser(body)) { delete recording[key]; removedResponses += 1; continue; }
    if (body !== undefined) entry.body = JSON.stringify(scrub(body));
  }
  writeFileSync(join(dir, name), JSON.stringify(recording, null, 1));
}

// 3. Verify nothing of theirs is left anywhere.
const leftovers = [];
for (const [name, recording] of Object.entries(recordings)) {
  const text = JSON.stringify(recording);
  for (const value of [...privateText, ...privateIds]) if (text.includes(value)) leftovers.push(`${name}: ${value.slice(0, 3)}…`);
}
console.log(`Private users' records: ${privateIds.size}; responses removed: ${removedResponses}; files: ${files.length}`);
if (leftovers.length) { console.error(`Personal data still present:\n  ${leftovers.join('\n  ')}`); process.exit(1); }
console.log('No personal data from self-registered users remains.');
