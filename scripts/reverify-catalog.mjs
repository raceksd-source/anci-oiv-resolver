// Full catalog re-verification with v0.5.1 multi-resolver.
// Reads data/known-domains.json, re-runs verifyDomain against every entry,
// produces a before/after diff. Does NOT modify known-domains.json — diff only.
//
// Usage:
//   npm run build
//   node scripts/reverify-catalog.mjs
//
// Output:
//   - stdout: summary + per-entry diff (newly_unlocked, newly_lost, new_mail_only)
//   - /tmp/v051-reverify-results.json: full per-entry results for downstream tooling

import fs from 'node:fs';
import { verifyDomain } from '../dist/verify.js';

const data = JSON.parse(fs.readFileSync('data/known-domains.json', 'utf-8'));

const entries = [];
for (const [rut, v] of Object.entries(data)) {
  if (rut.startsWith('_')) continue;
  if (!v || typeof v !== 'object' || !('domain' in v)) continue;
  entries.push({ rut, domain: v.domain, was_verified: v.dns_verified === true, sector: v.sector, razon_social: v.razon_social });
}

console.log(`Total entries to verify: ${entries.length}`);

const startedAt = Date.now();
const results = [];
const CONCURRENCY = 8;
const queue = [...entries];

while (queue.length > 0) {
  const batch = queue.splice(0, CONCURRENCY);
  const batchResults = await Promise.all(batch.map(async (e) => {
    const r = await verifyDomain(e.domain).catch(err => ({ ok: false, status: 'error', error: String(err), aRecords: [], mxRecords: [] }));
    return { ...e, now_ok: r.ok, now_status: r.status || 'unknown', now_via: r.via, now_mx: r.mxRecords?.length || 0 };
  }));
  results.push(...batchResults);
  if (results.length % 80 === 0) {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`  ${results.length}/${entries.length} (${elapsed}s elapsed)`);
  }
}

const elapsed = Math.round((Date.now() - startedAt) / 1000);
console.log(`Completed in ${elapsed}s`);

// Aggregate
const summary = {
  total: results.length,
  was_verified_count: results.filter(r => r.was_verified).length,
  now_verified_count: results.filter(r => r.now_ok).length,
  now_mail_only_count: results.filter(r => r.now_status === 'mail_only').length,
  now_nxdomain_count: results.filter(r => r.now_status === 'nxdomain').length,
  now_registered_no_a_count: results.filter(r => r.now_status === 'registered_no_a').length,
  now_serverr_count: results.filter(r => r.now_status === 'serverr').length,
  now_timeout_count: results.filter(r => r.now_status === 'timeout').length,
  now_unknown_count: results.filter(r => r.now_status === 'unknown' || r.now_status === 'error').length,
  via_distribution: {},
  status_distribution: {},
};

for (const r of results) {
  const via = r.now_via || 'none';
  summary.via_distribution[via] = (summary.via_distribution[via] || 0) + 1;
  const st = r.now_status || 'none';
  summary.status_distribution[st] = (summary.status_distribution[st] || 0) + 1;
}

// Diffs
const newly_unlocked = results.filter(r => !r.was_verified && r.now_ok);
const newly_lost = results.filter(r => r.was_verified && !r.now_ok);
const new_mail_only = results.filter(r => !r.was_verified && r.now_status === 'mail_only');

console.log('\n=== SUMMARY ===');
console.log(JSON.stringify(summary, null, 2));
console.log(`\nNewly unlocked (was_verified=false → now ok=true): ${newly_unlocked.length}`);
console.log(`Newly lost (was_verified=true → now ok=false): ${newly_lost.length}`);
console.log(`Newly mail_only (was_verified=false → status=mail_only): ${new_mail_only.length}`);

if (newly_unlocked.length > 0) {
  console.log('\n--- Newly unlocked entries ---');
  newly_unlocked.forEach(r => console.log(`  ${r.rut} | ${r.domain} | via=${r.now_via} | ${r.razon_social}`));
}

if (newly_lost.length > 0) {
  console.log('\n--- ⚠️ Newly lost entries (regression candidates) ---');
  newly_lost.forEach(r => console.log(`  ${r.rut} | ${r.domain} | status=${r.now_status} via=${r.now_via} | ${r.razon_social}`));
}

if (new_mail_only.length > 0) {
  console.log('\n--- Newly mail-only entries (Layer-1 unlock per Opus spec) ---');
  new_mail_only.slice(0, 20).forEach(r => console.log(`  ${r.rut} | ${r.domain} | ${r.razon_social}`));
  if (new_mail_only.length > 20) console.log(`  ... and ${new_mail_only.length - 20} more`);
}

// Persist full per-entry results for diffing
fs.writeFileSync('/tmp/v051-reverify-results.json', JSON.stringify({ summary, results, newly_unlocked, newly_lost, new_mail_only }, null, 2));
console.log('\nFull results written to /tmp/v051-reverify-results.json');
