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

export interface ResolveOptions {
  /** Run DNS/MX verification against the resolved domain (async, adds latency) */
  verify?: boolean;
}

export interface CoverageStats {
  total: number;
  bySector: Record<string, { count: number; dnsVerified: number }>;
  dnsVerified: number;
  dnsUnverified: number;
}
