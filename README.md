# anci-oiv-resolver

> Resolver canónico de nombres del registro chileno de Operadores de Importancia Vital (OIV) a sus dominios reales. Elimina los falsos positivos sistemáticos en investigación pasiva OSINT contra las 909 organizaciones reconocidas bajo la Ley 21.663 (Marco Nacional de Ciberseguridad).

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-anci--oiv--resolver-red.svg)](https://www.npmjs.com/package/anci-oiv-resolver)
[![Coverage Gap](https://img.shields.io/badge/Coverage_Gap-1.3%25_contacto_verificable-orange.svg)](#el-coverage-gap)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![CFP](https://img.shields.io/badge/LASCON_2026-en_evaluación-blue.svg)]()

[English README](README.en.md)

## El problema

De los **909 Operadores de Importancia Vital (OIVs)** registrados formalmente bajo la Ley 21.663 (Marco Nacional de Ciberseguridad), solo el **1.3% tiene un canal de contacto verificable** para recibir un reporte de divulgación responsable. Solo el 3.5% tiene un attack surface map público. Solo el 2.8% cumple con las condiciones mínimas para iniciar un proceso de disclosure coordinado bajo ISO/IEC 29147.

Esta es la **primera capa estructural del Coverage Gap chileno**.

La **segunda capa** es más sutil pero igualmente sistemática: las herramientas de research pasivo que infieren "razón social → dominio" mediante heurísticas ingenuas generan falsos positivos masivos:

| OIV (razón social ANCI) | Inferencia ingenua | Dominio real |
|---|---|---|
| BANCO DE CRÉDITO E INVERSIONES | `bancodecrditoeinversiones.cl` ❌ | **bci.cl** ✓ |
| BANCO DEL ESTADO DE CHILE | `bancodelestadodechile.cl` ❌ | **bancoestado.cl** ✓ |
| BANCO BICE | `bancobice.cl` ❌ | **bice.cl** ✓ |
| TELEFÓNICA CHILE S.A. | `telefonicachile.cl` ❌ | **movistar.cl** ✓ |
| EMPRESA NACIONAL DE TELECOMUNICACIONES | `empresanacionaldetelecomunicaciones.cl` ❌ | **entel.cl** ✓ |

Sin un resolver canónico, cualquier herramienta que escanee OIVs chilenos genera findings sobre dominios que no existen, contaminando reportes a vendors, perdiendo credibilidad de research, y polucionando datasets académicos.

## La solución

`anci-oiv-resolver` provee un mapping **RUT → dominio canónico** validado vía DNS, cubriendo 77 entradas iniciales en sectores prioritarios:

- **21 de 34** banca/finanzas OIVs (62%)
- **20 de 29** telecomunicaciones OIVs (69%)
- **22 de 111** salud OIVs (top hospitales + mutuales)
- **24 de 155** administración_estado OIVs (agencias clave)
- **3 de 20** empresas_estado OIVs (Metro, EFE, Correos)
- **7 de 147** energía eléctrica OIVs (principales generadoras)

Con fallback heurístico mejorado (normalización de acentos + strip de sufijos legales + brand-override map) cuando el RUT no está en la tabla.

**77 entradas totales · 100% OSINT pasivo · cero escaneo activo**

## Instalación rápida

```bash
npm install anci-oiv-resolver
```

## Uso

```typescript
import { resolveOIVDomain } from 'anci-oiv-resolver';

// Lookup por tabla — alta confianza
const bci = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
// → { domain: 'bci.cl', source: 'known-domains', confidence: 1.0, verified: null }

// Con verificación DNS
const transbank = await resolveOIVDomain('96689310-9', 'TRANSBANK S.A.', { verify: true });
// → { domain: 'transbank.cl', source: 'known-domains', verified: true, mxRecords: ['10 mx.transbank.cl'] }

// Fallback heurístico para RUTs sin tabla
const unknown = await resolveOIVDomain('99000000-1', 'DISTRIBUIDORA GAS NORTE S.A.');
// → { domain: 'distribuidoragasnorte.cl', source: 'heuristic', confidence: 0.45, verified: null }
```

### Resolución masiva (batch)

```typescript
import { resolveBatch } from 'anci-oiv-resolver';

const oivs = [
  { rut: '97006000-6', razonSocial: 'BANCO DE CRÉDITO E INVERSIONES' },
  { rut: '97030000-7', razonSocial: 'BANCO DEL ESTADO DE CHILE' },
  { rut: '62000560-6', razonSocial: 'AGENCIA NACIONAL DE CIBERSEGURIDAD' },
];

const resolved = await resolveBatch(oivs, { verify: true });
```

### Estadísticas de cobertura

```typescript
import { getCoverageStats } from 'anci-oiv-resolver';

const stats = getCoverageStats();
// → { total: 77, bySector: { banca_finanzas: { count: 21, dnsVerified: 18 }, ... } }
```

### CLI demo

```bash
# Lookup individual
npx tsx examples/cli-demo.ts 97006000-6

# Con verificación DNS
npx tsx examples/cli-demo.ts 96689310-9 "TRANSBANK S.A." --verify

# Estadísticas de cobertura
npx tsx examples/cli-demo.ts --stats
```

## API completa

### `resolveOIVDomain(rut, razonSocial, options?)`

Función principal de resolución.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `rut` | `string` | RUT chileno — acepta `"97006000-6"`, `"97.006.000-6"`, `"97006000-k"` |
| `razonSocial` | `string` | Nombre del registro ANCI — usado para fallback heurístico |
| `options.verify` | `boolean` | Si `true`, ejecuta DNS A/MX lookup (agrega 50–300ms) |

Retorna: `Promise<OIVDomainResolution>`

```typescript
interface OIVDomainResolution {
  domain: string;           // ej: "bci.cl"
  source: 'known-domains' | 'heuristic';
  rut: string;              // RUT normalizado
  razonSocial: string;
  sector: OIVSector;
  confidence: number;       // 0–1 (1.0 = tabla+verificado, 0.45 = heurístico)
  verified: boolean | null; // null si verify no fue solicitado
  mxRecords: string[] | null;
}
```

### Primitivas de bajo nivel

`resolveBytable(rut)` / `heuristicInfer(razonSocial)` / `verifyDomain(domain)` / `batchVerify(domains)`

Exportadas para uso avanzado. Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## El Coverage Gap

**909 OIVs registrados. ~12 con contactos de disclosure documentados. ~32 con attack surface mapeado públicamente.**

Este es el Coverage Gap: la infraestructura crítica chilena opera en gran medida invisible para la comunidad de investigación de seguridad, no porque sea segura, sino porque la capa básica de reconocimiento (mapeo de dominios) nunca ha sido sistematizada.

Esta librería es el primer paso para cerrar esa brecha, sector a sector.

Ver [docs/METHODOLOGY.md](docs/METHODOLOGY.md) para metodología completa y lineamientos de uso responsable.

## Contexto legal y ético

Este resolver opera bajo el marco de **investigación pasiva OSINT**, alineado con:

- **Ley 21.663** (Marco Nacional de Ciberseguridad de Chile) — designación oficial de OIVs vía ANCI
- **Ley 21.459** (Delitos Informáticos) — protección de research de buena fe que no involucra acceso no autorizado
- **ISO/IEC 29147:2018** — divulgación coordinada de vulnerabilidades
- **DOJ Good Faith Security Research Framework** (2017) — research no malicioso

Esta herramienta **no realiza ningún acceso no autorizado a sistemas**. Solo consulta DNS público (registros A, AAAA, MX) y mantiene una tabla de mapping verificada manualmente desde fuentes públicas (registro ANCI, NIC Chile, DNS público).

## Investigación companion

Este tool acompaña al working paper:

> **"Coverage Gap in Chilean Critical Infrastructure Cybersecurity: An Automated OSINT Assessment"** (Mellafe, 2026)
> Zenodo DOI: pendiente publicación W2 jun 2026
> arXiv: cs.CR pendiente W4 jun 2026

Ver [dmzs.dev/research](https://dmzs.dev/research) para el research home y publicaciones relacionadas.

## Citación académica

Si usas esta herramienta en investigación, por favor cita:

```bibtex
@misc{mellafe2026anci,
  author       = {Mellafe Zuvic, David},
  title        = {anci-oiv-resolver: Canonical Chilean OIV Domain Resolver},
  year         = {2026},
  publisher    = {GitHub},
  version      = {v0.1.0},
  howpublished = {\url{https://github.com/raceksd-source/anci-oiv-resolver}},
  note         = {Companion paper: "Coverage Gap in Chilean Critical Infrastructure Cybersecurity" (Zenodo DOI pending)}
}
```

## Contribuir

Issues y PRs bienvenidos. Especialmente necesarios:

- **Entradas de dominios adicionales** — verificar con `dig +short A <dominio>` antes del PR
- **Sectores subrepresentados**: agua, transporte, combustibles, salud regional, gobierno municipal
- **Bug fixes en heurística** — especialmente nombres con acentos o sufijos legales no estándar
- **i18n** — traducción de stopword lists al inglés para soporte no-español

Lee [CONTRIBUTING.md](CONTRIBUTING.md) para guidelines completos.

## Roadmap público

- **Q3 2026** — 200+ entradas · cobertura agua + transporte + combustibles
- **Q3 2026** — npm publish oficial + Zenodo DOI software release
- **Q3 2026** — LASCON 2026 Austin TX (CFP en evaluación)
- **Q4 2026** — Annual Report "State of OIV Cybersecurity Chile 2026"

## Autor

**David Mellafe Zuvic** · Investigador Independiente de Ciberseguridad · La Serena, Chile
[david@reizan.io](mailto:david@reizan.io) · [dmzs.dev/research](https://dmzs.dev/research)

## Reconocimientos

Construido como parte de investigación en curso sobre la exposición de ciberseguridad de los OIVs chilenos bajo el marco de la Ley 21.663. Todos los datos se derivan de fuentes públicas (registro ANCI, NIC Chile, DNS público).

## Licencia

Apache 2.0 — ver [LICENSE](LICENSE).
