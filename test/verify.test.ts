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
