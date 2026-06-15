/**
 * anci-oiv-resolver · v0.6.0 domain_status stratum tests
 *
 * The v0.6.0 slice adds a STATIC per-entry DNS-resolvability classification
 * (domain_status: resolving | phantom | defunct | unverified) baked into all
 * 987 RUT rows of data/known-domains.json from an honest, null-route-filtered
 * public-resolver re-verification (Cloudflare → Google → Quad9, OS/NextDNS leg
 * skipped). These tests are PURELY ADDITIVE and must coexist with the frozen
 * v0.5.2 contract (dns_verified, verification_status, verified_at, confidence
 * 1.0/0.85, dnsVerified+dnsUnverified===total, count>=985).
 *
 * Run deterministically with: npm run test:no-dns (SKIP_LIVE_DNS=1)
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveOIVDomain,
  resolveBatch,
  resolveBytable,
  getAllEntries,
  getCoverageStats,
} from '../src/index.js';
import type { DomainStatus } from '../src/index.js';

const DATA_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'known-domains.json',
);

function loadRaw(): Record<string, unknown> {
  return JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as Record<string, unknown>;
}

const VALID_STATUSES: ReadonlyArray<DomainStatus> = [
  'resolving',
  'phantom',
  'defunct',
  'unverified',
];

// ──────────────────────────────────────────────────────────────────────────
// Type alias is exported and usable
// ──────────────────────────────────────────────────────────────────────────

describe('v0.6.0 · DomainStatus type export', () => {
  it('DomainStatus type is importable and its values are the 4-state enum', () => {
    // Compile-time check that the type alias exists + usable at runtime.
    const s: DomainStatus = 'resolving';
    assert.ok(VALID_STATUSES.includes(s));
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Baked data: every catalog entry carries a valid 4-value domain_status
// ──────────────────────────────────────────────────────────────────────────

describe('v0.6.0 · baked domain_status on every catalog entry', () => {
  it('every RUT entry has a domain_status from the 4-value enum', () => {
    const raw = loadRaw();
    const bad: string[] = [];
    let count = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; domain_status?: unknown };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      count++;
      if (
        typeof e.domain_status !== 'string' ||
        !VALID_STATUSES.includes(e.domain_status as DomainStatus)
      ) {
        bad.push(`${k}=${String(e.domain_status)}`);
      }
    }
    assert.ok(count >= 985, `expected >=985 entries, got ${count}`);
    assert.equal(bad.length, 0, `entries with invalid domain_status: ${bad.slice(0, 10).join(', ')}`);
  });

  it('every RUT entry has a last_validated ISO-8601 day string (alongside verified_at)', () => {
    const raw = loadRaw();
    const bad: string[] = [];
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; last_validated?: unknown; verified_at?: unknown };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      // verified_at must be untouched (frozen)
      assert.equal(typeof e.verified_at, 'string', `verified_at missing on ${k}`);
      if (typeof e.last_validated !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(e.last_validated)) {
        bad.push(`${k}=${String(e.last_validated)}`);
      }
    }
    assert.equal(bad.length, 0, `entries with bad last_validated: ${bad.slice(0, 10).join(', ')}`);
  });

  it('RUT-level domain_status distribution is 830 resolving / 147 phantom / 10 unverified / 0 defunct (corroboration rule applied)', () => {
    // v0.6.0 corroboration fix: hbarrosluco.cl (frozen live, current nxdomain) is a
    // DIVERGENCE and is reclassified phantom→unverified, so phantom drops 148→147 and
    // unverified rises 9→10. The 147 remaining phantoms are all corroborated-dead
    // (current nxdomain AND frozen verification_status was already nxdomain).
    const raw = loadRaw();
    const dist: Record<string, number> = { resolving: 0, phantom: 0, defunct: 0, unverified: 0 };
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; domain_status?: string };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (e.domain_status) dist[e.domain_status] = (dist[e.domain_status] ?? 0) + 1;
    }
    assert.equal(dist.resolving, 830, `resolving must be 830, got ${dist.resolving}`);
    assert.equal(dist.phantom, 147, `phantom must be 147, got ${dist.phantom}`);
    assert.equal(dist.unverified, 10, `unverified must be 10, got ${dist.unverified}`);
    assert.equal(dist.defunct, 0, `defunct must be 0 (never auto-assigned in v0.6.0), got ${dist.defunct}`);
  });

  it('recounted _meta.domain_status_distribution EXACTLY matches the actual baked row counts', () => {
    const raw = loadRaw();
    const actual: Record<string, number> = { resolving: 0, phantom: 0, defunct: 0, unverified: 0 };
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; domain_status?: string };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (e.domain_status) actual[e.domain_status] = (actual[e.domain_status] ?? 0) + 1;
    }
    const meta = raw['_meta'] as { domain_status_distribution?: Record<string, number> };
    assert.ok(meta.domain_status_distribution, '_meta.domain_status_distribution must exist');
    const m = meta.domain_status_distribution!;
    assert.equal(m.resolving, actual.resolving, `_meta.resolving=${m.resolving} != actual ${actual.resolving}`);
    assert.equal(m.phantom, actual.phantom, `_meta.phantom=${m.phantom} != actual ${actual.phantom}`);
    assert.equal(m.unverified, actual.unverified, `_meta.unverified=${m.unverified} != actual ${actual.unverified}`);
    assert.equal(m.defunct ?? 0, actual.defunct, `_meta.defunct=${m.defunct} != actual ${actual.defunct}`);
  });

  it('corroboration rule: NO entry with frozen verification_status in {live,mail_only} carries domain_status=phantom (count 0)', () => {
    const raw = loadRaw();
    const offenders: string[] = [];
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as {
        domain?: string;
        domain_status?: string;
        verification_status?: string;
      };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (
        e.domain_status === 'phantom' &&
        (e.verification_status === 'live' || e.verification_status === 'mail_only')
      ) {
        offenders.push(`${k}=${e.domain} (frozen ${e.verification_status})`);
      }
    }
    assert.equal(
      offenders.length,
      0,
      `live/mail_only orgs mislabeled phantom: ${offenders.slice(0, 10).join(', ')}`,
    );
  });

  it('every phantom is corroborated-dead: frozen verification_status was NOT live/mail_only', () => {
    const raw = loadRaw();
    const uncorroborated: string[] = [];
    let phantomCount = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: string; domain_status?: string; verification_status?: string };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (e.domain_status === 'phantom') {
        phantomCount++;
        if (e.verification_status === 'live' || e.verification_status === 'mail_only') {
          uncorroborated.push(`${k}=${e.domain}`);
        }
      }
    }
    assert.ok(phantomCount > 0, 'expected at least one corroborated phantom');
    assert.equal(uncorroborated.length, 0, `uncorroborated phantoms: ${uncorroborated.join(', ')}`);
  });

  it('hbarrosluco.cl (Hospital Barros Luco · frozen live) is NOT phantom — reclassified unverified', () => {
    const raw = loadRaw();
    const e = raw['61606606-4'] as {
      domain?: string;
      domain_status?: string;
      verification_status?: string;
      note?: string;
    };
    assert.ok(e, 'hbarrosluco.cl entry (RUT 61606606-4) must exist');
    assert.equal(e.domain, 'hbarrosluco.cl');
    assert.equal(e.verification_status, 'live', 'frozen verification_status stays live (untouched)');
    assert.notEqual(e.domain_status, 'phantom', 'frozen-live govt/health org must NEVER be phantom');
    // Honest: it is not currently resolving, so divergence → unverified (NOT a false phantom).
    assert.ok(
      e.domain_status === 'unverified' || e.domain_status === 'resolving',
      `hbarrosluco.cl must be unverified (or resolving), got ${e.domain_status}`,
    );
    assert.equal(e.domain_status, 'unverified', 'divergence case → unverified');
    // The divergence note flags a manual catalog review without fabricating a new domain.
    assert.ok(
      typeof e.note === 'string' && /manual catalog review/i.test(e.note),
      `divergence entry must flag manual catalog review, got note=${String(e.note)}`,
    );
    assert.ok(
      /2026-05-26/.test(e.note ?? ''),
      'divergence note should reference the frozen 2026-05-26 run',
    );
    assert.equal(e.domain, 'hbarrosluco.cl', 'must NOT fabricate a new domain');
  });

  it('positive recovery clinicamagallanes.cl (frozen nxdomain → current resolving) stays resolving', () => {
    const raw = loadRaw();
    const e = raw['96567920-0'] as { domain?: string; domain_status?: string };
    assert.ok(e, 'clinicamagallanes.cl entry must exist');
    assert.equal(e.domain, 'clinicamagallanes.cl');
    assert.equal(e.domain_status, 'resolving', 'positive recoveries stay resolving (honest, safe)');
  });

  it('phantom is NEVER assigned to the 9 quarantined inconclusive govt/health domains', () => {
    const raw = loadRaw();
    // Per the gate: these are registered_no_a/ESERVFAIL orgs, several unmistakably live.
    const quarantineDomains = new Set([
      'tesoreria.gob.cl',
      'ssmagallanes.cl',
      'aguaschanar.cl',
      'pacificocable.cl',
      'gasnaturalfenosa.cl',
      'eecolina.cl',
      'intersur.cl',
      'primax.cl',
      'sschiloe.cl',
    ]);
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: string; domain_status?: string };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (quarantineDomains.has(e.domain.toLowerCase())) {
        assert.notEqual(
          e.domain_status,
          'phantom',
          `${e.domain} (${k}) is a quarantined live org and must NEVER be phantom`,
        );
        assert.equal(
          e.domain_status,
          'unverified',
          `${e.domain} (${k}) must be unverified, got ${e.domain_status}`,
        );
      }
    }
  });

  it('_meta carries domain_status_distribution counts matching the baked rows', () => {
    const raw = loadRaw();
    const meta = raw['_meta'] as { domain_status_distribution?: Record<string, number> };
    assert.ok(meta.domain_status_distribution, '_meta.domain_status_distribution must exist');
    assert.equal(meta.domain_status_distribution!.resolving, 830);
    assert.equal(meta.domain_status_distribution!.phantom, 147);
    assert.equal(meta.domain_status_distribution!.unverified, 10);
    assert.equal(meta.domain_status_distribution!.defunct ?? 0, 0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Backwards-compat: the frozen v0.5.2 fields are untouched
// ──────────────────────────────────────────────────────────────────────────

describe('v0.6.0 · frozen v0.5.2 fields untouched (backward-compat)', () => {
  it('verification_status distribution is exactly the frozen 2026-05-26 snapshot', () => {
    const raw = loadRaw();
    const dist: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; verification_status?: string };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (e.verification_status) dist[e.verification_status] = (dist[e.verification_status] ?? 0) + 1;
    }
    assert.equal(dist['live'], 794);
    assert.equal(dist['mail_only'], 30);
    assert.equal(dist['nxdomain'], 148);
    assert.equal(dist['registered_no_a'], 6);
    assert.equal(dist['serverr'], 5);
    assert.equal(dist['timeout'], 4);
  });

  it('dns_verified=true count is still 824 (orthogonal to domain_status)', () => {
    const raw = loadRaw();
    let dnsv = 0;
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; dns_verified?: boolean };
      if (!e || typeof e !== 'object' || typeof e.domain !== 'string') continue;
      if (e.dns_verified) dnsv++;
    }
    assert.equal(dnsv, 824, `dns_verified=true must stay 824, got ${dnsv}`);
  });

  it('bancoestado.cl keeps verification_status=mail_only and confidence 1.0', () => {
    const raw = loadRaw();
    const e = raw['97030000-7'] as { verification_status?: string };
    assert.equal(e.verification_status, 'mail_only');
    const r = resolveBytable('97030000-7');
    assert.equal(r!.confidence, 1.0, 'mail_only stays confidence 1.0 (keyed off dns_verified)');
  });

  it('getCoverageStats invariant intact: dnsVerified + dnsUnverified === total', () => {
    const stats = getCoverageStats();
    assert.equal(stats.dnsVerified + stats.dnsUnverified, stats.total);
    assert.equal(stats.dnsVerified, 824);
    assert.ok(stats.total >= 985);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// domain_status surfaced statically (no verify required)
// ──────────────────────────────────────────────────────────────────────────

describe('v0.6.0 · resolveOIVDomain surfaces domain_status statically', () => {
  it('surfaces domain_status + last_validated WITHOUT verify:true (table-sourced)', async () => {
    const r = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(r.source, 'known-domains');
    assert.ok(r.domain_status, 'domain_status must be surfaced from the static table');
    assert.ok(VALID_STATUSES.includes(r.domain_status!));
    assert.ok(typeof r.last_validated === 'string', 'last_validated must be surfaced');
    // verified stays null when verify not requested (unchanged contract)
    assert.equal(r.verified, null);
  });

  it('bci.cl is resolving (live A-record domain)', async () => {
    const r = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(r.domain_status, 'resolving');
  });

  it('bancoestado.cl is resolving (mail_only → resolving) but confidence stays 1.0', async () => {
    const r = await resolveOIVDomain('97030000-7', 'BANCO DEL ESTADO DE CHILE');
    assert.equal(r.domain_status, 'resolving', 'mail_only maps to resolving in domain_status');
    assert.equal(r.confidence, 1.0, 'confidence unchanged — keyed off dns_verified, not domain_status');
  });

  it('heuristic-sourced resolutions leave domain_status/last_validated undefined', async () => {
    // RUT not in table → heuristic path → no fabricated static claim
    const r = await resolveOIVDomain('99999999-9', 'EMPRESA FICTICIA QUE NO EXISTE SPA');
    assert.equal(r.source, 'heuristic');
    assert.equal(r.domain_status, undefined, 'heuristic must not fabricate a domain_status');
    assert.equal(r.last_validated, undefined, 'heuristic must not fabricate a last_validated');
  });

  it('verify:true still works and preserves the existing verified/status contract', async () => {
    // Deterministic under SKIP_LIVE_DNS — we only assert shape + that the static
    // fields are still surfaced regardless of the live verify result.
    const r = await resolveOIVDomain('97006000-6', 'BCI', { verify: true });
    assert.equal(r.source, 'known-domains');
    assert.ok(VALID_STATUSES.includes(r.domain_status!), 'static domain_status surfaced even with verify:true');
    assert.ok(typeof r.verified === 'boolean', 'verified is boolean when verify:true');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// onlyResolving opt-in filter
// ──────────────────────────────────────────────────────────────────────────

describe('v0.6.0 · ResolveOptions.onlyResolving filter (opt-in, additive)', () => {
  it('default (no options) returns the full table — v0.5.2 behavior unchanged', () => {
    const all = getAllEntries();
    assert.ok(all.length >= 985, `default getAllEntries must return full table, got ${all.length}`);
  });

  it('getAllEntries({ onlyResolving: true }) keeps only domain_status==="resolving"', () => {
    const filtered = getAllEntries({ onlyResolving: true });
    assert.equal(filtered.length, 830, `onlyResolving must yield 830 rows, got ${filtered.length}`);
    for (const e of filtered) {
      assert.equal(e.domain_status, 'resolving', `${e.rut} leaked a non-resolving entry`);
    }
  });

  it('getAllEntries({ onlyResolving: false }) === getAllEntries() (explicit false is a no-op)', () => {
    assert.equal(getAllEntries({ onlyResolving: false }).length, getAllEntries().length);
  });

  it('resolveOIVDomain({ onlyResolving: true }) returns null for a phantom entry', async () => {
    // Pick a baked phantom RUT dynamically so the test is robust to row identity.
    const raw = loadRaw();
    let phantomRut: string | undefined;
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; domain_status?: string; razon_social?: string };
      if (e && typeof e === 'object' && typeof e.domain === 'string' && e.domain_status === 'phantom') {
        phantomRut = k;
        break;
      }
    }
    assert.ok(phantomRut, 'expected at least one phantom entry in the catalog');
    const e = raw[phantomRut] as { razon_social: string };
    const r = await resolveOIVDomain(phantomRut, e.razon_social, { onlyResolving: true });
    assert.equal(r, null, 'onlyResolving:true must drop a phantom table entry to null');
  });

  it('resolveOIVDomain({ onlyResolving: true }) returns the resolution for a resolving entry', async () => {
    const r = await resolveOIVDomain('97006000-6', 'BCI', { onlyResolving: true });
    assert.ok(r, 'resolving entry must survive onlyResolving');
    assert.equal(r!.domain, 'bci.cl');
    assert.equal(r!.domain_status, 'resolving');
  });

  it('resolveBatch({ onlyResolving: true }) omits phantom/unverified entries', async () => {
    const raw = loadRaw();
    let phantomRut: string | undefined;
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const e = v as { domain?: unknown; domain_status?: string };
      if (e && typeof e === 'object' && typeof e.domain === 'string' && e.domain_status === 'phantom') {
        phantomRut = k;
        break;
      }
    }
    const e = raw[phantomRut!] as { razon_social: string };
    const results = await resolveBatch(
      [
        { rut: '97006000-6', razonSocial: 'BCI' }, // resolving
        { rut: phantomRut!, razonSocial: e.razon_social }, // phantom
      ],
      { onlyResolving: true },
    );
    assert.equal(results.length, 1, 'batch must omit the phantom entry');
    assert.equal(results[0]?.domain, 'bci.cl');
  });

  it('resolveBatch() default keeps both entries (v0.5.2 behavior unchanged)', async () => {
    const results = await resolveBatch([
      { rut: '97006000-6', razonSocial: 'BCI' },
      { rut: '99999999-9', razonSocial: 'NO EXISTE SPA' },
    ]);
    assert.equal(results.length, 2);
  });
});
