# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- v0.3.0 · CLI binary (`npx anci-oiv-resolver --rut X`)
- v0.3.0 · Reverse lookup (`resolveByDomain`)
- v0.3.0 · TXT record verify (SPF/DMARC/security.txt)
- v0.3.0 · Zenodo software DOI live
- Continue to 500+ entries · 55% universe coverage (Q3 2026)

## [0.2.0] - 2026-05-23

### Added
- 196 new DNS-verified entries (171→367 total · 40.4% universe coverage of 909 OIVs)
- **combustibles sector activated** from 0 entries → 25/25 (100% closed · NEW sector)
  - COPEC, Shell Chile, Abastible, Lipigas, Gasco, Metrogas, SONACOL, GNL Chile, Terpel, Primax, Oxiquim, Gas Andes, Gas Natural Fenosa, Intergas, Gas Sur, Gasvalpo, ENAMI, Abigas, Antuco Energía, Compañía Almacenamiento COPEC, Quintero GNL, and gas distributors
- **telecomunicaciones** closed at 29/29 (100%): added CTR Chile Networks, Gallyas Telecom, Mi Internet, STEL Chile, plus NXDOMAIN-documented: DB Terra, Intersur, Pacífico Cable, CTRURAL, WILL
- **transporte** closed at 25/25 (100%): added DGAC, EFE (transporte RUT), Empresa Portuaria Chile, Empresa Portuaria Austral, Puerto Chacabuco, Puerto Montt, Sociedad Concesionaria Aeropuerto Santiago
- **agua** closed at 25/25 (100%): added Acciona Agua, Aguas Cordillera, all regional ESSAM/ESANT/ESIQSA/ESSAR/ESAYSEN/ESSOH/ESSBIO/ESSAL utilities (NXDOMAIN documented where applicable)
- **empresas_estado** closed at 20/20 (100%): added Casa de Moneda, Fondo de Infraestructura, SASIPA, ENAP (empresas_estado), all Empresa Portuaria subsidiaries (dual-sector coverage)
- **salud** expanded 32→65 (59%): added 14 regional Servicios de Salud, 8 new private clinics (BioBio, Puerto Varas, Puerto Montt, Cordillera, Miraflores, UC Christus, IntegraMédica, InversaLud), 6 public hospitals (Fricke, Antofagasta, El Carmen, Osorno, Padre Hurtado, San Juan de Dios)
- **administracion_estado** expanded 44→92 (59%): added 17 ministerial subsecretarías (Interior, Economía, Vivienda, Medio Ambiente, Justicia, Defensa, SUBDERE, SUBREI, SEGPRES, MSGG, Salud Pública, Educación, Seguridad Pública), 4 superintendencias (Salud, Electricidad, Pensiones, Seguridad Social, Educación, Servicios Sanitarios), military hospitals (Naval, FACH), SHOA, CAJ judicial corporations, DefensoríaNiñez, DefContrb, FIDAE, ODEPA, JUNAEB, JUNJI
- **energia_electrica** expanded 7→30 (20%): added ENEL Distribución, ENEL Generación, ENEL Green Power, Transelec, CEN Coordinador, SAESA/Frontel/LuzOsorno group, Collahuasi, Anglo American, Pelambres, Engie, Barrick, Pacific Hydro, ENAEX, SQM, Codelco (updated to .cl), CGE Transmisión, Codiner
- **infraestructura_digital** sample expanded 0→22: SONDA (2 entities), Accenture, IBM, Microsoft, HP, NTT Data (2), Transtecnia, Arkavia Networks, Ascenty, Acepta.com, Altavoz, Microsystem, Indra, SoftwareOne, GlobalConexus, Entelgy, TCS, Oracle (2 entities), Coasin (NXDOMAIN documented)
- `_meta.sectors_closed` array field documenting 6 fully-closed sectors
- `_meta.verified_entries` and `_meta.unverified_entries` fields for transparency

### Changed
- README.md and README.en.md stats updated to 367 entries · 40.4% coverage
- `_meta.version` bumped to `v0.2.0-data`
- Tests expanded: 14 new sector-specific assertions · coverage thresholds updated to v0.2.0 targets
- Honest framing throughout: all NXDOMAIN entries documented with `verified: false` and `_note` field

### Coverage at v0.2.0
- banca_finanzas: 34/34 (100% closed)
- telecomunicaciones: 29/29 (100% closed)
- transporte: 25/25 (100% closed)
- agua: 25/25 (100% closed)
- empresas_estado: 20/20 (100% closed)
- combustibles: 25/25 (100% closed · NEW)
- administracion_estado: 92/155 (59%)
- salud: 65/111 (59%)
- energia_electrica: 30/147 (20%)
- infraestructura_digital: 22/413 (5% · representative sample)
- **TOTAL: 367 entries · 40.4% of 909 OIVs registered**

## [0.1.1] - 2026-05-23

### Fixed
- Resolver mapping bug · `cmf.cl` (CMF Industrial plastics company) was incorrectly mapped to Comisión para el Mercado Financiero. Correct canonical domain is `cmfchile.cl`. DNS verified: A record 152.230.198.86 · cert `O=Comision para el Mercado Financiero CN=www.cmfchile.cl` (DigiCert EV). Per Opus #157 zero-day audit.

### Changed
- `_meta.version` bumped to `v0.1.1-data` in known-domains.json

## [0.1.0] - 2026-05-23

### Added
- Initial public release
- `resolveOIVDomain(rut, razonSocial, options?)` · public API
- `resolveBatch(targets, options?)` · concurrent batch resolution
- `getCoverageStats()` · sector coverage statistics
- Known-domains table · 171 entries · DNS-verified passive
- Heuristic fallback con accent-normalize + suffix-strip + brand overrides
- DNS verification (A, AAAA, MX records) · passive only
- TypeScript strict types · ESM-only module
- 63 unit tests · CI matrix Node 18/20/22
- Apache 2.0 LICENSE
- ISO/IEC 29147 alignment · passive OSINT only
- Spanish README primary · audiencia chilena
- English README secondary
- CITATION.cff · GitHub "Cite this repository" sidebar
- CONTRIBUTING.md Spanish guidelines
- SECURITY.md responsible disclosure path

### Coverage at release
- banca_finanzas: 34/34 (100% sector closed)
- administracion_estado: 44/155 (28%)
- salud: 32/111 (29%)
- transporte: 18 (NEW sector activated)
- agua: 10 (NEW sector activated)
- telecomunicaciones: 20/29 (69%)
- empresas_estado: 6/20
- **TOTAL: 171 entries · 18.8% of 909 OIVs registered**

[Unreleased]: https://github.com/raceksd-source/anci-oiv-resolver/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/raceksd-source/anci-oiv-resolver/releases/tag/v0.1.0
