import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeKnownDomainsSha256,
  stableStringify,
} from '../src/integrity.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET_PATH = join(ROOT, 'data', 'known-domains.json');
const MANIFEST_PATH = join(ROOT, 'data', 'MANIFEST.json');
const PACKAGE_PATH = join(ROOT, 'package.json');

function readJsonObject(path: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object at ${path}`);
  }
  return parsed as Record<string, unknown>;
}

function generatedAtFromArgs(): string {
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--generated-at') {
      const next = args[index + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('--generated-at requires an ISO-8601 value');
      }
      return next;
    }
    if (arg?.startsWith('--generated-at=')) {
      return arg.slice('--generated-at='.length);
    }
  }
  const fromEnv = process.env.GENERATED_AT;
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return fromEnv;
  }
  throw new Error('Set GENERATED_AT or pass --generated-at 2026-06-25T00:00:00Z');
}

function assertIsoTimestamp(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw new Error(`generated_at must be UTC ISO-8601 seconds, got ${value}`);
  }
}

const generatedAt = generatedAtFromArgs();
assertIsoTimestamp(generatedAt);

const pkg = readJsonObject(PACKAGE_PATH);
const rawDataset = readJsonObject(DATASET_PATH);
const integrity = computeKnownDomainsSha256(rawDataset);

const manifest = {
  schema: 'SIGNED-DATASET-RELEASE/v1',
  package: {
    name: pkg.name,
    version: pkg.version,
  },
  generated_at: generatedAt,
  dataset_source_files: ['data/known-domains.json'],
  dataset_row_count: integrity.rowCount,
  dataset_canonicalization:
    'non-_meta known-domains rows; include rut field; sort rows by rut; recursively sort object keys; JSON.stringify without whitespace',
  dataset_sha256: integrity.actualSha256,
  dataset_hash: {
    algorithm: 'sha256',
    value: integrity.actualSha256,
  },
  universe_authoritative: 915,
  universe_authoritative_unit: 'legal_designations',
  universe_distinct_ruts: 909,
  distinct_ruts: 909,
  universe_unit_note: '915 designations span 909 distinct RUTs; 6 entities hold multi-sector designations',
  universe_official_source: 'Res. Exenta N°87/2025 · ANCI · 16-dic-2025',
  universe_official_url:
    'https://www.diariooficial.interior.gob.cl/publicaciones/2025/12/17/44326-B/01/2743431.pdf',
  universe_official_stamp: 'Diario Oficial 17-dic-2025 · CVE 2743431 · BCN idNorma 1219600',
  source_resolution: {
    diario_oficial_pdf: {
      url: 'https://www.diariooficial.interior.gob.cl/publicaciones/2025/12/17/44326-B/01/2743431.pdf',
      rows: 648,
      resolution: 'Res. Exenta N°87/2025',
      diario_oficial: '2025-12-17',
      cve: '2743431',
      bcn_idNorma: '1219600',
    },
    anci_gob_cl: {
      url: 'https://www.anci.gob.cl/regulacion/oiv',
      rows: 338,
    },
    subtel_concesionarios: {
      url: 'https://www.subtel.gob.cl/concesionarios',
      rows: 20,
    },
  },
  census_enrolled_ruts: 1006,
  census_superset_note:
    'operational census is a superset of the first-process legal universe; includes FASE1, FASE2_PRELIMINAR, and uncategorized reverse-ETL rows',
  census_by_category: {
    OIV_FASE1: 540,
    OIV_FASE2_PRELIMINAR: 95,
    salud: 91,
    banca: 9,
    estado: 6,
    telecom: 2,
    uncategorized: 263,
  },
  measured_ruts: 969,
  measured_domains: 1021,
  resolved_count: 478,
  unresolved_count: 491,
  never_measured_count: 37,
  pending_census_never_attempted: 37,
  resolution_definition:
    'resolved = domain answered DNS AND >=1 of {SPF,DKIM,DMARC,MTA-STS,TLS-RPT,BIMI} observable (maturity_score>0)',
  low_confidence_flagged: 51,
  posture_spf_present_ruts: 280,
  posture_dmarc_present_ruts: 322,
  fase2_preliminary: {
    count: 372,
    res: 'N°85/2026',
    diario_oficial: '2026-04-24',
    status: 'preliminary_in_consultation',
  },
  measurement_waves: {
    wave5_email_scan: 922,
    'dns-rescue-2026-06-14': 145,
    'censo-dirigido-2026-06-18': 99,
    'censo-dirigido-2026-06-19': 53,
    'censo-dirigido-2026-06-19-b': 7,
    'arl-hunter-2026-06-18': 4,
    'live-dns-2026-06-19': 2,
    'censo-dirigido-coord168': 2,
  },
  data_observed_min: '2026-05-26T02:04:50Z',
  data_observed_max: '2026-06-20T01:08:58Z',
  provenance: {
    primary_live_source: '~/.organism-kernel/state.sqlite',
    empty_source_warning: '/Users/dmz/dmz-center/dmz-control-center/data/anci_oiv.db is 0 bytes and is not a source',
    dataset_rows:
      'data/known-domains.json entries keyed by normalized RUT; manifest hash covers each RUT row plus the rut key',
    research_source:
      '/Users/dmz/dmz-center/dmz-control-center/data/CENSUS_COVERAGE_RESEARCH.md',
  },
  provenance_per_rut:
    'embedded in data/known-domains.json as one row per RUT: {rut, domain, razon_social, sector, dns_verified, verification_status, domain_status, last_validated}; aggregate-only claims are not sufficient for release verification',
  evidence_levels: {
    A: 'universe-enumeration',
    B: 'universe-scale observable measurement',
    C: 'sample-estimate-generalised',
  },
  honesty_caveats: [
    'anci_oiv.db is empty - sole live source is ~/.organism-kernel/state.sqlite',
    'retired legacy split is NOT reproducible; superseded by 478/491 of 969',
    'resolution counts != posture counts',
    'fase2 preliminary, final delta likely smaller; dataset covers first-process 915',
    'dataset covers first-process 915 legal designations / 909 distinct RUTs; operational census rows are a superset',
  ],
  release_signature: null,
};

writeFileSync(MANIFEST_PATH, `${stableStringify(manifest, 2)}\n`);
console.log(`Wrote data/MANIFEST.json (${integrity.rowCount} rows, sha256 ${integrity.actualSha256})`);
