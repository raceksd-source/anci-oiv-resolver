/**
 * anci-oiv-resolver · main API
 *
 * Canonical Chilean OIV registry name → domain resolver.
 * Eliminates false-positive findings when running passive OSINT against
 * the 915 organizations registered under Ley 21.663 (Marco Nacional de Ciberseguridad).
 *
 * Resolution strategy (in order):
 *   1. RUT table lookup (known-domains.json · 77 entries · high confidence)
 *   2. Heuristic inference from razón social (accent-normalize + stopword-strip)
 *
 * @example
 * import { resolveOIVDomain } from 'anci-oiv-resolver';
 * const r = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
 * // → { domain: 'bci.cl', source: 'known-domains', confidence: 1.0, verified: null, ... }
 */

import { resolveBytable } from './known-domains.js';
import { heuristicInfer } from './heuristic.js';
import { verifyDomain } from './verify.js';
import type { OIVDomainResolution, ResolveOptions } from './types.js';

/**
 * Resolve the canonical web domain for a Chilean OIV organization.
 *
 * @param rut - Chilean RUT (e.g. "97006000-6" or "97.006.000-6")
 * @param razonSocial - ANCI registry name (e.g. "BANCO DE CRÉDITO E INVERSIONES")
 * @param options.verify - If true, performs a live DNS check (adds ~50–300ms latency)
 *
 * @returns OIVDomainResolution with domain, source, confidence, and optional DNS data
 */
export async function resolveOIVDomain(
  rut: string,
  razonSocial: string,
  options: ResolveOptions = {}
): Promise<OIVDomainResolution> {
  // 1st pass: table lookup by RUT
  const tableMatch = resolveBytable(rut);

  if (tableMatch) {
    if (options.verify) {
      const dns = await verifyDomain(tableMatch.domain);
      return {
        ...tableMatch,
        verified: dns.ok,
        mxRecords: dns.mxRecords.length > 0 ? dns.mxRecords : null,
      };
    }
    return { ...tableMatch, verified: null, mxRecords: null };
  }

  // 2nd pass: heuristic inference from razón social
  const inferred = heuristicInfer(razonSocial, rut);

  if (options.verify) {
    const dns = await verifyDomain(inferred.domain);
    return {
      ...inferred,
      verified: dns.ok,
      mxRecords: dns.mxRecords.length > 0 ? dns.mxRecords : null,
    };
  }

  return { ...inferred, verified: null, mxRecords: null };
}

/**
 * Resolve multiple OIVs in batch.
 * Preserves input order; errors per-entry are caught and produce confidence=0 entries.
 */
export async function resolveBatch(
  entries: Array<{ rut: string; razonSocial: string }>,
  options: ResolveOptions = {}
): Promise<OIVDomainResolution[]> {
  return Promise.all(
    entries.map(({ rut, razonSocial }) =>
      resolveOIVDomain(rut, razonSocial, options).catch(err => ({
        domain: '',
        source: 'heuristic' as const,
        rut,
        razonSocial,
        sector: 'unknown' as const,
        verified: false,
        mxRecords: null,
        confidence: 0,
        error: String(err),
      }))
    )
  );
}

// Re-export primitives for advanced usage
export { resolveBytable, heuristicInfer, verifyDomain };
export { getCoverageStats, getAllEntries, normalizeRut } from './known-domains.js';
export { normalizeAccents, inferDomainToken } from './heuristic.js';
export { batchVerify } from './verify.js';

// Re-export all types
export type {
  OIVDomainResolution,
  OIVSector,
  ResolutionSource,
  VerifyResult,
  ResolveOptions,
  CoverageStats,
  KnownDomainEntry,
} from './types.js';
