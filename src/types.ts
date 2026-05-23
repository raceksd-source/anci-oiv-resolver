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
   */
  verified: boolean | null;
  /** MX records if verification was requested, null otherwise */
  mxRecords: string[] | null;
  /** Confidence 0–1: 1.0 for table lookups, lower for heuristic */
  confidence: number;
}

export interface VerifyResult {
  ok: boolean;
  mxRecords: string[];
  aRecords: string[];
  error?: string;
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
