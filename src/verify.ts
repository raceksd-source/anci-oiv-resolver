/**
 * anci-oiv-resolver · DNS + MX verification
 *
 * 100% passive — performs only forward DNS lookups (A, AAAA, MX).
 * No active scanning, no port probing, no HTTP requests.
 * Compliant with ISO/IEC 29147 passive reconnaissance framework.
 *
 * v0.5.1 — multi-resolver fallback chain.
 *   On hardened endpoints (DoH, NextDNS, corporate filters) the OS resolver
 *   frequently returns ESERVFAIL for live domains. To make this package
 *   reproducible by independent reviewers regardless of their endpoint DNS
 *   posture, we attempt the OS resolver first, then fall back through
 *   1.1.1.1 / 1.0.0.1 (Cloudflare), 8.8.8.8 / 8.8.4.4 (Google),
 *   and 9.9.9.9 / 149.112.112.112 (Quad9).
 *
 *   The richer {@link VerifyResult} distinguishes between:
 *     - live              (A or AAAA present)
 *     - mail_only         (no A/AAAA, MX present)
 *     - registered_no_a   (ENODATA from public resolver)
 *     - nxdomain          (ENOTFOUND from public resolver)
 *     - serverr           (every resolver returned ESERVFAIL)
 *     - timeout           (every resolver timed out)
 *     - unknown           (exhausted with no canonical code)
 */

import { promises as dnsPromises, Resolver } from 'dns';
import type { VerifyResult, VerifyStatus, VerifyResolver } from './types.js';

/** Default DNS query timeout in milliseconds */
const DNS_TIMEOUT_MS = 5_000;

/**
 * Public DNS resolver chain. Order matters — we attempt OS first (fast path,
 * works in most environments), then progressively fall back to public DNS.
 *
 * The chain is intentionally fixed at module-load time rather than being
 * configurable: changing it changes verification semantics across the test
 * suite, and reviewers should be able to reproduce against the same chain.
 */
const FALLBACK_RESOLVERS: ReadonlyArray<{ name: VerifyResolver; servers: string[] }> = [
  { name: 'cloudflare', servers: ['1.1.1.1', '1.0.0.1'] },
  { name: 'google', servers: ['8.8.8.8', '8.8.4.4'] },
  { name: 'quad9', servers: ['9.9.9.9', '149.112.112.112'] },
];

interface MxRecord { priority: number; exchange: string }

/**
 * Verify that a domain has a live DNS presence by checking:
 *   1. A records (IPv4) — primary
 *   2. AAAA records (IPv6) — counted as live if A is empty
 *   3. MX records (mail exchange) — collected; absence does not fail the check
 *
 * Returns `ok: true` (legacy) iff at least one A/AAAA record was found.
 * Returns `status: 'mail_only'` for domains with MX but no A/AAAA — these are
 * registered domains operating mail-only and should be counted as Layer-1 valid
 * by callers that care about the distinction.
 *
 * Multi-resolver semantics:
 *   - We try the OS resolver first.
 *   - If it returns A records, we accept the result (fast path).
 *   - If it returns ENOTFOUND (true NXDOMAIN per the OS view), we still
 *     cross-check against a public resolver because hardened endpoints
 *     misreport NXDOMAIN as ESERVFAIL or vice versa.
 *   - For any other failure (ESERVFAIL, ETIMEOUT, ENODATA, unknown), we walk
 *     the public-resolver chain. The first resolver that returns A records
 *     short-circuits with `status: 'live'`.
 *   - If every resolver in the chain agrees the domain has no A and no MX,
 *     we map the canonical error code to a {@link VerifyStatus}.
 */
export async function verifyDomain(domain: string): Promise<VerifyResult> {
  // Normalize: strip protocol prefix and trailing path if accidentally included
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();

  const result: VerifyResult = {
    ok: false,
    aRecords: [],
    mxRecords: [],
  };

  // 1. OS resolver — fast path
  const osAttempt = await attemptResolver(cleanDomain, null);
  if (osAttempt.aRecords.length > 0) {
    return finalize(result, osAttempt.aRecords, osAttempt.mxRecords, 'os', 'live');
  }
  if (osAttempt.aaaaRecords.length > 0) {
    // AAAA-only counts as live for backwards-compat (matches v0.5.0 behavior)
    result.mxRecords = formatMx(osAttempt.mxRecords);
    return { ...result, ok: true, status: 'live', via: 'os' };
  }

  // 2. Fall through to public resolver chain.
  // Track the most-recent canonical error code across the chain so we can map
  // it to a final status if every resolver exhausts without an A record.
  let lastCode: string | undefined = osAttempt.code;
  let lastMx: MxRecord[] = osAttempt.mxRecords;
  let lastAaaa: string[] = osAttempt.aaaaRecords;
  let lastVia: VerifyResolver = 'os';

  for (const cfg of FALLBACK_RESOLVERS) {
    const attempt = await attemptResolver(cleanDomain, cfg.servers);
    lastVia = cfg.name;
    if (attempt.aRecords.length > 0) {
      return finalize(result, attempt.aRecords, attempt.mxRecords, cfg.name, 'live');
    }
    if (attempt.aaaaRecords.length > 0) {
      result.mxRecords = formatMx(attempt.mxRecords);
      return { ...result, ok: true, status: 'live', via: cfg.name };
    }
    if (attempt.mxRecords.length > lastMx.length) lastMx = attempt.mxRecords;
    if (attempt.aaaaRecords.length > lastAaaa.length) lastAaaa = attempt.aaaaRecords;
    if (attempt.code) lastCode = attempt.code;
    // ENOTFOUND from a public resolver is authoritative — short-circuit.
    if (attempt.code === 'ENOTFOUND') break;
  }

  // 3. No A/AAAA from any resolver. Decide between mail_only and a failure status.
  if (lastMx.length > 0) {
    // Mail-only domain — registered, no web server. Counted as Layer-1 verified.
    result.mxRecords = formatMx(lastMx);
    const mailOnly: VerifyResult = { ...result, ok: false, status: 'mail_only', via: lastVia };
    if (lastCode !== undefined) mailOnly.error = lastCode;
    return mailOnly;
  }

  const status = mapErrorToStatus(lastCode);
  const failure: VerifyResult = {
    ...result,
    ok: false,
    status,
    via: status === 'unknown' ? 'exhausted' : lastVia,
  };
  if (lastCode !== undefined) failure.error = lastCode;
  // Avoid leaking unused lastAaaa — kept for future status refinement
  void lastAaaa;
  return failure;
}

