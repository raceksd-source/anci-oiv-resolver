# anci-oiv-resolver

> Canonical Chilean OIV registry name → domain resolver. Eliminates false-positive findings when running passive OSINT against the 915 organizations registered under Ley 21.663 (Marco Nacional de Ciberseguridad).

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-anci--oiv--resolver-red.svg)](https://www.npmjs.com/package/anci-oiv-resolver)
[![Coverage Gap](https://img.shields.io/badge/Coverage_Gap-structural-amber.svg)](#the-coverage-gap)
[![Domain Coverage](https://img.shields.io/badge/Domain_Coverage-915_OIVs_(100%25)-brightgreen.svg)](#the-solution)
[![DNS Verified](https://img.shields.io/badge/Layer--1_Verified-83.5%25_(v0.5.1)-brightgreen.svg)](#verification-semantics-v051)
[![Sectors Closed](https://img.shields.io/badge/Sectors_Closed-10_of_10-brightgreen.svg)](#the-solution)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![CFP](https://img.shields.io/badge/LASCON_2026-under_review-blue.svg)]()

[Versión en español](README.md)

## What are OIVs and why does this matter?

**Operadores de Importancia Vital (OIVs)** — literally "Operators of Vital Importance" — are organizations formally recognized by the Chilean State as **critical to national security**. Ley 21.663 (Marco Nacional de Ciberseguridad · 2024) designates 915 organizations under this category, including:

| Sector | Representative examples |
|--------|------------------------|
| **Banking/Finance** | BCI · BancoEstado · Santander · Banco de Chile · Santiago Stock Exchange |
| **Public health** | FONASA · Regional hospitals · Ministry of Health |
| **Private health** | Clínica Las Condes · Hospital Alemán · Clínica Indisa |
| **Energy** | Enel · ENAP · Colbún · AES Andes · CGE |
| **Telecommunications** | ENTEL · Movistar · VTR · WOM · GTD |
| **Water** | Aguas Andinas · ESSBIO · ESSAL · Aguas del Altiplano |
| **Transport** | Metro · LATAM Airlines · EFE (rail) · highway concessions |
| **Fuel** | COPEC · Shell · Gas Natural · Sonacol |
| **Government** | SII (tax authority) · ANCI · ONEMI · CMF · Civil Registry |
| **Digital infrastructure** | Sonda · Microsystem · critical IT vendors |

The **Agencia Nacional de Ciberseguridad (ANCI)** — Chile's national cybersecurity agency — supervises these organizations under the new law, imposing obligations for:
- Cyber risk management
- Incident notification within defined timeframes
- Periodic security audits
- Operational continuity planning

## Who is this resolver for?

This library is useful for:

- **Security researchers** who need to resolve canonical OIV domains before conducting passive OSINT research (primary use case)
- **Compliance consultants** advising OIVs on their obligations under Ley 21.663
- **Technology journalists** verifying organizational identities in cybersecurity or critical infrastructure investigations
- **Academics** studying the cybersecurity exposure gap in Chilean critical infrastructure
- **Incident response teams** correlating domains with OIVs during an active incident
- **Regulators and policy makers** auditing the effective coverage of the regulatory framework

If you work in any of these areas and have had to manually resolve "ANCI legal name → real domain," this tool automates that for **all 915 OIVs (100% of the universe)** with honest per-entry DNS verification status.

## Why we built this

During our research into Chile's responsible disclosure gap (the "Coverage Gap" — see companion paper), we found that **automated tools that infer domains from legal entity names fail systematically**. The registered OIV universe breaks down as follows:

```
915 OIVs registered under ANCI (Ley 21.663)
    │
    └── 915 catalogued — this tool (100% universe)
        ├── 10 sectors closed at 100%
        │   └── banking · telecoms · transport · water · state enterprises
        │       fuel · health · government admin · electricity
        │       digital infrastructure
        ├── ~80% with DNS-verified domains (A record confirmed)
        └── ~20% with honest status documented
            └── NXDOMAIN · email-only (MX only) · individual contractor · no public web
```

Those inference errors contaminate academic research datasets, deliver false reports to the wrong vendors, and undermine the credibility of any serious investigation into Chilean critical infrastructure.

`anci-oiv-resolver` provides a verified RUT → canonical domain mapping, eliminating those systematic false positives.

## El problema

De los **915 operadores de importancia vital (OIVs)** registrados bajo Ley 21.663, **una fracción mínima cuenta con canal verificable de contacto** para reportar una vulnerabilidad. La cobertura efectiva de attack surface público es limitada. **Esta es la primera capa estructural del Coverage Gap.**

La segunda capa: **la inferencia heurística "razón social → dominio" produce falsos positivos sistemáticos**. Por ejemplo:

| OIV (razón social ANCI) | Inferencia ingenua | Dominio real |
|---|---|---|
| BANCO DE CRÉDITO E INVERSIONES | bancodecrditoeinversiones.cl | **bci.cl** |
| BANCO DEL ESTADO DE CHILE | bancodelestadodechile.cl | **bancoestado.cl** |
| BANCO BICE | bancobice.cl | **bice.cl** |
| TELEFÓNICA CHILE S.A. | telefonicachile.cl | **movistar.cl** |
| EMPRESA NACIONAL DE TELECOMUNICACIONES | empresanacionaldetelecomunicaciones.cl | **entel.cl** |

Without a canonical resolver, any tool that scans OIVs in Chile will fire findings against domains that do not exist — generating noise that buries real attack surface.

## The solution

`anci-oiv-resolver` provides a RUT → domain mapping validated against DNS, covering **all 915 OIVs (100%)** of the official registry:

| Sector | Total | Layer-1 Verified (v0.5.1) | Status |
|--------|-------|-------------|--------|
| banca_finanzas | 34/34 | 34 (100%) | 100% closed ⭐ |
| telecomunicaciones | 29/29 | 24 (82.8%) | 100% closed ⭐ |
| transporte | 25/25 | 22 (88.0%) | 100% closed ⭐ |
| agua | 25/25 | 12 (48.0%) | 100% closed ⭐ |
| empresas_estado | 20/20 | 18 (90.0%) | 100% closed ⭐ |
| combustibles | 25/25 | 18 (72.0%) | 100% closed ⭐ |
| salud | 123/123 | 94 (76.4%) | 100% closed ⭐ |
| administracion_estado | 146/146 | 122 (83.6%) | 100% closed ⭐ |
| energia_electrica | 147/147 | 71 (48.3%) | 100% closed ⭐ |
| infraestructura_digital | 413/413 | 409 (99.0%) | 100% closed ⭐ v0.4.0 |
| **TOTAL** | **987 entries · 915 OIV universe** | **824 (83.5%)** | **100% universe** |

> **83.5% Layer-1 verified (A-record `live` or MX-only `mail_only`). 16.5% honestly documented**: NXDOMAIN · no records · individual contractors · no public web. No overclaim of technical coverage where it does not exist.

This dataset catalogues all 915 organizations formally designated as Operadores de Importancia Vital under Ley 21.663 (complete universe · 100% coverage). The Layer-1 verification rate is 83.5% as of v0.5.1, distributed as `live` (A or AAAA record) plus `mail_only` (no A but MX present, registered mail-only domain). The remainder is documented per-entry with its actual status. No overclaim of technical coverage where it does not exist.

With improved heuristic fallback (accent-normalize + stopword-strip + brand-override map) when a RUT is not in the table, and **multi-resolver fallback chain (OS → Cloudflare → Google → Quad9)** introduced in v0.5.1 so the same verification result is reproducible on hardened endpoints (DoH, NextDNS, corporate filters).

**915 OIVs catalogued · 100% ANCI universe · 83.5% Layer-1 verified · 10/10 sectors closed · passive OSINT · zero active scanning · v0.5.1**

## Verification semantics (v0.5.1)

Starting in v0.5.1 every catalog entry and every `verifyDomain()` return carries a distinguished `status`. The distinction matters because hardened-endpoint DNS (DoH, NextDNS, corporate filters) often misreports `NXDOMAIN` as `ESERVFAIL` and produces false negatives on perfectly live domains.

| Status | Meaning | Counts as Layer-1 verified |
|---|---|---|
| `live` | At least one A or AAAA record | ✓ Yes |
| `mail_only` | No A/AAAA but MX present (domain registered, mail-only) | ✓ Yes |
| `registered_no_a` | `ENODATA` from public resolvers (registered · no A/MX) | ✗ No |
| `nxdomain` | `ENOTFOUND` from public resolvers (domain does not exist) | ✗ No |
| `serverr` | Every resolver returned `ESERVFAIL` (cannot conclude) | ✗ No |
| `timeout` | Every resolver in the chain timed out | ✗ No |
| `unknown` | Chain exhausted with no canonical code | ✗ No |

`verifyDomain()` tries the OS resolver first (fast path) · on any non-authoritative failure it falls through **1.1.1.1 → 8.8.8.8 → 9.9.9.9**. Each result includes a `via` field that lets independent reviewers reproduce a finding against the same resolver chain.

## Quick start

```bash
npm install anci-oiv-resolver
```

```typescript
import { resolveOIVDomain } from 'anci-oiv-resolver';

// Table lookup — high confidence
const bci = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
// → { domain: 'bci.cl', source: 'known-domains', confidence: 1.0, verified: null }

// With DNS verification
const transbank = await resolveOIVDomain('96689310-9', 'TRANSBANK S.A.', { verify: true });
// → { domain: 'transbank.cl', source: 'known-domains', verified: true, mxRecords: ['10 mx.transbank.cl'] }

// Heuristic fallback for unknown RUTs
const unknown = await resolveOIVDomain('99000000-1', 'DISTRIBUIDORA GAS NORTE S.A.');
// → { domain: 'distribuidoragasnorte.cl', source: 'heuristic', confidence: 0.45, verified: null }
```

## API

### `resolveOIVDomain(rut, razonSocial, options?)`

Primary resolution function.

| Parameter | Type | Description |
|-----------|------|-------------|
| `rut` | `string` | Chilean RUT — accepts `"97006000-6"`, `"97.006.000-6"`, `"97006000-k"` |
| `razonSocial` | `string` | ANCI registry name — used for heuristic fallback |
| `options.verify` | `boolean` | If `true`, run DNS A/MX lookup (adds 50–300ms) |

Returns: `Promise<OIVDomainResolution>`

```typescript
interface OIVDomainResolution {
  domain: string;           // e.g. "bci.cl"
  source: 'known-domains' | 'heuristic';
  rut: string;              // normalized RUT
  razonSocial: string;
  sector: OIVSector;
  confidence: number;       // 0–1 (1.0 = table+verified, 0.45 = heuristic)
  verified: boolean | null; // null if verify not requested
  mxRecords: string[] | null;
}
```

### `resolveBatch(entries, options?)`

Resolve multiple OIVs in parallel.

```typescript
const results = await resolveBatch([
  { rut: '97006000-6', razonSocial: 'BANCO DE CRÉDITO E INVERSIONES' },
  { rut: '62000560-6', razonSocial: 'AGENCIA NACIONAL DE CIBERSEGURIDAD' },
], { verify: false });
```

### `getCoverageStats()`

Returns coverage statistics across sectors (useful for reporting).

```typescript
const stats = getCoverageStats();
// stats.total is the runtime catalog count (currently 987)
// → { total: 987, bySector: { banca_finanzas: { count: 34 }, combustibles: { count: 25 }, ... }, ... }
```

### `resolveBytable(rut)` / `heuristicInfer(razonSocial)` / `verifyDomain(domain)`

Low-level primitives exported for advanced usage. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## CLI

```bash
# Single lookup
npx tsx examples/cli-demo.ts 97006000-6

# With DNS verification
npx tsx examples/cli-demo.ts 96689310-9 "TRANSBANK S.A." --verify

# Coverage statistics
npx tsx examples/cli-demo.ts --stats
```

## The Coverage Gap

**915 OIVs registered. A small fraction have documented disclosure contacts or publicly mapped attack surface.**

This is the Coverage Gap: Chilean critical infrastructure operates largely invisible to the security research community, not because it is secure, but because the basic reconnaissance layer (domain mapping) has never been systematized.

This library is a first step toward closing that gap — one sector at a time.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for full methodology and responsible use guidelines.

## Contributing

Issues and PRs are welcomed. Most needed contributions:

- **Additional OIV domain entries** — verify with `dig +short A <domain>` before PR
- **Sectors currently underrepresented:** energía eléctrica, agua, transporte, combustibles, salud regional
- **Heuristic improvements** — edge cases where `inferDomainToken` fails
- **i18n** — English translation of heuristic stopword lists

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Citation

If you use this tool in research, please cite:

```bibtex
@misc{mellafe2026anci,
  author    = {Mellafe Zuvic, David},
  title     = {anci-oiv-resolver: Canonical Chilean OIV Domain Resolver},
  year      = {2026},
  publisher = {GitHub},
  howpublished = {\url{https://github.com/raceksd-source/anci-oiv-resolver}},
  note      = {Companion: "Coverage Gap in Chilean Critical Infrastructure Cybersecurity" (Zenodo DOI pending)}
}
```

Paper companion: *"Coverage Gap in Chilean Critical Infrastructure Cybersecurity"* (Zenodo DOI pending · arXiv cs.CR pending).

## Author

**David Mellafe Z.** · Independent Security Researcher · La Serena, Chile · [david@reizan.io](mailto:david@reizan.io)

## Acknowledgments

Built as part of ongoing passive research into Chilean OIV cybersecurity exposure under the Ley 21.663 framework. All data is derived from public sources (ANCI registry, NIC Chile, public DNS).

## License

Apache 2.0 — see [LICENSE](LICENSE).
