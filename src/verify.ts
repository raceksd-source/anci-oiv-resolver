/**
 * anci-oiv-resolver · DNS + MX verification
 *
 * 100% passive — performs only forward DNS lookups (A, AAAA, MX).
 * No active scanning, no port probing, no HTTP requests.
 * Compliant with ISO/IEC 29147 passive reconnaissance framework.
 */

import { promises as dns } from 'dns';
import type { VerifyResult } from './types.js';

/** Default DNS query timeout in milliseconds */
const DNS_TIMEOUT_MS = 5_000;

/**
 * Verify that a domain has a live DNS presence by checking:
 *   1. A records (IPv4)
 *   2. AAAA records (IPv6) as fallback if no A records
 *   3. MX records (mail exchange)
 *
 * Returns { ok: true } if any A/AAAA record resolves.
 * MX records are collected opportunistically; their absence does not fail the check.
 */
export async function verifyDomain(domain: string): Promise<VerifyResult> {
  // Normalize: strip protocol prefix if accidentally included
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const result: VerifyResult = {
    ok: false,
    aRecords: [],
    mxRecords: [],
  };

  // Run A, AAAA, MX lookups in parallel, swallow individual failures
  const [aResult, aaaaResult, mxResult] = await Promise.allSettled([
    withTimeout(dns.resolve4(cleanDomain), DNS_TIMEOUT_MS),
    withTimeout(dns.resolve6(cleanDomain), DNS_TIMEOUT_MS),
    withTimeout(dns.resolveMx(cleanDomain), DNS_TIMEOUT_MS),
  ]);

  if (aResult.status === 'fulfilled') {
    result.aRecords = aResult.value;
    result.ok = result.aRecords.length > 0;
  }

  if (aaaaResult.status === 'fulfilled' && !result.ok) {
    // AAAA fallback counts as a live domain
    result.ok = aaaaResult.value.length > 0;
  }

  if (mxResult.status === 'fulfilled') {
    result.mxRecords = mxResult.value
      .sort((a, b) => a.priority - b.priority)
      .map(r => `${r.priority} ${r.exchange}`);
  }

  if (!result.ok && aResult.status === 'rejected') {
    // Capture error message for debugging
    const err = aResult.reason as NodeJS.ErrnoException;
    result.error = err.code ?? err.message;
  }

  return result;
}

/**
 * Batch-verify multiple domains with controlled concurrency.
 * @param domains - Array of domain strings
 * @param concurrency - Max parallel DNS queries (default 5)
 */
export async function batchVerify(
  domains: string[],
  concurrency = 5
): Promise<Map<string, VerifyResult>> {
  const results = new Map<string, VerifyResult>();
  const queue = [...domains];

  while (queue.length > 0) {
    const batch = queue.splice(0, concurrency);
    const settled = await Promise.allSettled(
      batch.map(async domain => {
        const r = await verifyDomain(domain);
        return { domain, r };
      })
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
      e => { clearTimeout(timer); reject(e); }
    );
  });
}
