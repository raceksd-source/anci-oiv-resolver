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
  it('returns positive total entry count ≥ 640 (v0.3.0 bulk expansion)', () => {
    const stats = getCoverageStats();
    assert.ok(stats.total >= 640, `Expected ≥640 entries (v0.3.0), got ${stats.total}`);
  });

  it('includes all expected sectors including combustibles (v0.2.0 NEW)', () => {
    const stats = getCoverageStats();
    const sectors = Object.keys(stats.bySector);
    assert.ok(sectors.includes('banca_finanzas'));
    assert.ok(sectors.includes('telecomunicaciones'));
    assert.ok(sectors.includes('administracion_estado'));
    assert.ok(sectors.includes('salud'));
    assert.ok(sectors.includes('empresas_estado'));
    assert.ok(sectors.includes('transporte'));
    assert.ok(sectors.includes('agua'));
    assert.ok(sectors.includes('combustibles'), 'combustibles sector must be activated (v0.2.0)');
    assert.ok(sectors.includes('energia_electrica'));
    assert.ok(sectors.includes('infraestructura_digital'));
  });

  it('has banca_finanzas coverage = 34 entries (100% sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['banca_finanzas'].count >= 34,
      `banca_finanzas coverage too low: ${stats.bySector['banca_finanzas'].count}`
    );
  });

  it('has telecomunicaciones coverage = 29 entries (100% closed v0.2.0)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['telecomunicaciones'].count >= 29,
      `telecom coverage too low: ${stats.bySector['telecomunicaciones'].count}`
    );
  });

  it('dnsVerified + dnsUnverified sums to total', () => {
    const stats = getCoverageStats();
    assert.equal(stats.dnsVerified + stats.dnsUnverified, stats.total);
  });

  it('has transporte coverage = 25 entries (100% closed v0.2.0)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['transporte'].count >= 25,
      `transporte coverage too low: ${stats.bySector['transporte']?.count ?? 0}`
    );
  });

  it('has agua coverage = 25 entries (100% closed v0.2.0)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['agua'].count >= 25,
      `agua coverage too low: ${stats.bySector['agua']?.count ?? 0}`
    );
  });

  it('has combustibles coverage = 25 entries (100% closed v0.2.0 NEW sector)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['combustibles'] !== undefined,
      'combustibles sector must exist'
    );
    assert.ok(
      stats.bySector['combustibles'].count >= 25,
      `combustibles coverage too low: ${stats.bySector['combustibles']?.count ?? 0}`
    );
  });

  it('has empresas_estado coverage = 20 entries (100% closed v0.2.0)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['empresas_estado'].count >= 20,
      `empresas_estado coverage too low: ${stats.bySector['empresas_estado'].count}`
    );
  });

  it('has administracion_estado coverage ≥ 140 entries (v0.3.0 · ANCI sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['administracion_estado'].count >= 140,
      `admin_estado coverage too low: ${stats.bySector['administracion_estado'].count}`
    );
  });

  it('has salud coverage ≥ 111 entries (v0.3.0 · ANCI sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['salud'].count >= 111,
      `salud coverage too low: ${stats.bySector['salud'].count}`
    );
  });

  it('has energia_electrica coverage ≥ 145 entries (v0.3.0 · ANCI sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['energia_electrica'].count >= 145,
      `energia_electrica coverage too low: ${stats.bySector['energia_electrica'].count}`
    );
  });

  it('has infraestructura_digital ≥ 60 representative entries (v0.3.0 sample)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['infraestructura_digital'].count >= 60,
      `infraestructura_digital coverage too low: ${stats.bySector['infraestructura_digital'].count}`
    );
  });
});

describe('CMF domain fix · v0.1.1 regression guard', () => {
  it('resolves CMF to cmfchile.cl NOT cmf.cl (plastics company false-positive)', () => {
    const r = resolveBytable('60810000-8');
    assert.ok(r, 'CMF should be in table');
    assert.equal(r!.domain, 'cmfchile.cl', 'CMF canonical domain must be cmfchile.cl, NOT cmf.cl (CMF Industrial)');
    assert.equal(r!.sector, 'administracion_estado');
    assert.equal(r!.confidence, 1.0);
    assert.notEqual(r!.domain, 'cmf.cl', 'cmf.cl is CMF Industrial plastics — MUST NOT resolve to this');
  });
});

