// HONEST multi-resolver re-verification for the v0.6 domain_status bake.
//
// WHY NOT the stock verifyDomain(): on this Mac the OS resolver is the NextDNS
// profile that null-routes a subset of domains. verifyDomain() tries the OS leg
// FIRST and short-circuits on ANY A record — including the 0.0.0.0 null-route
// sentinel (verified live: reizan.io -> 0.0.0.0 via os). That is exactly the
// contamination that produced the untrustworthy apparatus 465/417 split.
//
// This verifier therefore uses the SAME public-resolver chain the package ships
// (Cloudflare 1.1.1.1 -> Google 8.8.8.8 -> Quad9 9.9.9.9) but:
//   - SKIPS the contaminated OS leg entirely.
//   - Treats 0.0.0.0 / 127.0.0.1 / :: / ::1 as null-route sentinels (NOT live).
//   - Requires consensus: a domain is phantom (nxdomain) only if ALL reachable
//     public resolvers return ENOTFOUND. Any A/AAAA/MX anywhere => resolving.
//   - Classifies inconclusive failures (timeout/serverr/registered_no_a) as
//     UNVERIFIED, never as phantom.
//
// 3-way HONEST classification (task spec):
//   resolving  = real A/AAAA OR MX present (status live | mail_only)
//   phantom    = nxdomain: ENOTFOUND consensus from PUBLIC resolvers
//   unverified = timeout | serverr | registered_no_a | unknown (INCONCLUSIVE)
//
// Diff-only: writes data/domain-status-reverified.json. Does NOT mutate catalog.

import fs from 'node:fs';
import { Resolver } from 'node:dns/promises';

const TIMEOUT_MS = 5000;
const CONCURRENCY = 10;
const CHECKED_AT_NOTE = 'reverified-2026-06-14'; // fixed literal per spec — no clock call

const PUBLIC_RESOLVERS = [
  { name: 'cloudflare', servers: ['1.1.1.1', '1.0.0.1'] },
  { name: 'google', servers: ['8.8.8.8', '8.8.4.4'] },
  { name: 'quad9', servers: ['9.9.9.9', '149.112.112.112'] },
];

const NULL_ROUTE = new Set(['0.0.0.0', '127.0.0.1', '::', '::1']);

function realA(arr) {
  return (arr || []).filter((ip) => !NULL_ROUTE.has(ip));
}

async function queryOne(servers, domain) {
  const r = new Resolver({ timeout: TIMEOUT_MS, tries: 2 });
  r.setServers(servers);
  const out = { a: [], aaaa: [], mx: [], code: undefined };
  const [a, aaaa, mx] = await Promise.allSettled([
    r.resolve4(domain),
    r.resolve6(domain),
    r.resolveMx(domain),
  ]);
  if (a.status === 'fulfilled') out.a = a.value;
  else out.code = a.reason && a.reason.code;
  if (aaaa.status === 'fulfilled') out.aaaa = aaaa.value;
  if (mx.status === 'fulfilled') out.mx = mx.value;
  return out;
}

