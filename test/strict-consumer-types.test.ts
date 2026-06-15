/**
 * v0.6.0 · FIX 1 regression test — resolveOIVDomain overload backward-compat.
 *
 * The project tsconfig EXCLUDES test/, so `npm run typecheck` does not type-check
 * consumer code. This test therefore drives a dedicated `tsc --strict --noEmit`
 * run over test/fixtures/strict-consumer.ts (which imports the BUILT dist/ types,
 * exactly as an external v0.5.2 strict-mode consumer would) and asserts it compiles
 * with NO error.
 *
 * The fixture also carries `// @ts-expect-error` negative cases proving the
 * { onlyResolving: true } overload still yields the nullable union. If the overloads
 * regress in EITHER direction (non-onlyResolving becomes nullable → TS18047 surfaces;
 * or onlyResolving:true becomes non-null → @ts-expect-error becomes unused → TS2578),
 * tsc exits non-zero and this test fails.
 *
 * Requires dist/ to be built first (npm run build, or the `build` step before tests).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const DIST_DTS = join(ROOT, 'dist', 'index.d.ts');
const FIXTURE = join(HERE, 'fixtures', 'strict-consumer.ts');

describe('v0.6.0 · FIX 1 · resolveOIVDomain overloads (strict-mode consumer compile)', () => {
  it('a strict-mode consumer fixture compiles clean against dist/ (overloads restore v0.5.2)', () => {
    assert.ok(existsSync(DIST_DTS), `dist/index.d.ts missing — run "npm run build" first (${DIST_DTS})`);

    // Compile ONLY the fixture, in the strictest mode, against the built dist types.
    // No emit; we only care about the exit code / diagnostics.
    let output = '';
    let failed = false;
    try {
      output = execFileSync(
        'npx',
        [
          'tsc',
          '--noEmit',
          '--strict',
          '--exactOptionalPropertyTypes',
          '--module', 'NodeNext',
          '--moduleResolution', 'NodeNext',
          '--target', 'ES2022',
          '--skipLibCheck',
          FIXTURE,
        ],
        { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch (err: unknown) {
      failed = true;
      const e = err as { stdout?: Buffer | string; stderr?: Buffer | string };
      output = String(e.stdout ?? '') + String(e.stderr ?? '');
    }

    assert.equal(
      failed,
      false,
      `strict consumer fixture FAILED to compile — overloads not backward-compatible:\n${output}`,
    );
  });

  it('dist/index.d.ts declares the resolveOIVDomain overloads (non-null default + nullable onlyResolving)', () => {
    assert.ok(existsSync(DIST_DTS), 'dist/index.d.ts must exist (build first)');
    const dts = readFileSync(DIST_DTS, 'utf-8');
    // Collapse whitespace/newlines so each `export declare function resolveOIVDomain(... );`
    // overload is a single matchable string (tsc emits intersected option types
    // across multiple lines).
    const flat = dts.replace(/\s+/g, ' ');
    const overloads =
      flat.match(/export declare function resolveOIVDomain\(.*?\): Promise<[^;]*?>;/g) ?? [];
    // 3 public overloads (no options · onlyResolving?:false|undefined · onlyResolving:true).
    // The union-typed IMPLEMENTATION signature is intentionally NOT exported.
    assert.ok(
      overloads.length >= 2,
      `expected >=2 resolveOIVDomain overload declarations in dist/index.d.ts, got ${overloads.length}:\n${overloads.join('\n')}`,
    );
    // At least one overload returns the non-null Promise<OIVDomainResolution>.
    assert.ok(
      overloads.some((l) => /Promise<OIVDomainResolution>/.test(l) && !/\| null/.test(l)),
      `no non-null overload found:\n${overloads.join('\n')}`,
    );
    // The onlyResolving:true overload returns the nullable union.
    assert.ok(
      overloads.some(
        (l) => /onlyResolving:\s*true/.test(l) && /Promise<OIVDomainResolution \| null>/.test(l),
      ),
      `no onlyResolving:true → nullable overload found:\n${overloads.join('\n')}`,
    );
  });
});