describe('v0.2.0 combustibles sector spot-checks', () => {
  it('resolves COPEC (combustibles anchor entry)', () => {
    const r = resolveBytable('96548000-K');
    assert.ok(r, 'COPEC should be in table');
    assert.equal(r!.domain, 'copec.cl');
    assert.equal(r!.sector, 'combustibles');
  });

  it('resolves Lipigas (combustibles)', () => {
    const r = resolveBytable('93248000-3');
    assert.ok(r, 'Lipigas should be in table');
    assert.equal(r!.domain, 'lipigas.cl');
    assert.equal(r!.sector, 'combustibles');
  });

  it('resolves Shell Chile (combustibles)', () => {
    const r = resolveBytable('89978800-1');
    assert.ok(r, 'Shell Chile should be in table');
    assert.equal(r!.domain, 'shellchile.cl');
    assert.equal(r!.sector, 'combustibles');
  });

  it('resolves SONACOL (combustibles)', () => {
    const r = resolveBytable('92704000-9');
    assert.ok(r, 'SONACOL should be in table');
    assert.equal(r!.domain, 'sonacol.cl');
    assert.equal(r!.sector, 'combustibles');
  });

  it('resolves Metrogas (combustibles)', () => {
    const r = resolveBytable('96720800-9');
    assert.ok(r, 'Metrogas should be in table');
    assert.equal(r!.domain, 'metrogas.cl');
    assert.equal(r!.sector, 'combustibles');
  });
});

