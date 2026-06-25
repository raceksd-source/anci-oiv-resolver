/**
 * Signed dataset release integrity checks.
 *
 * The canonical dataset is the RUT-keyed row set in data/known-domains.json,
 * excluding package metadata. Rows are sorted by RUT and stable-stringified
 * before hashing so the digest is reproducible across platforms.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DatasetIntegrityResult {
  expectedSha256: string;
  actualSha256: string;
  rowCount: number;
}

export interface DatasetIntegrityPaths {
  datasetPath?: string;
  manifestPath?: string;
}

export class DatasetIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasetIntegrityError';
  }
}

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const DEFAULT_DATASET_PATH = join(DATA_DIR, 'known-domains.json');
const DEFAULT_MANIFEST_PATH = join(DATA_DIR, 'MANIFEST.json');

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toStableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => toStableJsonValue(item));
  }
  if (!isRecord(value)) {
    return value;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = toStableJsonValue(value[key]);
  }
  return sorted;
}

export function stableStringify(value: unknown, space?: number): string {
  return JSON.stringify(toStableJsonValue(value), null, space);
}

function readJsonObject(path: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'));
  if (!isRecord(parsed)) {
    throw new DatasetIntegrityError(`Expected JSON object at ${path}`);
  }
  return parsed;
}

export function canonicalKnownDomainRows(raw: Record<string, unknown>): unknown[] {
  const rows: Array<{ rut: string; value: Record<string, unknown> }> = [];
  for (const [rut, value] of Object.entries(raw)) {
    if (!rut.startsWith('_') && isRecord(value)) {
      rows.push({ rut, value });
    }
  }
  return rows
    .sort((left, right) => left.rut.localeCompare(right.rut))
    .map(({ rut, value }) => ({ rut, ...value }));
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf-8').digest('hex');
}

export function computeKnownDomainsSha256(raw: Record<string, unknown>): DatasetIntegrityResult {
  const rows = canonicalKnownDomainRows(raw);
  const actualSha256 = sha256Hex(stableStringify(rows));
  return {
    expectedSha256: actualSha256,
    actualSha256,
    rowCount: rows.length,
  };
}

function manifestExpectedSha256(manifest: Record<string, unknown>): string {
  const value = manifest.dataset_sha256;
  if (typeof value !== 'string' || value.length === 0) {
    throw new DatasetIntegrityError('MANIFEST.json is missing dataset_sha256');
  }
  return value;
}

function manifestExpectedRowCount(manifest: Record<string, unknown>): number | null {
  const value = manifest.dataset_row_count;
  if (value === undefined) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new DatasetIntegrityError('MANIFEST.json has invalid dataset_row_count');
  }
  return value;
}

export function assertDatasetIntegrity(
  paths: DatasetIntegrityPaths = {},
): DatasetIntegrityResult {
  const datasetPath = paths.datasetPath ?? DEFAULT_DATASET_PATH;
  const manifestPath = paths.manifestPath ?? DEFAULT_MANIFEST_PATH;
  const raw = readJsonObject(datasetPath);
  const manifest = readJsonObject(manifestPath);
  const actual = computeKnownDomainsSha256(raw);
  const expectedSha256 = manifestExpectedSha256(manifest);
  const expectedRowCount = manifestExpectedRowCount(manifest);

  if (actual.actualSha256 !== expectedSha256) {
    throw new DatasetIntegrityError(
      `Dataset integrity mismatch: expected sha256 ${expectedSha256}, got ${actual.actualSha256}`,
    );
  }
  if (expectedRowCount !== null && actual.rowCount !== expectedRowCount) {
    throw new DatasetIntegrityError(
      `Dataset row-count mismatch: expected ${expectedRowCount}, got ${actual.rowCount}`,
    );
  }

  return {
    expectedSha256,
    actualSha256: actual.actualSha256,
    rowCount: actual.rowCount,
  };
}

let verifiedIntegrity: DatasetIntegrityResult | null = null;

export function ensureDatasetIntegrity(): DatasetIntegrityResult {
  if (verifiedIntegrity === null) {
    verifiedIntegrity = assertDatasetIntegrity();
  }
  return verifiedIntegrity;
}
