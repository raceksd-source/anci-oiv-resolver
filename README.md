# anci-oiv-resolver

> Resolver canónico de nombres del registro chileno de Operadores de Importancia Vital (OIV) a sus dominios reales. Elimina los falsos positivos sistemáticos en investigación pasiva OSINT contra las 915 organizaciones reconocidas bajo la Ley 21.663 (Marco Nacional de Ciberseguridad).

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/badge/npm-anci--oiv--resolver-red.svg)](https://www.npmjs.com/package/anci-oiv-resolver)
[![Coverage Gap](https://img.shields.io/badge/Coverage_Gap-1.3%25_contacto_verificable-orange.svg)](#el-coverage-gap)
[![Domain Coverage](https://img.shields.io/badge/Domain_Coverage-915_OIVs_mapped_(100%25)-brightgreen.svg)](#la-solución)
[![Sectors Closed](https://img.shields.io/badge/Sectors_Closed-10_de_10-brightgreen.svg)](#la-solución)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![CFP](https://img.shields.io/badge/LASCON_2026-en_evaluación-blue.svg)]()

[English README](README.en.md)

## ¿Qué son los OIVs y por qué importa?

Los **Operadores de Importancia Vital (OIVs)** son organizaciones reconocidas formalmente por el Estado de Chile como **críticas para la seguridad nacional**. La Ley 21.663 (Marco Nacional de Ciberseguridad · 2024) designa 915 organizaciones bajo esta categoría, incluyendo:

| Sector | Ejemplos representativos |
|--------|--------------------------|
| **Banca/Finanzas** | BCI · BancoEstado · Santander · Banco de Chile · Bolsa de Comercio |
| **Salud pública** | FONASA · Hospitales regionales · MINSAL |
| **Salud privada** | Clínica Las Condes · Hospital Alemán · Clínica Indisa |
| **Energía** | Enel · ENAP · Colbún · AES Andes · CGE |
| **Telecomunicaciones** | ENTEL · Movistar · VTR · WOM · GTD |
| **Agua** | Aguas Andinas · ESSBIO · ESSAL · Aguas del Altiplano |
| **Transporte** | Metro · LATAM · EFE · concesionarias de autopistas |
| **Combustibles** | COPEC · Shell · Gas Natural · Sonacol |
| **Gobierno** | SII · ANCI · ONEMI · CMF · Registro Civil |
| **Infraestructura digital** | Sonda · Microsystem · IT vendors críticos |

La **Agencia Nacional de Ciberseguridad (ANCI)** supervisa estas organizaciones bajo la nueva ley, estableciendo obligaciones de:
- Gestión de riesgo cibernético
- Notificación de incidentes en plazos definidos
- Auditorías de seguridad periódicas
- Planes de continuidad operacional

## ¿Para quién es este resolver?

Esta librería es útil para:

- **Investigadores de ciberseguridad** que necesitan resolver dominios canónicos de OIVs antes de hacer research pasivo OSINT (caso de uso primario)
- **Consultores de cumplimiento normativo** que asesoran OIVs en obligaciones bajo Ley 21.663
- **Periodistas tecnológicos** que verifican identidades organizacionales en investigaciones sobre ciberseguridad o infraestructura crítica
- **Académicos** que estudian la brecha de exposición cibernética en infraestructura crítica chilena
- **Equipos de respuesta a incidentes** que correlacionan dominios con OIVs durante un incidente activo
- **Reguladores y policy makers** que auditan la cobertura efectiva del marco normativo

Si trabajas en alguna de estas áreas y has tenido que resolver "razón social ANCI → dominio real" manualmente, este tool lo automatiza para las **915 OIVs (100% del universo)** con verificación DNS honesta.

## ¿Por qué construimos esto?

Durante la investigación de la brecha de divulgación responsable en Chile (el "Coverage Gap" · ver paper companion), encontramos que **las herramientas automáticas que infieren dominios desde razones sociales fallan sistemáticamente**. El universo de OIVs registrados se distribuye así:

```
915 OIVs registrados ANCI (Ley 21.663)
    │
    └── 915 catalogados — este tool (100% universo)
        ├── 10 sectores cerrados 100%
        │   └── banca · telecomunicaciones · transporte · agua · empresas_estado
        │       combustibles · salud · administración_estado · energía_eléctrica
        │       infraestructura_digital
        ├── ~80% con dominios DNS verificados (A record confirmado)
        └── ~20% con estado honesto documentado
            └── NXDOMAIN · email-only · individual contractor · sin web pública
```

Esos errores de inferencia contaminan datasets de research académico, llenan inboxes de vendors equivocados con reportes falsos, y minan la credibilidad de cualquier investigación seria sobre infraestructura crítica chilena.

`anci-oiv-resolver` provee un mapping verificado RUT → dominio canónico, eliminando esos falsos positivos sistemáticos.

## El problema

De los **915 Operadores de Importancia Vital (OIVs)** registrados formalmente bajo la Ley 21.663 (Marco Nacional de Ciberseguridad), solo el **1.3% tiene un canal de contacto verificable** para recibir un reporte de divulgación responsable. Solo el 3.5% tiene un attack surface map público. Solo el 2.8% cumple con las condiciones mínimas para iniciar un proceso de disclosure coordinado bajo ISO/IEC 29147.

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

`anci-oiv-resolver` provee un mapping **RUT → dominio canónico** validado vía DNS, cubriendo las **915 OIVs (100%)** del universo oficial:

| Sector | Total | Verificado | Estado |
|--------|-------|-----------|--------|
| banca_finanzas | 34/34 | 31/34 | 100% cerrado ⭐ |
| telecomunicaciones | 29/29 | 24/29 | 100% cerrado ⭐ |
| transporte | 25/25 | 21/25 | 100% cerrado ⭐ |
| agua | 25/25 | 9/25 | 100% cerrado ⭐ |
| empresas_estado | 20/20 | 16/20 | 100% cerrado ⭐ |
| combustibles | 25/25 | 22/25 | 100% cerrado ⭐ |
| salud | 111/111 | 86/111 | 100% cerrado ⭐ |
| administracion_estado | 155/155 | 114/155 | 100% cerrado ⭐ |
| energia_electrica | 147/147 | 60/147 | 100% cerrado ⭐ |
| infraestructura_digital | 413/413 | 410/413 | 100% cerrado ⭐ v0.4.0 |
| **TOTAL** | **915/915** | **~793/915** | **100% universo** |

> **~80% con dominios DNS verificados (A record). ~20% documentados honestamente**: NXDOMAIN · email-only (solo MX) · contratistas individuales sin web · compañías sin presencia pública. Sin sobreclaim de coverage técnico cuando no existe.

Con fallback heurístico mejorado (normalización de acentos + strip de sufijos legales + brand-override map) cuando el RUT no está en la tabla.

**915 OIVs catalogados · 100% universo ANCI · ~80% DNS-verificados · 10/10 sectores cerrados · OSINT pasivo · cero escaneo activo · v0.4.0**

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
// → { total: 995, bySector: { infraestructura_digital: { count: 416, dnsVerified: 410 }, banca_finanzas: { count: 34 }, salud: { count: 111 }, administracion_estado: { count: 155 }, energia_electrica: { count: 150 }, ... }, dnsVerified: 793, dnsUnverified: 202 }
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

**915 OIVs registrados. ~12 con contactos de disclosure documentados. ~32 con attack surface mapeado públicamente.**

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

- **v0.2.0 — PUBLICADO** — 367 entradas · 6 sectores cerrados al 100% · 40.4% cobertura universo
- **v0.3.0 — PUBLICADO** — 644 entradas · 9 sectores cerrados al 100% · 70.8% cobertura universo
- **v0.4.0 — PUBLICADO** — 915 OIVs catalogados · 100% universo ANCI · 10/10 sectores cerrados · ~80% DNS-verificados ⭐
- **Q3 2026** — v0.5.0 · CLI binary (`npx anci-oiv-resolver --rut X`) · reverse lookup · Zenodo DOI
- **Q3 2026** — LASCON 2026 Austin TX (CFP en evaluación)
- **Q4 2026** — Annual Report "State of OIV Cybersecurity Chile 2026"

## Autor

**David Mellafe Zuvic** · Investigador Independiente de Ciberseguridad · La Serena, Chile
[david@reizan.io](mailto:david@reizan.io) · [dmzs.dev/research](https://dmzs.dev/research)

## Reconocimientos

Construido como parte de investigación en curso sobre la exposición de ciberseguridad de los OIVs chilenos bajo el marco de la Ley 21.663. Todos los datos se derivan de fuentes públicas (registro ANCI, NIC Chile, DNS público).

## Licencia

Apache 2.0 — ver [LICENSE](LICENSE).
