/**
 * anci-oiv-resolver · main API
 *
 * Canonical Chilean OIV registry name → domain resolver.
 * Eliminates false-positive findings when running passive OSINT against
 * the 915 organizations registered under Ley 21.663 (Marco Nacional de Ciberseguridad).
 *
 * Resolution strategy (in order):
 *   1. RUT table lookup (known-domains.json · getCoverageStats().total entries · high confidence)
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
import type {
  OIVDomainResolution,
  ResolveOptions,
  ResolveOptionsWithStatus,
  VerifyResult,
} from './types.js';

/**
 * Resolve the canonical web domain for a Chilean OIV organization.
 *
 * @param rut - Chilean RUT (e.g. "97006000-6" or "97.006.000-6")
 * @param razonSocial - ANCI registry name (e.g. "BANCO DE CRÉDITO E INVERSIONES")
 * @param options.verify - If true, performs a live DNS check (adds ~50–300ms latency)
 *
 * @returns OIVDomainResolution with domain, source, confidence, and optional DNS data.
 *          v0.6.0 · returns `null` ONLY when `options.onlyResolving === true` and the
 *          (table-sourced) entry's baked `domain_status` is not `'resolving'`. Callers
 *          that do not opt in never receive `null` (v0.5.2 behavior unchanged).
 *
 * Backward-compat overloads (FIX v0.6.0): the v0.5.2 return type
 * `Promise<OIVDomainResolution>` (NEVER null) is preserved for every call that does
 * NOT set `onlyResolving: true`. Strict-mode consumers can dereference the result
 * directly without a TS18047 ("possibly null") error. The nullable union is
 * exposed ONLY to the explicit `{ onlyResolving: true }` opt-in.
 */
// Overload 1 · no options → non-null (v0.5.2 contract, unchanged).
export async function resolveOIVDomain(
  rut: string,
  razonSocial: string,
): Promise<OIVDomainResolution>;
// Overload 2 · a plain `ResolveOptions` (which has NO `onlyResolving`), or one that
// passes `onlyResolving` as `false` / `undefined` → non-null. Because the exported
// `ResolveOptions` is `{ verify?: boolean }`, a value typed as `ResolveOptions`
// (object-literal OR variable) is assignable to this option type, so it ALWAYS
// selects this non-null overload — restoring the v0.5.2 contract. The
// `onlyResolving?: false | undefined` member only widens this overload to also
// accept an explicit `onlyResolving: false`.
export async function resolveOIVDomain(
  rut: string,
  razonSocial: string,
  options: ResolveOptions & { onlyResolving?: false | undefined },
): Promise<OIVDomainResolution>;
// Overload 3 · the ONLY nullable path: explicit { onlyResolving: true }. A plain
// `ResolveOptions` can never reach here (it lacks the required `onlyResolving: true`),
// so the nullable union is strictly opt-in.
export async function resolveOIVDomain(
  rut: string,
  razonSocial: string,
  options: ResolveOptions & { onlyResolving: true },
): Promise<OIVDomainResolution | null>;
// Implementation signature (union-typed; not part of the public overload set).
// The option type explicitly includes `undefined` in `onlyResolving` so that, under
// exactOptionalPropertyTypes, it is a supertype of all three overloads' option shapes
// (omitted / false|undefined / true) — each overload is then assignable to it. (A bare
// `onlyResolving?: boolean` would exclude the `undefined` value-type and reject the
// `false | undefined` overload → TS2394.)
export async function resolveOIVDomain(
  rut: string,
  razonSocial: string,
  options: ResolveOptions & { onlyResolving?: boolean | undefined } = {}
): Promise<OIVDomainResolution | null> {
  // 1st pass: table lookup by RUT
  const tableMatch = resolveBytable(rut);

  if (tableMatch) {
    // v0.6.0 · opt-in static filter (only meaningful for table-sourced rows,
    // which carry the baked domain_status).
    if (options.onlyResolving && tableMatch.domain_status !== 'resolving') {
      return null;
    }
    if (options.verify) {
      const dns = await verifyDomain(tableMatch.domain);
      return decorate(tableMatch, dns);
    }
    return { ...tableMatch, verified: null, mxRecords: null };
  }

  // 2nd pass: heuristic inference from razón social.
  // Heuristic rows carry no baked domain_status, so onlyResolving (which is a
  // filter on the STATIC stratum) drops them as non-resolving.
  if (options.onlyResolving) {
    return null;
  }

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
 *
 * v0.6.0 · when `options.onlyResolving === true`, entries whose baked
 * `domain_status` is not `'resolving'` (and heuristic-only entries) are OMITTED
 * from the output. Default behavior is unchanged: one result per input entry.
 */
export async function resolveBatch(
  entries: Array<{ rut: string; razonSocial: string }>,
  options: ResolveOptionsWithStatus = {}
): Promise<OIVDomainResolution[]> {
  // Branch on the onlyResolving opt-in so each internal call hits a CONCRETE
  // overload: the non-filtering branch resolves through the non-null overloads
  // (v0.5.2 behavior), and only the explicit { onlyResolving: true } branch can
  // produce nulls (which are then dropped from the batch). This keeps the public
  // overloads strictly typed for callers that pass a generic ResolveOptions.
  const onlyResolving = options.onlyResolving === true;
  const errEntry = (rut: string, razonSocial: string, err: unknown): OIVDomainResolution => ({
    domain: '',
    source: 'heuristic',
    rut,
    razonSocial,
    sector: 'unknown',
    verified: false,
    mxRecords: null,
    confidence: 0,
    error: String(err),
  });

  const settled = await Promise.all(
    entries.map(({ rut, razonSocial }) =>
      onlyResolving
        ? resolveOIVDomain(rut, razonSocial, { ...options, onlyResolving: true }).catch(err =>
            errEntry(rut, razonSocial, err),
          )
        : resolveOIVDomain(rut, razonSocial, { ...options, onlyResolving: false }).catch(err =>
            errEntry(rut, razonSocial, err),
          ),
    ),
  );
  // resolveOIVDomain returns null only under onlyResolving for non-resolving
  // entries; drop those so the batch omits them.
  return settled.filter((r): r is OIVDomainResolution => r !== null);
}

// Re-export primitives for advanced usage
export { resolveBytable, heuristicInfer, verifyDomain };
export { getCoverageStats, getAllEntries, normalizeRut, hasEntry, isResolving } from './known-domains.js';
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
  ResolveOptionsWithStatus,
  CoverageStats,
  KnownDomainEntry,
  DomainStatus,
} from './types.js';