interface ResolverAttempt {
  aRecords: string[];
  aaaaRecords: string[];
  mxRecords: MxRecord[];
  /** Canonical Node error code from the *A-record* attempt, or undefined on success. */
  code?: string;
}

/**
 * Attempt to resolve A / AAAA / MX records using the given resolver servers.
 * `servers === null` means use the OS-default resolver.
 *
 * Failures on individual record types are swallowed; the function never throws.
 * The canonical error code (when available) is returned in `code` for upstream
 * status mapping.
 */
async function attemptResolver(
  domain: string,
  servers: string[] | null,
): Promise<ResolverAttempt> {
  const out: ResolverAttempt = { aRecords: [], aaaaRecords: [], mxRecords: [] };

  if (servers === null) {
    const [a, aaaa, mx] = await Promise.allSettled([
      withTimeout(dnsPromises.resolve4(domain), DNS_TIMEOUT_MS),
      withTimeout(dnsPromises.resolve6(domain), DNS_TIMEOUT_MS),
      withTimeout(dnsPromises.resolveMx(domain), DNS_TIMEOUT_MS),
    ]);
    if (a.status === 'fulfilled') {
      out.aRecords = a.value;
    } else {
      const c = extractCode(a.reason);
      if (c !== undefined) out.code = c;
    }
    if (aaaa.status === 'fulfilled') out.aaaaRecords = aaaa.value;
    if (mx.status === 'fulfilled') out.mxRecords = mx.value;
    return out;
  }

  const r = new Resolver();
  r.setServers(servers);

  // Wrap callback-style methods on the legacy Resolver class as promises.
  // Node 18+ exposes promise-based methods on Resolver, but typing varies
  // across @types/node versions; use the callback shim for portability.
  const resolve = <T>(fn: (cb: (err: Error | null, result: T) => void) => void): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      fn((err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
    });

  const [a, aaaa, mx] = await Promise.allSettled([
    withTimeout(resolve<string[]>(cb => r.resolve4(domain, cb)), DNS_TIMEOUT_MS),
    withTimeout(resolve<string[]>(cb => r.resolve6(domain, cb)), DNS_TIMEOUT_MS),
    withTimeout(resolve<MxRecord[]>(cb => r.resolveMx(domain, cb)), DNS_TIMEOUT_MS),
  ]);
  if (a.status === 'fulfilled') {
    out.aRecords = a.value;
  } else {
    const c = extractCode(a.reason);
    if (c !== undefined) out.code = c;
  }
  if (aaaa.status === 'fulfilled') out.aaaaRecords = aaaa.value;
  if (mx.status === 'fulfilled') out.mxRecords = mx.value;
  return out;
}

function finalize(
  base: VerifyResult,
  aRecords: string[],
  mxRecords: MxRecord[],
  via: VerifyResolver,
  status: VerifyStatus,
): VerifyResult {
  return {
    ...base,
    ok: true,
    aRecords,
    mxRecords: formatMx(mxRecords),
    status,
    via,
  };
}

function formatMx(mxRecords: MxRecord[]): string[] {
  return [...mxRecords]
    .sort((a, b) => a.priority - b.priority)
    .map(r => `${r.priority} ${r.exchange}`);
}

function extractCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  if (err instanceof Error && err.message === 'TIMEOUT') return 'TIMEOUT';
  return undefined;
}

function mapErrorToStatus(code: string | undefined): VerifyStatus {
  switch (code) {
    case 'ENOTFOUND':
    case 'NXDOMAIN':
      return 'nxdomain';
    case 'ENODATA':
      return 'registered_no_a';
    case 'ESERVFAIL':
    case 'SERVFAIL':
      return 'serverr';
    case 'TIMEOUT':
    case 'ETIMEOUT':
      return 'timeout';
    default:
      return 'unknown';
  }
}

/**
 * Batch-verify multiple domains with controlled concurrency.
 * @param domains - Array of domain strings
 * @param concurrency - Max parallel DNS queries (default 5)
 */
export async function batchVerify(
  domains: string[],
  concurrency = 5,
): Promise<Map<string, VerifyResult>> {
  const results = new Map<string, VerifyResult>();
  const queue = [...domains];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const settled = await Promise.allSettled(
      batch.map(async domain => {
        const r = await verifyDomain(domain);
        return { domain, r };
      }),
    );
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.set(item.value.domain, item.value.r);
      }
    }
  }

  return results;
}

/** Wrap a promise with a timeout; rejects with 'TIMEOUT' if exceeded */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}
