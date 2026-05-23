/**
 * anci-oiv-resolver · known-domains table tests
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveBytable, normalizeRut, getCoverageStats, hasEntry } from '../src/known-domains.js';

describe('normalizeRut', () => {
  it('strips dots and uppercases verifier digit', () => {
    assert.equal(normalizeRut('97.006.000-6'), '97006000-6');
    assert.equal(normalizeRut('97006000-k'), '97006000-K');
    assert.equal(normalizeRut(' 96689310-9 '), '96689310-9');
  });

  it('is idempotent for already-normalized RUTs', () => {
    assert.equal(normalizeRut('97006000-6'), '97006000-6');
  });
});

describe('resolveBytable', () => {
  it('resolves BCI correctly (verifies BCI false-positive fix)', () => {
    const r = resolveBytable('97006000-6');
    assert.ok(r, 'BCI should be in table');
    assert.equal(r!.domain, 'bci.cl', 'BCI canonical domain must be bci.cl, NOT bancodecrditoeinversiones.cl');
    assert.equal(r!.source, 'known-domains');
    assert.equal(r!.confidence, 1.0);
    assert.equal(r!.razonSocial, 'BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(r!.sector, 'banca_finanzas');
  });

  it('resolves Banco Chile correctly', () => {
    const r = resolveBytable('97004000-5');
    assert.ok(r);
    assert.equal(r!.domain, 'bancochile.cl');
    assert.equal(r!.sector, 'banca_finanzas');
  });

  it('resolves Banco BICE correctly (NOT bancobice.cl)', () => {
    const r = resolveBytable('97080000-K');
    assert.ok(r, 'BICE should be in table');
    assert.equal(r!.domain, 'bice.cl', 'BICE canonical domain must be bice.cl, NOT bancobice.cl');
    assert.equal(r!.confidence, 1.0);
  });

  it('resolves Banco del Estado (note: .cl NXDOMAIN, confidence lower)', () => {
    const r = resolveBytable('97030000-7');
    assert.ok(r);
    assert.equal(r!.domain, 'bancoestado.cl');
    // dns_verified=false → confidence 0.85
    assert.equal(r!.confidence, 0.85);
  });

  it('resolves ANCI (government cyber agency)', () => {
    const r = resolveBytable('62000560-6');
    assert.ok(r);
    assert.equal(r!.domain, 'anci.gob.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves Transbank', () => {
    const r = resolveBytable('96689310-9');
    assert.ok(r);
    assert.equal(r!.domain, 'transbank.cl');
    assert.equal(r!.sector, 'banca_finanzas');
  });

  it('resolves Metro de Santiago (empresas_estado)', () => {
    const r = resolveBytable('61219000-3');
    assert.ok(r);
    assert.equal(r!.domain, 'metro.cl');
    assert.equal(r!.sector, 'empresas_estado');
  });

  it('resolves dotted-RUT format (97.006.000-6)', () => {
    const r = resolveBytable('97.006.000-6');
    assert.ok(r);
    assert.equal(r!.domain, 'bci.cl');
  });

  it('resolves lowercase K verifier (97080000-k)', () => {
    const r = resolveBytable('97080000-k');
    assert.ok(r);
    assert.equal(r!.domain, 'bice.cl');
  });

  it('returns null for unknown RUT', () => {
    const r = resolveBytable('99999999-9');
    assert.equal(r, null);
  });

  it('returns null for empty string', () => {
    const r = resolveBytable('');
    assert.equal(r, null);
  });
});

describe('hasEntry', () => {
  it('returns true for known RUT', () => {
    assert.ok(hasEntry('97006000-6'));
  });
  it('returns false for unknown RUT', () => {
    assert.equal(hasEntry('00000000-0'), false);
  });
});

describe('getCoverageStats', () => {
  it('returns positive total entry count', () => {
    const stats = getCoverageStats();
    assert.ok(stats.total >= 77, `Expected ≥77 entries, got ${stats.total}`);
  });

  it('includes all expected sectors', () => {
    const stats = getCoverageStats();
    const sectors = Object.keys(stats.bySector);
    assert.ok(sectors.includes('banca_finanzas'));
    assert.ok(sectors.includes('telecomunicaciones'));
    assert.ok(sectors.includes('administracion_estado'));
    assert.ok(sectors.includes('salud'));
    assert.ok(sectors.includes('empresas_estado'));
  });

  it('has banca_finanzas coverage ≥ 20 entries', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['banca_finanzas'].count >= 20,
      `banca_finanzas coverage too low: ${stats.bySector['banca_finanzas'].count}`
    );
  });

  it('has telecomunicaciones coverage ≥ 15 entries', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['telecomunicaciones'].count >= 15,
      `telecom coverage too low: ${stats.bySector['telecomunicaciones'].count}`
    );
  });

  it('dnsVerified + dnsUnverified sums to total', () => {
    const stats = getCoverageStats();
    assert.equal(stats.dnsVerified + stats.dnsUnverified, stats.total);
  });
});
