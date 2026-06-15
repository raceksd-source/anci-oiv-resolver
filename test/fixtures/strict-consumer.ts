/**
 * v0.6.0 · strict-mode TypeScript consumer fixture (FIX 1 · overload backward-compat).
 *
 * This file is type-checked by test/strict-consumer-types.test.ts via a dedicated
 * `tsc --strict --noEmit` run against the BUILT dist/ declarations. It encodes the
 * v0.5.2 backward-compat contract that the v0.6.0 overloads must restore:
 *
 *   - resolveOIVDomain(rut, razonSocial) and ...with options WITHOUT onlyResolving:true
 *     return Promise<OIVDomainResolution> (NEVER null) — so `r.domain` is reachable
 *     under --strict with NO TS18047 ("possibly null").
 *   - ONLY resolveOIVDomain(rut, razonSocial, { onlyResolving: true }) returns
 *     Promise<OIVDomainResolution | null>.
 *
 * Negative cases use `// @ts-expect-error`: if the overloads regress (e.g. the
 * non-onlyResolving call goes back to returning a nullable), the @ts-expect-error
 * stops matching and tsc errors out — failing the test.
 */

// Resolve against the BUILT package types (dist), exactly as an external consumer would.
import { resolveOIVDomain } from '../../dist/index.js';
import type { OIVDomainResolution } from '../../dist/index.js';

export async function strictConsumer(): Promise<void> {
  // (1) No options → non-null. Accessing .domain.toUpperCase() must compile clean.
  const r1 = await resolveOIVDomain('97006000-6', 'X');
  const _t1: OIVDomainResolution = r1; // non-null assignability
  void r1.domain.toUpperCase();
  void _t1;

  // (2) options WITHOUT onlyResolving → non-null.
  const r2 = await resolveOIVDomain('97006000-6', 'X', { verify: true });
  void r2.domain.toUpperCase();

  // (3) onlyResolving: false → still non-null (explicit false is v0.5.2 behavior).
  const r3 = await resolveOIVDomain('97006000-6', 'X', { onlyResolving: false });
  void r3.domain.toUpperCase();

  // (4) onlyResolving: undefined → still non-null.
  const r4 = await resolveOIVDomain('97006000-6', 'X', { onlyResolving: undefined });
  void r4.domain.toUpperCase();

  // (5) ONLY onlyResolving: true → nullable union.
  const r5 = await resolveOIVDomain('97006000-6', 'X', { onlyResolving: true });
  const _t5: OIVDomainResolution | null = r5; // must accept null branch
  void _t5;
  if (r5) {
    void r5.domain.toUpperCase(); // reachable only after a null guard
  }
}

// ── Negative type assertions (these MUST error; @ts-expect-error swallows them) ──

export async function strictConsumerNegatives(): Promise<void> {
  // onlyResolving:true is nullable → dereferencing without a guard MUST be a type error.
  const r5 = await resolveOIVDomain('97006000-6', 'X', { onlyResolving: true });
  // @ts-expect-error · r5 is possibly null (onlyResolving:true union)
  void r5.domain.toUpperCase();

  // onlyResolving:true result is NOT assignable to a non-null OIVDomainResolution.
  const r6 = await resolveOIVDomain('97006000-6', 'X', { onlyResolving: true });
  // @ts-expect-error · Type 'OIVDomainResolution | null' is not assignable to 'OIVDomainResolution'
  const _t6: OIVDomainResolution = r6;
  void _t6;
}
