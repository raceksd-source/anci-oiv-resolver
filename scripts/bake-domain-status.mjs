// anci-oiv-resolver · v0.6.0 domain_status WRITE-BACK bake tool
//
// Bakes the STATIC per-entry `domain_status` + `last_validated` (+ optional
// `domain_status_via`) into ALL RUT rows of data/known-domains.json.
//
// SOURCE OF RECORD: data/domain-status-reverified.json — the HONEST,
// null-route-filtered, PUBLIC-only multi-resolver re-verification produced by
// scripts/reverify-multiresolver-honest.mjs (Cloudflare → Google → Quad9, the
// OS/NextDNS leg SKIPPED, 0.0.0.0/127.0.0.1/::/::1 sentinels filtered).
//
// WHY NOT the stock OS-first verifyDomain() / scripts/reverify-catalog.mjs:
// the OS leg on this host is the NextDNS profile that null-routes a subset of
// domains to 0.0.0.0 and short-circuits as "live". That is the exact
// contamination that poisoned the apparatus 465/417 split. The stock verifier
// must NEVER be the bake source while NextDNS is on the host.
//
// MAPPING (per the v0.6.0 design / gate recommendation):
//   reverified status 'resolving'  (mr live | mail_only) → domain_status 'resolving'
//   reverified status 'phantom'    (mr nxdomain)         → domain_status 'phantom'
//                                                          BUT see CORROBORATION RULE
//   reverified status 'unverified' (registered_no_a/serverr/timeout/unknown)
//                                                        → domain_status 'unverified'
//   'defunct' is RESERVED / manual-only and NEVER auto-assigned here.
//
// CORROBORATION RULE (v0.6.0 FIX · asymmetric, honest — phantom REQUIRES
// corroboration so a frozen-live govt/health org is NEVER baked phantom):
//   - 'phantom' is assigned ONLY when the honest re-run says nxdomain AND the
//     frozen verification_status was NOT live/mail_only (i.e. it was already
//     nxdomain / never-resolved). A corroborated-dead domain stays phantom.
//   - DIVERGENCE (frozen live/mail_only BUT current nxdomain) → 'unverified'
//     (NOT phantom). This is the org-likely-moved case: honest (it is not
//     currently resolving, so NOT 'resolving') but not a false 'phantom /
//     never-existed' brand. The entry note is extended to flag a manual catalog
//     review; the domain is NEVER fabricated/changed.
//   - Positive recoveries (frozen non-verified → current resolving) stay
//     resolving (honest, safe). Inconclusive (timeout/serverr/...) stay unverified.
//
// The join is domain → RUT, CASE-INSENSITIVE (the reverified keys are
// lowercased; the one casing artifact hospitaldeLota.cl recovers to resolving).
// All matched rows get last_validated = the reverified day note (2026-06-14).
// Any row the bake cannot validate falls back to the row's existing verified_at
// (never silently "now") and is annotated domain_status 'unverified'.
//
// Usage:
//   npm run build && node scripts/bake-domain-status.mjs           # bake from existing reverified file
//   node scripts/bake-domain-status.mjs --reverify                 # re-run the honest verifier first (network)
//   node scripts/bake-domain-status.mjs --dry-run                  # print the diff, do NOT write
//
// This script is idempotent: re-running on an already-baked catalog reproduces
// the same result.

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const CATALOG_PATH = 'data/known-domains.json';
const REVERIFIED_PATH = 'data/domain-status-reverified.json';
const VERIFIER = 'scripts/reverify-multiresolver-honest.mjs';
const VERSION = 'v0.6.0';
const GENERATED = '2026-06-14';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const REVERIFY = args.has('--reverify');

// The valid reverified statuses map 1:1 to domain_status (3 of the 4 enum
// values; 'defunct' is manual-only).
const VALID_STATUS = new Set(['resolving', 'phantom', 'unverified']);
// domain_status_via enum (mirrors VerifyResolver minus 'os'). The reverified
// 'public' sentinel (used for non-resolving consensus failures) is intentionally
// NOT a public resolver of record, so it is omitted from the bake.
const VALID_VIA = new Set(['cloudflare', 'google', 'quad9', 'public-mx']);

function fail(msg) {
  console.error(`✖ bake-domain-status: ${msg}`);
  process.exit(1);
}

// 1. Optionally regenerate the honest reverified file (network, ~5min).
if (REVERIFY) {
  console.log(`Re-running honest verifier (${VERIFIER}) — this hits the public resolver chain…`);
  execFileSync('node', [VERIFIER], { stdio: 'inherit' });
}

