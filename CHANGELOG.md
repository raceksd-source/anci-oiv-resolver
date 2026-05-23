# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- v0.2.0 · CLI binary (`npx anci-oiv-resolver --rut X`)
- v0.2.0 · Reverse lookup (`resolveByDomain`)
- v0.2.0 · TXT record verify (SPF/DMARC/security.txt)
- v0.2.0 · Zenodo software DOI live

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
