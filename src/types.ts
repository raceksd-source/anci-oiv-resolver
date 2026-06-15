/**
 * anci-oiv-resolver · TypeScript types
 * Canonical Chilean OIV domain resolution under Ley 21.663
 */

export type OIVSector =
  | 'banca_finanzas'
  | 'telecomunicaciones'
  | 'energia_electrica'
  | 'salud'
  | 'administracion_estado'
  | 'empresas_estado'
  | 'agua_saneamiento'
  | 'transporte'
  | 'combustibles'
  | 'unknown';

export type ResolutionSource = 'known-domains' | 'heuristic';

/**
 * v0.6.0 · STATIC per-entry DNS-resolvability classification baked into every
 * RUT row of `data/known-domains.json`.
 *
 *   resolving  — domain has a live A/AAAA record OR an MX record (registered + reachable)
 *   phantom    — domain returns NXDOMAIN (ENOTFOUND consensus from PUBLIC resolvers)
 *   defunct    — RESERVED / manual-only: the organization itself ceased to exist
 *                (vs. a mis-guessed domain). NEVER auto-assigned in v0.6.0.
 *   unverified — inconclusive (registered_no_a / serverr / timeout / unknown);
 *                NEVER collapsed into `phantom` so live govt/health orgs with
 *                apex-A-less DNS are not mislabeled.
 *
 * This is a STATIC annotation distinct from the live runtime {@link VerifyStatus}
 * 7-enum. It is surfaced WITHOUT requiring `verify:true`. The mapping from the
 * frozen 2026-05-26 `verification_status` is: live+mail_only → resolving,
 * nxdomain → phantom, everything-else → unverified.
 */
export type DomainStatus = 'resolving' | 'phantom' | 'defunct' | 'unverified';

export interface OIVDomainResolution {
  /** Resolved domain (e.g. "bci.cl") */
  domain: string;
  /** Source of the resolution */
  source: ResolutionSource;
  /** RUT of the organization, normalized (e.g. "97006000-6") */
  rut: string;
  /** ANCI registry name */
  razonSocial: string;
  /** Sector classification */
  sector: OIVSector;
  /**
   * null = not verified (verify option not requested)
   * true  = DNS A/AAAA record confirmed
   * false = DNS lookup failed or NXDOMAIN
   *
   * Note: when `status === 'mail_only'`, `verified` is false for backwards
   * compatibility (no A record) but the domain is registered. Consumers that
   * want to count mail-only domains as Layer-1 verified should branch on
   * `status` rather than `verified`.
   */
  verified: boolean | null;
  /** MX records if verification was requested, null otherwise */
  mxRecords: string[] | null;
  /** Confidence 0–1: 1.0 for table lookups, lower for heuristic */
  confidence: number;
  /**
   * v0.5.1+ · Distinguished verification status when verify=true.
   * `undefined` when verify=false. See {@link VerifyStatus}.
   */
  status?: VerifyStatus;
  /**
   * v0.5.1+ · Resolver that produced the verification result.
   * `undefined` when verify=false.
   */
  via?: VerifyResolver;
  /**
   * v0.6.0+ · STATIC per-entry DNS-resolvability classification, surfaced from
   * the known-domains table WITHOUT requiring `verify:true`. See {@link DomainStatus}.
   * `undefined` for heuristic-sourced resolutions (no fabricated static claim).
   */
  domain_status?: DomainStatus;
  /**
   * v0.6.0+ · ISO-8601 day string (e.g. "2026-06-14") of the static re-verification
   * that produced `domain_status`. Added ALONGSIDE the existing `verified_at`,
   * never renamed. `undefined` for heuristic-sourced resolutions.
   */
  last_validated?: string;
}

/**
 * Distinguished resolution outcomes returned by verifyDomain (v0.5.1+).
 *
 *   live              — at least one A or AAAA record was returned by some resolver
 *   mail_only         — no A/AAAA but at least one MX record (domain registered, mail-only)
 *   registered_no_a   — public resolvers returned ENODATA (registered but no A/MX)
 *   nxdomain          — public resolvers returned ENOTFOUND (domain does not exist)
 *   serverr           — every resolver in the chain returned ESERVFAIL (cannot conclude)
 *   timeout           — every resolver in the chain timed out (network or filter)
 *   unknown           — no resolver returned a usable result and no canonical error code
 *
 * `live` and `mail_only` both imply the domain is registered and reachable in some form
 * and should be counted as Layer-1 verified. The other states are non-verifying.
 */
export type VerifyStatus =
  | 'live'
  | 'mail_only'
  | 'registered_no_a'
  | 'nxdomain'
  | 'serverr'
  | 'timeout'
  | 'unknown';

