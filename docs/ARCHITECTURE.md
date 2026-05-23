# Architecture

## Module Overview

```
src/
├── index.ts        — Public API surface (resolveOIVDomain, resolveBatch, re-exports)
├── types.ts        — TypeScript interfaces (OIVDomainResolution, VerifyResult, etc.)
├── known-domains.ts — Table loader + RUT lookup (singleton, lazy-loaded)
├── heuristic.ts    — String-based domain inference (no I/O)
└── verify.ts       — DNS verification (A, AAAA, MX lookups)
```

## Data Flow

```
resolveOIVDomain(rut, razonSocial, options)
        │
        ▼
  resolveBytable(rut)
        │
        ├── HIT ──────────────────────────────────┐
        │                                         │
        └── MISS ──► heuristicInfer(razonSocial) ─┤
                                                  │
                                                  ▼
                                    options.verify?
                                         │
                           ┌────────────┼────────────┐
                           │ YES        │             │ NO
                           ▼            │             ▼
                    verifyDomain()      │    return { verified: null }
                           │            │
                           ▼            │
                  return { verified,    │
                           mxRecords }──┘
```

## Key Design Decisions

### ESM-only

The package uses `"type": "module"` and `NodeNext` module resolution. This ensures clean `.js` extension imports are preserved in compiled output and avoids dual CJS/ESM complexity.

### Lazy table loading

The known-domains JSON is loaded once on first access via a module-level singleton pattern. This avoids repeated file I/O and makes the table effectively immutable at runtime.

### Immutable resolution

`resolveOIVDomain` never mutates input data. Each call returns a fresh `OIVDomainResolution` object. This makes the library safe to use in concurrent workflows.

### Confidence scoring

- `1.0` — table entry with `dns_verified: true` (DNS A record confirmed)
- `0.85` — table entry with `dns_verified: false` (domain inferred, not verified)
- `0.45` — heuristic fallback (no table entry)
- `0.0` — error during resolution (domain empty string)

### DNS verification is opt-in

Network I/O is only performed when `options.verify: true` is passed. This allows the library to be used in offline or high-throughput contexts without incurring DNS latency for every lookup.

### batchVerify concurrency control

`batchVerify` takes a `concurrency` parameter (default: 5) to avoid overwhelming DNS resolvers when processing large OIV lists.

## Extension Points

To add new entries to the known-domains table:

1. Verify the domain with `dig +short A <domain>` and `dig +short MX <domain>`
2. Add the entry to `data/known-domains.json` with the correct RUT as key
3. Set `dns_verified: true` if A record resolved, `false` otherwise
4. Open a PR with evidence (dig output screenshot or plain text)

To add a new sector:

1. Add sector string to `OIVSector` type in `src/types.ts`
2. Add entries to `data/known-domains.json` with the new sector value
3. Add TLD inference rule in `heuristic.ts` `inferTld()` if sector has predictable TLD patterns

## Thread Safety

This library is safe for use in concurrent Node.js contexts. The singleton table is initialized synchronously (via `JSON.parse` on module load) and never written after initialization.
