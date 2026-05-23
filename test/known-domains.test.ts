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
    assert.ok(stats.total >= 154, `Expected ≥154 entries, got ${stats.total}`);
  });

  it('includes all expected sectors including new transporte and agua', () => {
    const stats = getCoverageStats();
    const sectors = Object.keys(stats.bySector);
    assert.ok(sectors.includes('banca_finanzas'));
    assert.ok(sectors.includes('telecomunicaciones'));
    assert.ok(sectors.includes('administracion_estado'));
    assert.ok(sectors.includes('salud'));
    assert.ok(sectors.includes('empresas_estado'));
    assert.ok(sectors.includes('transporte'), 'transporte sector must be activated');
    assert.ok(sectors.includes('agua'), 'agua sector must be activated');
  });

  it('has banca_finanzas coverage = 34 entries (100% sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['banca_finanzas'].count >= 34,
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

  it('has transporte coverage ≥ 10 entries (new sector Block D)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['transporte'].count >= 10,
      `transporte coverage too low: ${stats.bySector['transporte']?.count ?? 0}`
    );
  });

  it('has agua coverage ≥ 8 entries (new sector Block D)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['agua'].count >= 8,
      `agua coverage too low: ${stats.bySector['agua']?.count ?? 0}`
    );
  });

  it('has administracion_estado coverage ≥ 40 entries', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['administracion_estado'].count >= 40,
      `admin_estado coverage too low: ${stats.bySector['administracion_estado'].count}`
    );
  });

  it('has salud coverage ≥ 30 entries', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['salud'].count >= 30,
      `salud coverage too low: ${stats.bySector['salud'].count}`
    );
  });
});

describe('Block D expansion spot-checks', () => {
  it('resolves LATAM Airlines (new transporte entry)', () => {
    const r = resolveBytable('81869200-K');
    assert.ok(r, 'LATAM Airlines should be in table');
    assert.equal(r!.domain, 'latamairlines.com');
    assert.equal(r!.sector, 'transporte');
  });

  it('resolves Puerto Valparaíso (new transporte entry)', () => {
    const r = resolveBytable('70064400-6');
    assert.ok(r, 'Empresa Portuaria Valparaíso should be in table');
    assert.equal(r!.domain, 'puertovalparaiso.cl');
    assert.equal(r!.sector, 'transporte');
  });

  it('resolves Autopista Central (new transporte entry)', () => {
    const r = resolveBytable('96579780-9');
    assert.ok(r, 'Autopista Central should be in table');
    assert.equal(r!.domain, 'autopistacentral.cl');
    assert.equal(r!.sector, 'transporte');
  });

  it('resolves Aguas Andinas (new agua entry)', () => {
    const r = resolveBytable('99013400-3');
    assert.ok(r, 'Aguas Andinas should be in table');
    assert.equal(r!.domain, 'aguasandinas.cl');
    assert.equal(r!.sector, 'agua');
  });

  it('resolves ESSBIO (new agua entry)', () => {
    const r = resolveBytable('91218000-3');
    assert.ok(r, 'ESSBIO should be in table');
    assert.equal(r!.domain, 'essbio.cl');
    assert.equal(r!.sector, 'agua');
  });

  it('resolves BICEVIDA (new banca entry)', () => {
    const r = resolveBytable('96656410-5');
    assert.ok(r, 'BICE Vida should be in table');
    assert.equal(r!.domain, 'bicevida.cl');
    assert.equal(r!.sector, 'banca_finanzas');
  });

  it('resolves Transbank (existing · regression check)', () => {
    const r = resolveBytable('96689310-9');
    assert.ok(r);
    assert.equal(r!.domain, 'transbank.cl');
  });

  it('resolves SERNAC (new admin_estado entry)', () => {
    const r = resolveBytable('60702000-0');
    assert.ok(r, 'SERNAC should be in table');
    assert.equal(r!.domain, 'sernac.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves FNE (new admin_estado entry)', () => {
    const r = resolveBytable('60701001-3');
    assert.ok(r, 'FNE should be in table');
    assert.equal(r!.domain, 'fne.gob.cl');
  });

  it('resolves SERNAGEOMIN (new admin_estado entry)', () => {
    const r = resolveBytable('61702000-9');
    assert.ok(r, 'SERNAGEOMIN should be in table');
    assert.equal(r!.domain, 'sernageomin.cl');
  });

  it('resolves Hospital Barros Luco (new salud entry)', () => {
    const r = resolveBytable('61608101-2');
    assert.ok(r, 'Hospital Barros Luco should be in table');
    assert.equal(r!.domain, 'hospitalbarrosluco.cl');
    assert.equal(r!.sector, 'salud');
  });
});
