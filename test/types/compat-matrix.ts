/**
 * v0.6.0 · ACCEPTANCE MATRIX — compile-time backward-compat fixture (FIX v0.6.0).
 *
 * This file is compiled by `tsc --noEmit --strict --exactOptionalPropertyTypes`
 * (wired into `npm run typecheck` via the dedicated `typecheck:compat` step). It
 * imports the BUILT `dist/` declarations exactly as an external v0.5.2 strict-mode
 * consumer would, and encodes the EXACT nullability contract the v0.6.0 overloads
 * must honour:
 *
 *   (1) Every v0.5.2 caller pattern — no options, object-literal options, AND a
 *       variable typed as the PUBLIC `ResolveOptions` — returns a NON-null
 *       `OIVDomainResolution` (so dereferencing `.domain` is clean, no TS18047).
 *   (2) ONLY the explicit `{ onlyResolving: true }` opt-in returns the nullable
 *       union; dereferencing it WITHOUT a guard MUST be a type error (proven by a
 *       `// @ts-expect-error`, so this fixture fails to compile if the nullability
 *       is ever lost — i.e. the @ts-expect-error becomes unused → TS2578).
 *   (3) `onlyResolving` still filters the COLLECTION APIs; `isResolving` /
 *       `DomainStatus` are exported; `OIVDomainResolution` has optional
 *       `domain_status` / `last_validated`.
 *
 * The fixture compiling clean = BOTH the non-null guarantees AND the nullable
 * guarantee hold simultaneously.
 *
 * Requires dist/ to be built first (`npm run build`).
 */

import {
  resolveOIVDomain,
  getAllEntries,
  isResolving,
} from '../../dist/index.js';
import type {
  ResolveOptions,
  OIVDomainResolution,
  DomainStatus,
  KnownDomainEntry,
} from '../../dist/index.js';

// ── (1) MUST COMPILE, result NON-null (no TS18047) ──────────────────────────────
export async function nonNullMatrix(): Promise<void> {
  const r1 = await resolveOIVDomain('97006000-6', 'BANCO DE CREDITO E INVERSIONES');
  r1.domain.toUpperCase();

  const r2 = await resolveOIVDomain('x', 'y', {});
  void r2.domain;

  const r3 = await resolveOIVDomain('x', 'y', { verify: true });
  void r3.domain;

  const r4 = await resolveOIVDomain('x', 'y', { verify: false });
  void r4.domain;

  // THE regression case: a variable typed as the PUBLIC ResolveOptions. Must be
  // non-null (no TS2769 "No overload matches", no TS18047 on deref).
  const o: ResolveOptions = { verify: true };
  const r5 = await resolveOIVDomain('x', 'y', o);
  void r5.domain;

  // Each non-null result is assignable to a non-null OIVDomainResolution.
  const _assignable: OIVDomainResolution[] = [r1, r2, r3, r4, r5];
  void _assignable;
}

// ── (2) MUST COMPILE, result NULLABLE (deref WITHOUT a guard must error TS18047) ─
export async function nullableMatrix(): Promise<void> {
  const r6 = await resolveOIVDomain('x', 'y', { onlyResolving: true });
  // @ts-expect-error · r6 is possibly null (onlyResolving:true union) — deref without a guard is a type error
  r6.domain.toUpperCase();

  // The nullable union is NOT assignable to a non-null OIVDomainResolution.
  // @ts-expect-error · Type 'OIVDomainResolution | null' is not assignable to 'OIVDomainResolution'
  const _notAssignable: OIVDomainResolution = r6;
  void _notAssignable;

  // After a guard, the result narrows to non-null and deref is clean.
  if (r6) {
    void r6.domain.toUpperCase();
  }
}

// ── (3) feature still present ───────────────────────────────────────────────────
export function featureSurface(): void {
  // onlyResolving filters the collection API and returns the filtered array.
  const filtered: Array<{ rut: string } & KnownDomainEntry> = getAllEntries({ onlyResolving: true });
  void filtered;

  // isResolving exported; DomainStatus exported.
  const status: DomainStatus = 'resolving';
  void status;
  void isResolving({ domain_status: status });

  // OIVDomainResolution carries OPTIONAL domain_status / last_validated.
  const res: OIVDomainResolution = {
    domain: 'bci.cl',
    source: 'known-domains',
    rut: '97006000-6',
    razonSocial: 'BANCO DE CREDITO E INVERSIONES',
    sector: 'banca_finanzas',
    verified: null,
    mxRecords: null,
    confidence: 1.0,
    domain_status: 'resolving',
    last_validated: '2026-06-14',
  };
  void res;
}
