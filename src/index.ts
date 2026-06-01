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
import type { OIVDomainResolution, ResolveOptions, VerifyResult } from './types.js';

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
      return decorate(tableMatch, dns);
    }
    return { ...tableMatch, verified: null, mxRecords: null };
  }

  // 2nd pass: heuristic inference from razón social
  const inferred = heuristicInfer(razonSocial, rut);

  if (options.verify) {
    const dns = await verifyDomain(inferred.domain);
    return decorate(inferred, dns);
  }

  return { ...inferred, verified: null, mxRecords: null };
}

/**
 * Merge a verification result onto a partial resolution, conditionally setting
 * the optional `status` and `via` fields (required by exactOptionalPropertyTypes).
 */
function decorate(
  base: Omit<OIVDomainResolution, 'verified' | 'mxRecords'>,
  dns: VerifyResult,
): OIVDomainResolution {
  const out: OIVDomainResolution = {
    ...base,
    verified: dns.ok,
    mxRecords: dns.mxRecords.length > 0 ? dns.mxRecords : null,
  };
  if (dns.status !== undefined) out.status = dns.status;
  if (dns.via !== undefined) out.via = dns.via;
  return out;
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
export { getCoverageStats, getAllEntries, normalizeRut, hasEntry } from './known-domains.js';
export { normalizeAccents, inferDomainToken } from './heuristic.js';
export { batchVerify } from './verify.js';

// Re-export all types
export type {
  OIVDomainResolution,
  OIVSector,
  ResolutionSource,
  VerifyResult,
  VerifyStatus,
  VerifyResolver,
  ResolveOptions,
  CoverageStats,
  KnownDomainEntry,
} from './types.js';