describe('v0.2.0 energia electrica expansion spot-checks', () => {
  it('resolves ENEL Distribución Chile (new entry)', () => {
    const r = resolveBytable('96800570-7');
    assert.ok(r, 'ENEL Distribución should be in table');
    assert.equal(r!.domain, 'eneldistribucion.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves Transelec (new entry · uses .com)', () => {
    const r = resolveBytable('76555400-4');
    assert.ok(r, 'Transelec should be in table');
    assert.equal(r!.domain, 'transelec.com');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves Coordinador Eléctrico Nacional (new entry)', () => {
    const r = resolveBytable('65092388-K');
    assert.ok(r, 'CEN should be in table');
    assert.equal(r!.domain, 'coordinadorelectrico.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });
});

describe('v0.2.0 infraestructura digital spot-checks', () => {
  it('resolves SONDA (major IT vendor)', () => {
    const r = resolveBytable('83628100-4');
    assert.ok(r, 'SONDA should be in table');
    assert.equal(r!.domain, 'sonda.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Microsoft Chile (infra digital)', () => {
    const r = resolveBytable('96633760-5');
    assert.ok(r, 'Microsoft Chile should be in table');
    assert.equal(r!.domain, 'microsoft.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves IBM Chile (infra digital)', () => {
    const r = resolveBytable('92040000-0');
    assert.ok(r, 'IBM Chile should be in table');
    assert.equal(r!.domain, 'ibm.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
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

describe('v0.3.0 salud sector closure spot-checks', () => {
  it('resolves Hospital Clínico San Borja Arriarán (hcsba.cl)', () => {
    const r = resolveBytable('61608604-9');
    assert.ok(r, 'HCSBA should be in table');
    assert.equal(r!.domain, 'hcsba.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves Hospital HUAP (urgencias.cl)', () => {
    const r = resolveBytable('61608602-2');
    assert.ok(r, 'HUAP should be in table');
    assert.equal(r!.domain, 'urgencias.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves Instituto Nacional del Cáncer (inc.cl)', () => {
    const r = resolveBytable('61608404-6');
    assert.ok(r, 'INC should be in table');
    assert.equal(r!.domain, 'inc.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves Instituto de Neurocirugía Asenjo (asenjo.cl)', () => {
    const r = resolveBytable('61608407-0');
    assert.ok(r, 'Asenjo should be in table');
    assert.equal(r!.domain, 'asenjo.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves Hospital de San Fernando (hospitalsanfernando.cl)', () => {
    const r = resolveBytable('61602145-1');
    assert.ok(r, 'H. San Fernando should be in table');
    assert.equal(r!.domain, 'hospitalsanfernando.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves Hospital El Pino (hospitalelpino.cl)', () => {
    const r = resolveBytable('61608107-1');
    assert.ok(r, 'H. El Pino should be in table');
    assert.equal(r!.domain, 'hospitalelpino.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('resolves IMARED Puerto Montt (imared.cl)', () => {
    const r = resolveBytable('77333081-6');
    assert.ok(r, 'IMARED should be in table');
    assert.equal(r!.domain, 'imared.cl');
    assert.equal(r!.sector, 'salud');
  });

  it('salud sector has ≥111 entries (100% ANCI sector mapped)', () => {
    const stats = getCoverageStats();
    assert.ok(stats.bySector['salud'].count >= 111, `salud must be ≥111 (100% ANCI sector), got ${stats.bySector['salud'].count}`);
  });
});

describe('v0.3.0 administracion_estado closure spot-checks', () => {
  it('resolves Subsecretaría de Energía (minenergia.cl)', () => {
    const r = resolveBytable('61979830-9');
    assert.ok(r, 'Subsec Energía should be in table');
    assert.equal(r!.domain, 'minenergia.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves Subsecretaría SUBTEL (subtel.cl)', () => {
    const r = resolveBytable('60513000-3');
    assert.ok(r, 'SUBTEL should be in table');
    assert.equal(r!.domain, 'subtel.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves SENAME (sename.cl)', () => {
    const r = resolveBytable('61008000-6');
    assert.ok(r, 'SENAME should be in table');
    assert.equal(r!.domain, 'sename.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves Servicio Salud Metropolitano Sur (ssms.cl)', () => {
    const r = resolveBytable('61608100-4');
    assert.ok(r, 'SSMS should be in table');
    assert.equal(r!.domain, 'ssms.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves Defensa Civil (defensacivil.cl)', () => {
    const r = resolveBytable('61109000-5');
    assert.ok(r, 'Defensa Civil should be in table');
    assert.equal(r!.domain, 'defensacivil.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('resolves IGM (igmchile.cl)', () => {
    const r = resolveBytable('81448600-1');
    assert.ok(r, 'IGM should be in table');
    assert.equal(r!.domain, 'igmchile.cl');
    assert.equal(r!.sector, 'administracion_estado');
  });

  it('administracion_estado sector has ≥140 entries (100% ANCI sector mapped)', () => {
    const stats = getCoverageStats();
    assert.ok(stats.bySector['administracion_estado'].count >= 140, `admin_estado must be ≥140, got ${stats.bySector['administracion_estado'].count}`);
  });
});

describe('v0.3.0 energia_electrica closure spot-checks', () => {
  it('resolves Interchile (interchile.cl)', () => {
    const r = resolveBytable('76257379-2');
    assert.ok(r, 'Interchile should be in table');
    assert.equal(r!.domain, 'interchile.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves Cerro Dominador CSP (cerrodominador.cl)', () => {
    const r = resolveBytable('76237256-8');
    assert.ok(r, 'Cerro Dominador should be in table');
    assert.equal(r!.domain, 'cerrodominador.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves Guacolda Energía (guacoldaenergia.cl)', () => {
    const r = resolveBytable('76418918-3');
    assert.ok(r, 'Guacolda should be in table');
    assert.equal(r!.domain, 'guacoldaenergia.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves AELA Generación (aela.cl)', () => {
    const r = resolveBytable('76489426-K');
    assert.ok(r, 'AELA should be in table');
    assert.equal(r!.domain, 'aela.cl');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves ENAP Refinerías (enap.com)', () => {
    const r = resolveBytable('87756500-9');
    assert.ok(r, 'ENAP Refinerías should be in table');
    assert.equal(r!.domain, 'enap.com');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('resolves Mantos Copper (mantoscopper.com)', () => {
    const r = resolveBytable('77418580-1');
    assert.ok(r, 'Mantos Copper should be in table');
    assert.equal(r!.domain, 'mantoscopper.com');
    assert.equal(r!.sector, 'energia_electrica');
  });

  it('energia_electrica sector has ≥145 entries (100% ANCI sector mapped)', () => {
    const stats = getCoverageStats();
    assert.ok(stats.bySector['energia_electrica'].count >= 145, `energia must be ≥145, got ${stats.bySector['energia_electrica'].count}`);
  });
});

describe('v0.3.0 infraestructura_digital expansion spot-checks', () => {
  it('resolves NEC Chile (nec.cl)', () => {
    const r = resolveBytable('96565300-7');
    assert.ok(r, 'NEC Chile should be in table');
    assert.equal(r!.domain, 'nec.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Kyndryl Chile (kyndryl.cl)', () => {
    const r = resolveBytable('77346355-7');
    assert.ok(r, 'Kyndryl should be in table');
    assert.equal(r!.domain, 'kyndryl.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Equinix Chile (equinix.cl)', () => {
    const r = resolveBytable('77532143-1');
    assert.ok(r, 'Equinix Chile should be in table');
    assert.equal(r!.domain, 'equinix.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Flow S.A. payment platform (flow.cl)', () => {
    const r = resolveBytable('76830014-3');
    assert.ok(r, 'Flow should be in table');
    assert.equal(r!.domain, 'flow.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Fintoc (fintoc.cl)', () => {
    const r = resolveBytable('77143385-5');
    assert.ok(r, 'Fintoc should be in table');
    assert.equal(r!.domain, 'fintoc.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves Defontana ERP (defontana.cl)', () => {
    const r = resolveBytable('76389469-K');
    assert.ok(r, 'Defontana should be in table');
    assert.equal(r!.domain, 'defontana.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('infraestructura_digital sample has ≥ 60 entries', () => {
    const stats = getCoverageStats();
    assert.ok(stats.bySector['infraestructura_digital'].count >= 60, `infra_digital must be ≥60 (sample), got ${stats.bySector['infraestructura_digital'].count}`);
  });
});

describe('v0.4.0 infraestructura_digital FULL UNIVERSE spot-checks', () => {
  it('infraestructura_digital sector has ≥ 410 entries (100% sector closed)', () => {
    const stats = getCoverageStats();
    assert.ok(
      stats.bySector['infraestructura_digital'].count >= 410,
      `infra_digital must be ≥410 (full sector), got ${stats.bySector['infraestructura_digital'].count}`
    );
  });

  it('total table has ≥ 990 entries (909 official + migration batch)', () => {
    const stats = getCoverageStats();
    assert.ok(stats.total >= 990, `total entries must be ≥990, got ${stats.total}`);
  });

  it('resolves 2080 Sistemas y Servicios (new infra_digital entry)', () => {
    const r = resolveBytable('76078544-K');
    assert.ok(r, '2080 Sistemas should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ACCUHEALTH CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76054636-4');
    assert.ok(r, 'AccuHealth should be in table');
    assert.equal(r!.domain, 'accuhealth.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ACCENTURE CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('78809770-0');
    assert.ok(r, 'Accenture Chile should be in table');
    assert.equal(r!.domain, 'accenture.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ANTICIPA S.A. (new infra_digital entry)', () => {
    const r = resolveBytable('96771610-3');
    assert.ok(r, 'Anticipa should be in table');
    assert.equal(r!.domain, 'anticipa.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves APIUX TECNOLOGIA (new infra_digital entry)', () => {
    const r = resolveBytable('76516485-0');
    assert.ok(r, 'APIUX should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ADISTEC (new infra_digital entry)', () => {
    const r = resolveBytable('76131974-4');
    assert.ok(r, 'Adistec should be in table');
    assert.equal(r!.domain, 'adistec.com');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves BUK ASISTENCIA (new infra_digital entry)', () => {
    const r = resolveBytable('77402099-3');
    assert.ok(r, 'Buk should be in table');
    assert.equal(r!.domain, 'buk.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves DELOITTE SERVICIOS PROFESIONALES (new infra_digital entry)', () => {
    const r = resolveBytable('77841030-3');
    assert.ok(r, 'Deloitte Chile should be in table');
    assert.equal(r!.domain, 'deloitte.com');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves EVERTEC CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('96805970-K');
    assert.ok(r, 'Evertec should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves GLOBALLOGIC INC. CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76137106-1');
    assert.ok(r, 'GlobalLogic should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves MINSAIT PAYMENTS SYSTEMS CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76265931-K');
    assert.ok(r, 'Minsait should be in table');
    assert.equal(r!.domain, 'minsait.com');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves WHITESTACK CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76666113-0');
    assert.ok(r, 'Whitestack should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves TOKU SPA (new infra_digital entry)', () => {
    const r = resolveBytable('77126383-6');
    assert.ok(r, 'Toku should be in table');
    assert.equal(r!.domain, 'toku.cl');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves KUSHKI CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76693142-1');
    assert.ok(r, 'Kushki should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves NUVEI CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('77005329-3');
    assert.ok(r, 'Nuvei should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves EDGECONNEX CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76789922-K');
    assert.ok(r, 'EdgeConneX Chile should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves SOFTSERVE CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('77486722-8');
    assert.ok(r, 'SoftServe Chile should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ODATA CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('77128355-1');
    assert.ok(r, 'Odata Chile should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves ZEROFOX CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76604972-9');
    assert.ok(r, 'Zerofox should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves STARKCLOUD CHILE (new infra_digital entry)', () => {
    const r = resolveBytable('76275041-4');
    assert.ok(r, 'Starkcloud should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('resolves WIDEFENSE CHILE SPA (second entity · 76363643-7)', () => {
    const r = resolveBytable('76363643-7');
    assert.ok(r, 'Widefense Chile SPA (76363643-7) should be in table');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('unverified entries have _note or false dns_verified (honest status)', () => {
    // Spot check that Lo Espejo Data Center is documented as unverified
    const r = resolveBytable('77460345-K');
    assert.ok(r, 'Lo Espejo Data Center should be in table');
    assert.equal(r!.confidence, 0.85, 'unverified entry must have confidence 0.85');
    assert.equal(r!.sector, 'infraestructura_digital');
  });

  it('getCoverageStats dnsVerified + dnsUnverified still sums to total', () => {
    const stats = getCoverageStats();
    assert.equal(
      stats.dnsVerified + stats.dnsUnverified,
      stats.total,
      'verified + unverified must equal total'
    );
  });
});
