/**
 * anci-oiv-resolver · public API surface tests
 *
 * Imports exclusively from src/index.ts (the package entry point) to catch
 * any exports missing from the public API that are nonetheless available in
 * internal modules (hasEntry was one such gap discovered in audit v0.5.2).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveOIVDomain,
  resolveBatch,
  resolveBytable,
  heuristicInfer,
  verifyDomain,
  batchVerify,
  getCoverageStats,
  getAllEntries,
  normalizeRut,
  hasEntry,                 // audit v0.5.2: was missing from public API
  assertDatasetIntegrity,
  normalizeAccents,
  inferDomainToken,
} from '../src/index.js';

describe('public API surface · all named exports reachable from index', () => {
  it('resolveOIVDomain is callable', async () => {
    const r = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(r.domain, 'bci.cl');
    assert.equal(r.source, 'known-domains');
  });

  it('resolveBatch is callable', async () => {
    const results = await resolveBatch([{ rut: '97006000-6', razonSocial: 'BCI' }]);
    assert.equal(results.length, 1);
    assert.equal(results[0]?.domain, 'bci.cl');
  });

  it('resolveBytable is callable', () => {
    const r = resolveBytable('97006000-6');
    assert.ok(r);
    assert.equal(r!.domain, 'bci.cl');
  });

  it('heuristicInfer is callable', () => {
    const r = heuristicInfer('BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(r.source, 'heuristic');
  });

  it('verifyDomain is callable', async () => {
    const r = await verifyDomain('example.com');
    assert.ok(typeof r.ok === 'boolean');
  });

  it('batchVerify is callable', async () => {
    const m = await batchVerify(['example.com'], 1);
    assert.ok(m instanceof Map);
  });

  it('getCoverageStats is callable', () => {
    const stats = getCoverageStats();
    assert.ok(stats.total > 0);
  });

  it('getAllEntries returns array', () => {
    const entries = getAllEntries();
    assert.ok(Array.isArray(entries));
    assert.ok(entries.length > 900);
  });

  it('normalizeRut strips dots and uppercases', () => {
    assert.equal(normalizeRut('97.006.000-6'), '97006000-6');
  });

  it('hasEntry is reachable from package index (audit v0.5.2 fix)', () => {
    // hasEntry was exported from known-domains.ts but NOT from index.ts before this fix.
    // This test will fail at import if the export is missing.
    assert.ok(hasEntry('97006000-6'), 'BCI RUT should be in table');
    assert.equal(hasEntry('00000000-0'), false);
  });

  it('assertDatasetIntegrity is callable', () => {
    assert.equal(assertDatasetIntegrity().rowCount, getCoverageStats().total);
  });

  it('normalizeAccents is callable', () => {
    assert.equal(normalizeAccents('crédito'), 'credito');
  });

  it('inferDomainToken is callable', () => {
    const t = inferDomainToken('BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(t, 'bci');
  });
});