if (!fs.existsSync(REVERIFIED_PATH)) {
  fail(
    `source of record ${REVERIFIED_PATH} not found. Run with --reverify (network) to generate it from ${VERIFIER}.`,
  );
}

// 2. Load the honest reverified source of record.
const reverified = JSON.parse(fs.readFileSync(REVERIFIED_PATH, 'utf-8'));
const reDomains = reverified.domains;
if (!reDomains || typeof reDomains !== 'object') {
  fail(`${REVERIFIED_PATH} has no "domains" map`);
}
// Lowercase-keyed lookup for case-insensitive domain join.
const statusByDomain = new Map();
for (const [domain, rec] of Object.entries(reDomains)) {
  statusByDomain.set(domain.toLowerCase(), rec);
}
const reNote = reverified._meta?.checked_at_note ?? '';
// Derive the ISO day from the reverified note (e.g. "reverified-2026-06-14").
const dayMatch = /(\d{4}-\d{2}-\d{2})/.exec(reNote);
const LAST_VALIDATED = dayMatch ? dayMatch[1] : GENERATED;

console.log(
  `Source of record: ${REVERIFIED_PATH} · ${statusByDomain.size} distinct domains · last_validated=${LAST_VALIDATED}`,
);

// 3. Load the catalog and bake every RUT row.
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));

// Frozen verification_status values that mean the domain WAS resolving on
// 2026-05-26. A current-nxdomain row whose frozen status is one of these is a
// DIVERGENCE (org likely moved), NOT a corroborated phantom.
const FROZEN_LIVE = new Set(['live', 'mail_only']);
const DIVERGENCE_NOTE =
  'domain may have changed since 2026-05-26 — manual catalog review (frozen verification_status was live/mail_only but the 2026-06-14 public-resolver re-run NXDOMAINs; classified unverified, NOT phantom)';

const dist = { resolving: 0, phantom: 0, defunct: 0, unverified: 0 };
let matched = 0;
let fallback = 0;
let divergences = 0;
const unmatchedSamples = [];
const divergenceSamples = [];

for (const [rut, value] of Object.entries(catalog)) {
  if (rut.startsWith('_')) continue;
  if (!value || typeof value !== 'object' || typeof value.domain !== 'string') continue;

  const rec = statusByDomain.get(value.domain.toLowerCase());
  let status;
  let via;
  let lastValidated;
  let divergence = false;

  if (rec && VALID_STATUS.has(rec.status)) {
    status = rec.status;
    lastValidated = LAST_VALIDATED;
    if (typeof rec.via === 'string' && VALID_VIA.has(rec.via)) via = rec.via;
    matched++;

    // CORROBORATION RULE: phantom REQUIRES corroboration. If the honest re-run
    // says phantom (nxdomain) but the frozen verification_status was live/mail_only,
    // this is a DIVERGENCE — reclassify to 'unverified' (never a false phantom) and
    // flag the entry for manual catalog review. The domain is NEVER fabricated.
    if (status === 'phantom' && FROZEN_LIVE.has(value.verification_status)) {
      status = 'unverified';
      via = undefined; // the 'public' nxdomain consensus is not a resolving via
      divergence = true;
      divergences++;
      if (divergenceSamples.length < 10) {
        divergenceSamples.push(`${rut}=${value.domain} (frozen ${value.verification_status})`);
      }
    }
  } else {
    // Cannot validate this row from the honest source → quarantine as
    // 'unverified' (NEVER phantom) and fall back to the row's frozen verified_at
    // (never silently "now").
    status = 'unverified';
    lastValidated = typeof value.verified_at === 'string' ? value.verified_at : GENERATED;
    fallback++;
    if (unmatchedSamples.length < 10) unmatchedSamples.push(`${rut}=${value.domain}`);
  }

  value.domain_status = status;
  value.last_validated = lastValidated;
  if (via !== undefined) value.domain_status_via = via;
  else delete value.domain_status_via; // keep idempotent on re-bake

  // Divergence note: add or extend WITHOUT clobbering an existing factual note and
  // WITHOUT fabricating a new domain. Idempotent — never appends the flag twice.
  if (divergence) {
    const existing = typeof value.note === 'string' ? value.note : '';
    if (!existing.includes('manual catalog review')) {
      value.note = existing ? `${existing} · ${DIVERGENCE_NOTE}` : DIVERGENCE_NOTE;
    }
  }

  dist[status]++;
}

