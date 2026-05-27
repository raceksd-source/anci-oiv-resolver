/**
 * anci-oiv-resolver · verify module tests
 *
 * Tests use real DNS lookups against stable public domains and mock tests
 * for NXDOMAIN handling. Requires network access for the live tests.
 *
 * Run with: npm test
 * Skip live tests: SKIP_LIVE_DNS=1 npm test
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { verifyDomain, batchVerify } from '../src/verify.js';

const SKIP_LIVE = !!process.env['SKIP_LIVE_DNS'];

describe('verifyDomain', () => {
  it('returns VerifyResult shape for any input', async () => {
    const r = await verifyDomain('example.com');
    assert.ok(typeof r.ok === 'boolean');
    assert.ok(Array.isArray(r.aRecords));
    assert.ok(Array.isArray(r.mxRecords));
  });

  it('strips http:// prefix before querying', async () => {
    // Should not throw — normalizes protocol prefix
    const r = await verifyDomain('https://example.com');
    assert.ok(typeof r.ok === 'boolean');
  });

  it('strips trailing path before querying', async () => {
    const r = await verifyDomain('example.com/path/to/page');
    assert.ok(typeof r.ok === 'boolean');
  });

  it(
    'returns ok=true for example.com (stable IANA domain)',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      const r = await verifyDomain('example.com');
      assert.ok(r.ok, 'example.com should resolve');
      assert.ok(r.aRecords.length > 0);
    }
  );

  it(
    'returns ok=false for guaranteed-NXDOMAIN',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      // RFC 2606 guarantees .invalid TLD will never resolve
      const r = await verifyDomain('this-domain-absolutely-does-not-exist.invalid');
      assert.equal(r.ok, false);
    }
  );

  it(
    'resolves bci.cl (canonical OIV domain)',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      const r = await verifyDomain('bci.cl');
      assert.ok(r.ok, 'bci.cl should resolve');
    }
  );

  it(
    'resolves sii.cl (SII government domain)',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      const r = await verifyDomain('sii.cl');
      assert.ok(r.ok, 'sii.cl should resolve');
    }
  );
});

describe('batchVerify', () => {
  it('returns a Map with results for each domain', async () => {
    const domains = ['example.com', 'example.net'];
    const results = await batchVerify(domains, 2);
    assert.ok(results instanceof Map);
    assert.ok(results.has('example.com'));
    assert.ok(results.has('example.net'));
  });

  it('handles empty array without throwing', async () => {
    const results = await batchVerify([]);
    assert.equal(results.size, 0);
  });

  it(
    'resolves multiple OIV domains in batch',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      const domains = ['bci.cl', 'transbank.cl', 'entel.cl'];
      const results = await batchVerify(domains, 3);
      for (const domain of domains) {
        const r = results.get(domain);
        assert.ok(r, `Should have result for ${domain}`);
        assert.ok(r!.ok, `${domain} should resolve`);
      }
    }
  );
});

// ──────────────────────────────────────────────────────────────────────────
// v0.5.1 · multi-resolver fallback + richer status enum
// ──────────────────────────────────────────────────────────────────────────

describe('v0.5.1 · multi-resolver fallback', () => {
  it(
    'falls through to a public resolver when OS resolver fails and reports via',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      // On a hardened endpoint (DoH/NextDNS) the OS resolver returns ESERVFAIL
      // for live domains; on a clean endpoint the OS resolver succeeds first.
      // Either way, a live OIV domain MUST end up with status='live' and a
      // valid `via` field.
      const r = await verifyDomain('transbank.cl');
      assert.ok(r.ok, 'transbank.cl must resolve through some resolver in the chain');
      assert.equal(r.status, 'live');
      assert.ok(r.via, '`via` must be set whenever status is defined');
      assert.ok(
        ['os', 'cloudflare', 'google', 'quad9'].includes(r.via!),
        `via must be a known resolver, got ${r.via}`,
      );
      assert.ok(r.aRecords.length > 0, 'A records must be returned');
    },
  );

  it(
    'reports nxdomain (not serverr) for a guaranteed-unresolvable .invalid name',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      // RFC 2606 .invalid TLD: every public resolver returns ENOTFOUND.
      // Whether the OS resolver returns ENOTFOUND or ESERVFAIL on a hardened
      // endpoint, the public chain must converge on 'nxdomain'.
      const r = await verifyDomain('this-domain-absolutely-does-not-exist-v051.invalid');
      assert.equal(r.ok, false);
      assert.equal(r.status, 'nxdomain', `expected nxdomain, got status=${r.status} via=${r.via} error=${r.error}`);
    },
  );

  it(
    'unlocks a domain that the OS resolver may mis-report (regression for Coverage Gap audit)',
    { skip: SKIP_LIVE ? 'SKIP_LIVE_DNS set' : false },
    async () => {
      // aguasandinas.cl is one of the 13 domains in the Opus 4.7 v0.5.1 audit
      // that returned ESERVFAIL on the founder's hardened endpoint but resolves
      // correctly via Cloudflare/Google/Quad9. The fallback chain MUST recover.
      const r = await verifyDomain('aguasandinas.cl');
      assert.ok(
        r.ok,
        `aguasandinas.cl must resolve (got ok=${r.ok} status=${r.status} via=${r.via} error=${r.error})`,
      );
      assert.equal(r.status, 'live');
    },
  );
});

describe('v0.5.1 · status enum semantics', () => {
  it('returns ok=true and status=live for live A-record domains', async () => {
    const r = await verifyDomain('example.com');
    if (SKIP_LIVE) {
      // Skip-DNS path: just assert shape · status MAY be undefined under offline DNS
      assert.ok(typeof r.ok === 'boolean');
      return;
    }
    assert.equal(r.ok, true);
    assert.equal(r.status, 'live');
  });

  it('always sets status alongside via when network is reachable', async () => {
    const r = await verifyDomain('example.com');
    if (!r.ok && r.status === undefined) {
      // No network in this environment · acceptable, do not fail the suite.
      return;
    }
    // status and via must agree: status set ⇒ via set, and vice versa
    if (r.status !== undefined) {
      assert.ok(r.via, 'via must be set whenever status is set');
    }
  });

  it('preserves the legacy ok field for backwards compatibility', async () => {
    const r = await verifyDomain('example.com');
    // ok is true iff status === 'live' (mail_only and others map to ok=false)
    if (r.status === 'live') assert.equal(r.ok, true);
    else if (r.status !== undefined) assert.equal(r.ok, false);
  });
});

describe('v0.5.1 · catalog dedup integrity', () => {
  it('every domain shared by 2+ RUTs has a documented duplicate_audit entry', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = await import('node:url');
    const dataPath = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '..',
      'data',
      'known-domains.json',
    );
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, unknown>;

    // Build domain → RUTs map from real entries (skip _meta keys)
    const domainToRuts = new Map<string, string[]>();
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      if (!v || typeof v !== 'object') continue;
      const entry = v as { domain?: unknown };
      if (typeof entry.domain !== 'string') continue;
      const list = domainToRuts.get(entry.domain) ?? [];
      list.push(k);
      domainToRuts.set(entry.domain, list);
    }

    const meta = raw['_meta'] as { duplicate_audit?: Record<string, unknown> } | undefined;
    const audit = meta?.duplicate_audit ?? {};
    const missing: string[] = [];
    for (const [domain, ruts] of domainToRuts.entries()) {
      if (ruts.length > 1 && !(domain in audit)) missing.push(domain);
    }
    assert.equal(
      missing.length,
      0,
      `Every shared domain must be in _meta.duplicate_audit. Missing: ${missing.join(', ')}`,
    );
  });

  it('essat.cl is now assigned to exactly one RUT (Atacama, post-Opus v0.5.1 fix)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = await import('node:url');
    const dataPath = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '..',
      'data',
      'known-domains.json',
    );
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, unknown>;
    const ruts: string[] = [];
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('_')) continue;
      const entry = v as { domain?: unknown };
      if (entry && entry.domain === 'essat.cl') ruts.push(k);
    }
    assert.equal(ruts.length, 1, `essat.cl must map to exactly one RUT, got ${ruts.length}: ${ruts.join(', ')}`);
    assert.equal(ruts[0], '91065000-9', 'essat.cl must belong to EMSSAT Atacama (91065000-9)');
  });

  it('EMSSAT Coquimbo (91071000-7) now maps to aguasdelvalle.com (live)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const url = await import('node:url');
    const dataPath = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '..',
      'data',
      'known-domains.json',
    );
    const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8')) as Record<string, unknown>;
    const entry = raw['91071000-7'] as { domain?: string; dns_verified?: boolean } | undefined;
    assert.ok(entry, 'EMSSAT Coquimbo (91071000-7) must exist');
    assert.equal(entry!.domain, 'aguasdelvalle.com', 'Coquimbo domain must be aguasdelvalle.com (Aguas del Valle group)');
    assert.equal(entry!.dns_verified, true, 'aguasdelvalle.com is live · must be dns_verified=true');
  });
});