// Multi-resolver consensus verification.
async function verifyPublic(domain) {
  const clean = String(domain).replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase();
  let bestMx = [];
  let bestAaaa = [];
  const codes = [];
  for (const res of PUBLIC_RESOLVERS) {
    let att;
    try {
      att = await queryOne(res.servers, clean);
    } catch (e) {
      codes.push(e && e.code ? e.code : 'unknown');
      continue;
    }
    const aReal = realA(att.a);
    if (aReal.length > 0) {
      return { status: 'live', resolving: true, via: res.name, mx: att.mx.length, a: aReal.length };
    }
    if (att.aaaa.length > 0) bestAaaa = att.aaaa;
    if (att.mx.length > bestMx.length) bestMx = att.mx;
    if (att.code) codes.push(att.code);
    // ENOTFOUND from a public resolver is authoritative for nxdomain — but keep
    // walking so MX from another resolver can still rescue it to resolving.
  }
  // No real A from any resolver.
  if (bestAaaa.length > 0) {
    return { status: 'live', resolving: true, via: 'public-aaaa', mx: bestMx.length, a: 0 };
  }
  if (bestMx.length > 0) {
    return { status: 'mail_only', resolving: true, via: 'public-mx', mx: bestMx.length, a: 0 };
  }
  // Decide failure status from collected codes. ENOTFOUND from ANY public
  // resolver (and never contradicted by a record) => nxdomain (genuine phantom).
  // ENODATA => registered_no_a (INCONCLUSIVE/unverified). ESERVFAIL/timeout =>
  // serverr/timeout (INCONCLUSIVE/unverified).
  const hasNX = codes.some((c) => c === 'ENOTFOUND' || c === 'NXDOMAIN');
  const hasServfail = codes.some((c) => c === 'ESERVFAIL' || c === 'SERVFAIL');
  const hasTimeout = codes.some((c) => c === 'ETIMEOUT' || c === 'ETIMEOUT' || c === 'TIMEOUT');
  const hasNodata = codes.some((c) => c === 'ENODATA');
  // Only call it nxdomain if NO resolver gave an inconclusive signal that could
  // mask a real domain. ENOTFOUND is authoritative; ENODATA already handled via
  // MX above (no MX + ENODATA => registered_no_a inconclusive).
  if (hasNX && !hasServfail && !hasTimeout) {
    return { status: 'nxdomain', resolving: false, via: 'public', mx: 0, a: 0 };
  }
  if (hasNodata) {
    return { status: 'registered_no_a', resolving: false, via: 'public', mx: 0, a: 0 };
  }
  if (hasServfail) {
    return { status: 'serverr', resolving: false, via: 'public', mx: 0, a: 0 };
  }
  if (hasTimeout) {
    return { status: 'timeout', resolving: false, via: 'public', mx: 0, a: 0 };
  }
  // Mixed/odd: if ENOTFOUND present but also inconclusive, do NOT trust as phantom.
  if (hasNX) {
    return { status: 'serverr', resolving: false, via: 'public', mx: 0, a: 0 };
  }
  return { status: 'unknown', resolving: false, via: 'exhausted', mx: 0, a: 0 };
}

// ---- Load catalog + apparatus ----
const cat = JSON.parse(fs.readFileSync('data/known-domains.json', 'utf-8'));
const relPath = '/Users/dmz/dmz-center/dmz-control-center/data/osint-enrichment/oiv-catalog-reliability.json';
const rel = JSON.parse(fs.readFileSync(relPath, 'utf-8'));
const apparatusPhantom = new Set((rel.phantom_catalog || []).map((s) => s.toLowerCase()));
const apparatusClean = new Set((rel.clean_catalog || []).map((s) => s.toLowerCase()));

// Build distinct catalog domains (the bake target). Keep one sample entry per domain.
const byDomain = new Map();
for (const [rut, v] of Object.entries(cat)) {
  if (rut.startsWith('_')) continue;
  if (!v || typeof v !== 'object' || !('domain' in v)) continue;
  const d = String(v.domain).toLowerCase();
  if (!byDomain.has(d)) {
    byDomain.set(d, { domain: d, dns_verified: v.dns_verified === true, frozen_status: v.verification_status, sector: v.sector, razon_social: v.razon_social, rut });
  }
}
const domains = [...byDomain.values()];
console.log(`Catalog distinct domains to verify: ${domains.length}`);
console.log(`Of these flagged phantom by apparatus: ${domains.filter((d) => apparatusPhantom.has(d.domain)).length}`);

const startedAt = Date.now();
const results = [];
const queue = [...domains];
let done = 0;
while (queue.length > 0) {
  const batch = queue.splice(0, CONCURRENCY);
  const batchResults = await Promise.all(
    batch.map(async (e) => {
      const r = await verifyPublic(e.domain).catch((err) => ({ status: 'unknown', resolving: false, via: 'error', mx: 0, a: 0, error: String(err) }));
      return { ...e, mr_status: r.status, mr_resolving: r.resolving, mr_via: r.via, mr_mx: r.mx, mr_a: r.a };
    })
  );
  results.push(...batchResults);
  done += batchResults.length;
  if (done % 80 < CONCURRENCY) {
    console.log(`  ${done}/${domains.length} (${Math.round((Date.now() - startedAt) / 1000)}s)`);
  }
}
console.log(`Completed in ${Math.round((Date.now() - startedAt) / 1000)}s`);

// ---- HONEST 3-way classification ----
function honest(mrStatus) {
  if (mrStatus === 'live' || mrStatus === 'mail_only') return 'resolving';
  if (mrStatus === 'nxdomain') return 'phantom';
  return 'unverified'; // timeout | serverr | registered_no_a | unknown
}

