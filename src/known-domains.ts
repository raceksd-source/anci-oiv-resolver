/**
 * anci-oiv-resolver · known-domains table
 * Canonical RUT → domain mapping for Chilean OIVs (Ley 21.663)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { KnownDomainEntry, KnownDomainsFile, OIVDomainResolution, CoverageStats } from './types.js';

// Load and parse the known-domains JSON at module init (sync, one-shot)
const DATA_PATH = join(new URL('.', import.meta.url).pathname, '..', 'data', 'known-domains.json');

function loadTable(): Map<string, KnownDomainEntry> {
  const raw: KnownDomainsFile = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  const map = new Map<string, KnownDomainEntry>();

  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    const entry = value as KnownDomainEntry;
    if (entry && typeof entry === 'object' && 'domain' in entry) {
      // Normalize RUT: uppercase, trim
      map.set(normalizeRut(key), entry);
    }
  }
  return map;
}

/**
 * Normalize a Chilean RUT string.
 * Accepts: "97006000-6", "97.006.000-6", "97006000-K", etc.
 * Returns: "97006000-6" (no dots, uppercase verifier digit)
 */
export function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').trim().toUpperCase();
}

// Singleton table
let _table: Map<string, KnownDomainEntry> | null = null;

function getTable(): Map<string, KnownDomainEntry> {
  if (!_table) {
    _table = loadTable();
  }
  return _table;
}

/**
 * Look up a RUT in the known-domains table.
 * Returns a partial OIVDomainResolution (no verify fields) or null if not found.
 */
export function resolveBytable(
  rut: string
): Omit<OIVDomainResolution, 'verified' | 'mxRecords'> | null {
  const table = getTable();
  const normalized = normalizeRut(rut);
  const entry = table.get(normalized);

  if (!entry) return null;

  return {
    domain: entry.domain,
    source: 'known-domains',
    rut: normalized,
    razonSocial: entry.razon_social,
    sector: entry.sector as OIVDomainResolution['sector'],
    confidence: entry.dns_verified ? 1.0 : 0.85,
  };
}

/**
 * Check whether a RUT exists in the table without full resolution.
 */
export function hasEntry(rut: string): boolean {
  return getTable().has(normalizeRut(rut));
}

/**
 * Return all entries as an array (useful for bulk processing).
 */
export function getAllEntries(): Array<{ rut: string } & KnownDomainEntry> {
  return Array.from(getTable().entries()).map(([rut, entry]) => ({ rut, ...entry }));
}

/**
 * Coverage statistics across sectors.
 */
export function getCoverageStats(): CoverageStats {
  const table = getTable();
  const bySector: Record<string, { count: number; dnsVerified: number }> = {};
  let dnsVerified = 0;
  let dnsUnverified = 0;

  for (const entry of table.values()) {
    const s = entry.sector ?? 'unknown';
    if (!bySector[s]) bySector[s] = { count: 0, dnsVerified: 0 };
    bySector[s].count++;
    if (entry.dns_verified) {
      bySector[s].dnsVerified++;
      dnsVerified++;
    } else {
      dnsUnverified++;
    }
  }

  return { total: table.size, bySector, dnsVerified, dnsUnverified };
}
