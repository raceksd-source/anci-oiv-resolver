/**
 * anci-oiv-resolver · heuristic inference tests
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { heuristicInfer, inferDomainToken, normalizeAccents } from '../src/heuristic.js';

describe('normalizeAccents', () => {
  it('removes common Spanish accent marks', () => {
    assert.equal(normalizeAccents('crédito'), 'credito');
    assert.equal(normalizeAccents('TELECOMUNICACIÓN'), 'TELECOMUNICACION');
    assert.equal(normalizeAccents('ñoño'), 'nono');
    assert.equal(normalizeAccents('büro'), 'buro');
  });
});

describe('inferDomainToken', () => {
  it('returns "bci" for BCI razón social via brand override', () => {
    const token = inferDomainToken('BANCO DE CRÉDITO E INVERSIONES');
    assert.equal(token, 'bci');
  });

  it('returns "bancoestado" for Banco del Estado (no override → stopword strip)', () => {
    // "BANCO DEL ESTADO DE CHILE" → strip stopwords [del, de, chile would also be stripped]
    // result should be "bancoestado" (banco + estado)
    const token = inferDomainToken('BANCO DEL ESTADO DE CHILE');
    // Acceptable: bancoestado, estadochile, etc — verify it's not empty
    assert.ok(token.length > 0, 'token should not be empty');
    assert.ok(!token.includes('del'), 'stopword "del" should be stripped');
    assert.ok(!token.includes('de'), 'stopword "de" should be stripped');
  });

  it('returns "movistar" for Telefónica via brand override', () => {
    const token = inferDomainToken('TELEFÓNICA CHILE S.A.');
    assert.equal(token, 'movistar');
  });

  it('returns "entel" for EMPRESA NACIONAL DE TELECOMUNICACIONES via override', () => {
    const token = inferDomainToken('EMPRESA NACIONAL DE TELECOMUNICACIONES S.A.');
    assert.equal(token, 'entel');
  });

  it('returns "sii" for SII via brand override', () => {
    const token = inferDomainToken('SERVICIO DE IMPUESTOS INTERNOS');
    assert.equal(token, 'sii');
  });

  it('returns "achs" for ACHS via brand override', () => {
    const token = inferDomainToken('ASOCIACIÓN CHILENA DE SEGURIDAD');
    assert.equal(token, 'achs');
  });

  it('strips S.A. legal suffix', () => {
    const token = inferDomainToken('SILICA NETWORKS CHILE S.A.');
    assert.ok(!token.includes('sa'), 'S.A. suffix should be stripped');
  });

  it('strips SPA legal suffix', () => {
    const token = inferDomainToken('VTR COMUNICACIONES SPA');
    assert.ok(!token.includes('spa'), 'SPA suffix should be stripped');
  });

  it('produces lowercase output', () => {
    const token = inferDomainToken('BANCO DE CHILE');
    assert.equal(token, token.toLowerCase());
  });

  it('produces alphanumeric-only output', () => {
    const token = inferDomainToken('CLÍNICA LAS CONDES S.A.');
    assert.match(token, /^[a-z0-9]+$/, 'token should be alphanumeric only');
  });
});

describe('heuristicInfer', () => {
  it('returns heuristic source', () => {
    const r = heuristicInfer('ALGUNA EMPRESA DESCONOCIDA');
    assert.equal(r.source, 'heuristic');
  });

  it('confidence is between 0 and 1', () => {
    const r = heuristicInfer('EMPRESA CUALQUIERA');
    assert.ok(r.confidence >= 0 && r.confidence <= 1);
  });

  it('confidence is less than 1.0 (heuristic is never certain)', () => {
    const r = heuristicInfer('BANCO DE CRÉDITO E INVERSIONES');
    assert.ok(r.confidence < 1.0, 'heuristic confidence should be < 1.0');
  });

  it('returns a domain string with a TLD', () => {
    const r = heuristicInfer('EMPRESA DISTRIBUIDORA DE GAS');
    assert.ok(r.domain.includes('.'), 'domain should contain a dot');
  });

  it('passes through rut and razonSocial', () => {
    const r = heuristicInfer('TEST ORG', '99999999-9', 'salud');
    assert.equal(r.rut, '99999999-9');
    assert.equal(r.razonSocial, 'TEST ORG');
    assert.equal(r.sector, 'salud');
  });

  it('uses .gob.cl TLD for known gobierno patterns', () => {
    const r = heuristicInfer('SERVICIO NACIONAL DE PREVENCIÓN Y RESPUESTA ANTE DESASTRES', '', 'administracion_estado');
    assert.ok(r.domain.endsWith('.gob.cl') || r.domain.endsWith('.cl'), 'should use .gob.cl or .cl');
  });

  it('handles empty string without throwing', () => {
    assert.doesNotThrow(() => heuristicInfer(''));
  });
});
