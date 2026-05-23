# Contributing to anci-oiv-resolver

Thank you for your interest in improving Chilean OIV coverage. The most impactful contributions are verified domain entries for underrepresented sectors.

[Versión en español](CONTRIBUTING.md)

## Adding domain entries

This is the highest-value contribution type. Before opening a PR:

**1. Verify the real domain via public DNS:**

```bash
dig +short A <domain>
dig +short MX <domain>
```

If `dig +short A bci.cl` returns an IP, the domain exists and is valid. If it returns empty, do not open a PR.

**2. Edit `data/known-domains.json`** adding the entry with the format:

```json
"97030000-7": {
  "domain": "bancoestado.cl",
  "razon_social": "BANCO DEL ESTADO DE CHILE",
  "sector": "banca_finanzas",
  "source_note": "Verified via dig 2026-05-23"
}
```

**3. Add test case in `test/known-domains.test.ts`:**

```typescript
assert.strictEqual(
  resolveBytable('97030000-7')?.domain,
  'bancoestado.cl',
  'Banco Estado lookup'
);
```

**4. Run the test suite:**

```bash
npm run test:no-dns
```

All existing tests must continue to pass.

**5. Open a PR** with title: `feat(domains): add <OIV name>`

Include in description:
- Output of `dig +short A <domain>`
- RUT source (public ANCI registry)
- Sector per Ley 21.663 classification

## Sectors most in need of coverage

By priority:

| Sector | Total OIVs | Current coverage | Gap |
|--------|-----------|-----------------|-----|
| Salud (regional hospitals) | 111 | 22 | 89 |
| Administración del Estado | 155 | 24 | 131 |
| Energía eléctrica | 147 | 7 | 140 |
| Agua potable y saneamiento | ~45 | 0 | ~45 |
| Transporte | ~30 | 0 | ~30 |
| Combustibles | ~20 | 0 | ~20 |

## Reporting bugs

Use the `domain_submission` issue template for incorrect domains, or `bug_report` for code errors.

For domain bugs, include:
- Exact OIV razón social (as it appears in ANCI registry)
- RUT
- Inferred domain (current tool output)
- Expected real domain
- Verbatim output of `npx tsx examples/cli-demo.ts <RUT> --verify`

## Heuristic improvements

The heuristic fallback lives in `src/heuristic.ts`. The most problematic cases are:

- Organizations with brands completely different from their legal name (e.g. Telefónica → movistar)
- Names with accents or special characters not covered by `normalizeAccents`
- Regional legal suffixes not included in the strip list

To propose improvements: PR with failing test case + fix + edge case explanation.

## Code style

- TypeScript strict (existing `tsconfig.json`)
- ESLint clean (`npm run lint`)
- Conventional commits: `feat` / `fix` / `docs` / `test` / `refactor`
- 100% test coverage for new code

## Review timeline

Domain PRs: reviewed within 48-72 business hours.
Code PRs: reviewed within 7 days.

If no response within 2 weeks, mention me in the issue.

## Code of conduct

- Defensive, good-faith security research only
- Do not publish exploits or active vulnerability information in this repo
- Responsible disclosure: report to [david@reizan.io](mailto:david@reizan.io) before publishing findings
- Respect Apache 2.0 license in derivative works