const total = dist.resolving + dist.phantom + dist.defunct + dist.unverified;

// Recount the live-govt/health-phantom violations directly from the baked rows
// (the asymmetric corroboration invariant): NO row with a frozen
// verification_status in {live, mail_only} may carry domain_status='phantom'.
let liveGovtHealthPhantomCount = 0;
const phantomViolations = [];
for (const [rut, value] of Object.entries(catalog)) {
  if (rut.startsWith('_')) continue;
  if (!value || typeof value !== 'object' || typeof value.domain !== 'string') continue;
  if (value.domain_status === 'phantom' && FROZEN_LIVE.has(value.verification_status)) {
    liveGovtHealthPhantomCount++;
    if (phantomViolations.length < 10) phantomViolations.push(`${rut}=${value.domain}`);
  }
}

// 4. Update _meta: version bump + generated + domain_status_distribution + method note.
const meta = catalog._meta ?? (catalog._meta = {});
meta.version = VERSION;
meta.generated = GENERATED;
meta.domain_status_distribution = {
  resolving: dist.resolving,
  phantom: dist.phantom,
  defunct: dist.defunct,
  unverified: dist.unverified,
};
meta.domain_status_method =
  'STATIC per-entry DNS-resolvability DERIVED from the live 2026-06-14 ' +
  'null-route-filtered, PUBLIC-only multi-resolver re-run (Cloudflare → Google → Quad9), ' +
  'OS/NextDNS leg SKIPPED, 0.0.0.0/127.0.0.1/::/::1 sentinels filtered ' +
  '(data/domain-status-reverified.json), CROSS-VALIDATED against the frozen 2026-05-26 ' +
  'verification_status run. Mapping: live+mail_only → resolving, ' +
  'registered_no_a/serverr/timeout/unknown → unverified (NEVER phantom). ' +
  'CORROBORATION RULE for nxdomain: baked phantom ONLY if the frozen verification_status was ' +
  'NOT live/mail_only (corroborated-dead); a DIVERGENCE (frozen live/mail_only but current ' +
  'nxdomain — org likely moved) is baked unverified (NEVER phantom) and flagged for manual ' +
  "catalog review. 'defunct' is reserved/manual-only and never auto-assigned in v0.6.0. " +
  'Confidence remains keyed off dns_verified (1.0/0.85), NOT domain_status.';
meta.domain_status_corroboration = {
  rule:
    'phantom REQUIRES corroboration: a live 2026-06-14 NXDOMAIN is baked phantom ONLY when the ' +
    'frozen 2026-05-26 verification_status was NOT live/mail_only. A divergence (frozen ' +
    'live/mail_only but current nxdomain) is baked unverified and flagged for manual review.',
  divergence_count: divergences,
  live_govt_health_phantom_count: liveGovtHealthPhantomCount,
};

console.log('\n=== BAKE RESULT (RUT-level) ===');
console.log(JSON.stringify(dist, null, 2));
console.log(`total rows baked: ${total} · matched from honest source: ${matched} · fallback/unverified: ${fallback}`);
console.log(`divergences reclassified phantom→unverified (frozen live/mail_only, current nxdomain): ${divergences}`);
if (divergenceSamples.length > 0) {
  console.log(`divergence samples: ${divergenceSamples.join(', ')}`);
}
if (unmatchedSamples.length > 0) {
  console.log(`fallback samples: ${unmatchedSamples.join(', ')}`);
}
console.log(`live_govt_health_phantom_count: ${liveGovtHealthPhantomCount}`);

// 5. Guardrails — refuse to write an obviously-wrong bake.
if (total < 985) fail(`baked ${total} rows, expected >= 985 — refusing to write`);
if (dist.defunct !== 0) fail(`defunct must be 0 (manual-only) but got ${dist.defunct} — refusing to write`);
if (liveGovtHealthPhantomCount !== 0) {
  fail(
    `live_govt_health_phantom_count must be 0 (corroboration rule) but got ` +
      `${liveGovtHealthPhantomCount}: ${phantomViolations.join(', ')} — refusing to write`,
  );
}

if (DRY_RUN) {
  console.log('\n--dry-run: catalog NOT written.');
  process.exit(0);
}

// 6. Write back (no trailing newline — matches the existing repo convention).
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
console.log(`\n✔ Wrote domain_status into ${CATALOG_PATH} (${total} rows).`);
console.log(`  _meta.version=${VERSION} · _meta.generated=${GENERATED}`);