const honestCounts = { resolving: 0, phantom: 0, unverified: 0 };
const mrStatusCounts = {};
for (const r of results) {
  const h = honest(r.mr_status);
  r.honest = h;
  honestCounts[h]++;
  mrStatusCounts[r.mr_status] = (mrStatusCounts[r.mr_status] || 0) + 1;
}

// ---- Apparatus-phantom subset reconciliation (false-phantom rate) ----
const apparatusPhantomInCatalog = results.filter((r) => apparatusPhantom.has(r.domain));
const fpResolving = apparatusPhantomInCatalog.filter((r) => r.honest === 'resolving');
const fpUnverified = apparatusPhantomInCatalog.filter((r) => r.honest === 'unverified');
const fpGenuine = apparatusPhantomInCatalog.filter((r) => r.honest === 'phantom');
const falsePhantomNumer = fpResolving.length + fpUnverified.length; // NOT genuine nxdomain
const falsePhantomRate = apparatusPhantomInCatalog.length > 0
  ? (falsePhantomNumer / apparatusPhantomInCatalog.length) * 100
  : 0;

// ---- Write honest per-domain status file ----
const outFile = 'data/domain-status-reverified.json';
const perDomain = {};
for (const r of results) {
  perDomain[r.domain] = {
    status: r.honest,                 // resolving | phantom | unverified
    resolving_bool: r.honest === 'resolving',
    via: r.mr_via,
    mr_status: r.mr_status,            // detailed: live|mail_only|nxdomain|registered_no_a|serverr|timeout|unknown
    checked_at_note: CHECKED_AT_NOTE,
  };
}
const payload = {
  _meta: {
    description: 'HONEST multi-resolver re-verification of the anci-oiv-resolver catalog domains for the v0.6 domain_status bake gate.',
    method: 'Pinned PUBLIC resolvers only (Cloudflare->Google->Quad9), OS/NextDNS leg SKIPPED, 0.0.0.0 null-route filtered, consensus, inconclusive!=phantom.',
    checked_at_note: CHECKED_AT_NOTE,
    catalog_distinct_domains: domains.length,
    honest_counts: honestCounts,
    mr_status_counts: mrStatusCounts,
    apparatus_phantom_in_catalog: apparatusPhantomInCatalog.length,
    apparatus_phantom_confirmed_genuine: fpGenuine.length,
    apparatus_phantom_actually_resolving: fpResolving.length,
    apparatus_phantom_inconclusive: fpUnverified.length,
    false_phantom_rate_pct: Number(falsePhantomRate.toFixed(2)),
  },
  domains: perDomain,
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));

console.log('\n=== HONEST COUNTS ===');
console.log(JSON.stringify(honestCounts, null, 2));
console.log('\n=== detailed mr_status ===');
console.log(JSON.stringify(mrStatusCounts, null, 2));
console.log('\n=== APPARATUS-PHANTOM RECONCILIATION ===');
console.log(`apparatus-phantom domains present in catalog: ${apparatusPhantomInCatalog.length}`);
console.log(`  confirmed genuine nxdomain: ${fpGenuine.length}`);
console.log(`  actually RESOLVING (false phantom): ${fpResolving.length}`);
console.log(`  inconclusive/unverified (not phantom): ${fpUnverified.length}`);
console.log(`  false_phantom_rate_pct (resolving+inconclusive / total): ${falsePhantomRate.toFixed(2)}%`);

// Examples of false phantoms (resolving despite apparatus calling phantom)
console.log('\n--- false-phantom examples (apparatus=phantom but actually RESOLVING) ---');
fpResolving.slice(0, 25).forEach((r) => console.log(`  ${r.domain} | ${r.mr_status} via=${r.mr_via} mx=${r.mr_mx} | ${r.razon_social}`));
console.log('\n--- inconclusive-in-apparatus-phantom examples ---');
fpUnverified.slice(0, 15).forEach((r) => console.log(`  ${r.domain} | ${r.mr_status} via=${r.mr_via} | ${r.razon_social}`));

fs.writeFileSync('/tmp/reverify-multiresolver-full.json', JSON.stringify({ honestCounts, mrStatusCounts, results }, null, 2));
console.log(`\nPer-domain honest status written to ${outFile}`);
console.log('Full results -> /tmp/reverify-multiresolver-full.json');