/**
 * Which resolver chain produced the result (v0.5.1+).
 *   os         — Node's OS-default resolver (system DNS)
 *   cloudflare — 1.1.1.1 / 1.0.0.1
 *   google     — 8.8.8.8 / 8.8.4.4
 *   quad9      — 9.9.9.9 / 149.112.112.112
 *   exhausted  — every resolver in the chain failed to produce a definitive answer
 */
export type VerifyResolver = 'os' | 'cloudflare' | 'google' | 'quad9' | 'exhausted';

export interface VerifyResult {
  /** Backwards-compatible: true iff status === 'live' (A or AAAA record present). */
  ok: boolean;
  mxRecords: string[];
  aRecords: string[];
  /** Canonical error code (e.g. 'ENOTFOUND', 'ESERVFAIL', 'TIMEOUT') when ok=false. */
  error?: string;
  /**
   * v0.5.1+ · Distinguished verification outcome.
   * Older consumers can ignore this field; behavior of `ok` is unchanged.
   */
  status?: VerifyStatus;
  /**
   * v0.5.1+ · Resolver that produced the result.
   * Lets reviewers reproduce a finding against the same public resolver.
   */
  via?: VerifyResolver;
}

export interface KnownDomainEntry {
  domain: string;
  razon_social: string;
  sector: string;
  dns_verified: boolean;
  note?: string;
  /** v0.5.1+ · frozen 2026-05-26 runtime verification status (never renamed). */
  verification_status?: VerifyStatus;
  /** v0.5.1+ · frozen 2026-05-26 resolver of record (never renamed). */
  verification_resolver?: string;
  /** v0.5.1+ · frozen 2026-05-26 verification date (never renamed). */
  verified_at?: string;
  /**
   * v0.6.0+ · STATIC DNS-resolvability classification baked from the honest,
   * null-route-filtered public-resolver re-verification. Optional so external
   * JSON consumers and tests that build partial entries still typecheck.
   */
  domain_status?: DomainStatus;
  /** v0.6.0+ · ISO-8601 day of the `domain_status` bake (alongside `verified_at`). */
  last_validated?: string;
  /**
   * v0.6.0+ · the PUBLIC resolver that produced the honest classification
   * (mirrors {@link VerifyResolver} minus 'os'; the OS/NextDNS leg is excluded
   * as the contamination vector). Optional / informational.
   */
  domain_status_via?: string;
}

export interface KnownDomainsFile {
  _meta: {
    description: string;
    format: string;
    generated: string;
    version: string;
    total_entries: number;
    coverage_note: string;
    sectors: string[];
  };
  [rut: string]: KnownDomainEntry | unknown;
}

/**
 * v0.5.2 PUBLIC contract — kept IDENTICAL on purpose (FIX v0.6.0 · backward-compat).
 *
 * This type intentionally does NOT carry `onlyResolving`. Adding a broad
 * `onlyResolving?: boolean` here is what broke the v0.5.2 caller pattern under
 * `--strict --exactOptionalPropertyTypes`: a variable typed as `ResolveOptions`
 * then matches NEITHER the non-null overload (whose option type narrows
 * `onlyResolving` to `false | undefined`) NOR the nullable `onlyResolving: true`
 * overload, yielding `TS2769 No overload matches this call`.
 *
 * Keeping `ResolveOptions` as `{ verify?: boolean }` means a plain `ResolveOptions`
 * value (literal OR variable) always selects a NON-null `resolveOIVDomain` overload,
 * exactly like v0.5.2. The opt-in nullable `{ onlyResolving: true }` variant is
 * expressed via {@link ResolveOptionsWithStatus} / an intersection overload instead.
 */
export interface ResolveOptions {
  /** Run DNS/MX verification against the resolved domain (async, adds latency) */
  verify?: boolean;
}

/**
 * v0.6.0+ · `ResolveOptions` PLUS the opt-in static-status filter. Used by the
 * COLLECTION APIs (`resolveBatch`, `getAllEntries`) where filtering is purely
 * additive (it drops entries from an array — there is no single-result `null`
 * hazard). For the SINGLE-result `resolveOIVDomain`, the `onlyResolving: true`
 * opt-in is exposed through a dedicated intersection overload so that a plain
 * `ResolveOptions` argument can never accidentally select the nullable path.
 *
 * When `onlyResolving === true`, `resolveBatch` / `getAllEntries` omit entries
 * whose baked `domain_status` is `'phantom'`, `'defunct'`, or `'unverified'`
 * (i.e. keep only `'resolving'`). Default `undefined`/`false` preserves v0.5.2
 * behavior exactly.
 */
export interface ResolveOptionsWithStatus extends ResolveOptions {
  onlyResolving?: boolean;
}

export interface CoverageStats {
  total: number;
  bySector: Record<string, { count: number; dnsVerified: number }>;
  dnsVerified: number;
  dnsUnverified: number;
}
