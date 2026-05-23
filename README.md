# anci-oiv-resolver

> Canonical Chilean OIV registry name → domain resolver. Eliminates false-positive findings when running passive OSINT against the 909 organizations registered under Ley 21.663 (Marco Nacional de Ciberseguridad).

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-anci--oiv--resolver-red.svg)](https://www.npmjs.com/package/anci-oiv-resolver)
[![Coverage Gap](https://img.shields.io/badge/Coverage_Gap-1.3%25_contact-amber.svg)](#the-coverage-gap)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)

## El problema

De los **909 operadores de importancia vital (OIVs)** registrados bajo Ley 21.663, solo el **1.3% tiene canal de contacto verificable** para reportar una vulnerabilidad. Solo el 3.5% tiene attack surface mapeado públicamente. **Esta es la primera capa estructural del Coverage Gap.**

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

`anci-oiv-resolver` provides a RUT → domain mapping validated against DNS, covering:

- **21** of 34 banca/finanzas OIVs (62%)
- **20** of 29 telecomunicaciones OIVs (69%)
- **22** of 111 salud OIVs (top hospitals + mutual systems)
- **24** of 155 administracion_estado OIVs (key agencies)
- **3** of 20 empresas_estado OIVs (Metro, EFE, Correos)
- **7** of 147 energia_electrica OIVs (top generators)

With improved heuristic fallback (accent-normalize + stopword-strip + brand-override map) for the remaining 832 OIVs not in the table.

**77 total entries · 100% passive OSINT · zero active scanning**

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
// → { total: 77, bySector: { banca_finanzas: { count: 21, dnsVerified: 18 }, ... }, ... }
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

**909 OIVs registered. ~12 with documented disclosure contacts. ~32 with any public attack surface mapping.**

This is the Coverage Gap: Chilean critical infrastructure operates largely invisible to the security research community, not because it is secure, but because the basic reconnaissance layer (domain mapping) has never been systematized.

This library is a first step toward closing that gap — one sector at a time.

See [docs/METHODOLOGY.md](docs/METHODOLOGY.md) for full methodology and responsible use guidelines.

## Contributing

Issues and PRs are welcomed. Most needed contributions:

- **Additional OIV domain entries** — verify with `dig +short A <domain>` before PR
- **Sectors currently underrepresented:** energía eléctrica, agua, transporte, combustibles, salud regional
- **Heuristic improvements** — edge cases where inferDomainToken fails
- **i18n** — English translation of heuristic stopword lists

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for table format and extension points.

## Citation

If you use this tool in research, please cite:

```bibtex
@misc{mellafe2026anci,
  author    = {Mellafe Zuvic, David},
  title     = {anci-oiv-resolver: Canonical Chilean OIV Domain Resolver},
  year      = {2026},
  publisher = {GitHub},
  howpublished = {\url{https://github.com/david-mellafe-z/anci-oiv-resolver}},
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
