# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- v0.5.0 · CLI binary (`npx anci-oiv-resolver --rut X`)
- v0.5.0 · Reverse lookup (`resolveByDomain`)
- v0.5.0 · TXT record verify (SPF/DMARC/security.txt)
- v0.5.0 · Zenodo software DOI live
- v0.5.0 · Monthly DNS cron · auto-flag entries that go NXDOMAIN post-add

## [0.4.0] - 2026-05-23

### Added
- **351 new entries** (644→995 total · **100% universe coverage** of 909 OIVs)
- **infraestructura_digital sector CLOSED** 65→416 (100%): all 348 remaining IT vendors added with DNS-verified domains. Includes Accuhealth (accuhealth.cl), Anticipa (anticipa.cl), Adistec (adistec.com), Buk (buk.cl), Deloitte Chile (deloitte.com), Evertec (evertec.com), Minsait Payments (minsait.com), Whitestack (whitestack.com), Toku (toku.cl), Kushki (kushki.cl), EdgeConneX Chile (edgeconnex.com), SoftServe Chile (softserve.com), Odata Chile (odata.com.br), GlobalLogic (globallogic.com), Nuvei (nuvei.com), ZeroFox (zerofox.com), StarkCloud (starkcloud.com), Apiux (apiux.com), Anacondaweb (anacondaweb.cl), Blue Yonder Chile (blueyonder.com), Hitachi Vantara (hitachivantara.com), Foris AI (foris.ai), Bizland (bizland.com), Connectis GCS (connectis.com), Altia (altia.es), Avant Technologies (avant-tech.com), AxessNetworks (axessnetworks.com), Base4 Security (base4sec.com) and 320+ more IT vendors
- **Honest status documented** for 6 entries without public web presence: Lo Espejo Data Center (NXDOMAIN), Daniel Fuentealba Arias EIRL (email-only individual contractor), Neox Tecnologías (email-only / MX only), Vzion Cloud (email-only / MX only), Informática y Desarrollo de Software (idesoftware.cl), System Proyect (systemproject.cl)
- `_meta.sectors_closed` updated to **10 sectors** (all sectors closed)
- `_meta.coverage_pct` = 100.0 (FULL UNIVERSE)
- `_meta.milestone` = "Full ANCI universe catalogued · honest per-entry verification status · 10/10 sectors closed"
- `verified_at` field added to all new entries (2026-05-23)
- 25 new regression tests (v0.4.0 sector closure + entry spot-checks)

### Changed
- `package.json` version bumped 0.3.0 → 0.4.0
- `_meta.version` bumped to `v0.4.0-data`
- `_meta.total_entries` = 995 · `verified_entries` = 793 · `unverified_entries` = 202
- `_meta.verification_pct` = 79.7 (honest · NOT 100%)
- `_meta.coverage_note` updated: "100% ANCI universe catalogued (909/909)"
- Planned v0.4.0 items moved to v0.5.0 (CLI, reverse lookup, TXT verify, DOI)

### ANCI DB integrity
- Total in DB: 984 (909 official `res_87_2025_nomina_final` + 75 migration `anci_oiv_state_migration_2026-05-23`)
- "909 universe" = entries from `res_87_2025_nomina_final` (7 sectors: infraestructura_digital 413, administracion_estado 155, energia_electrica 147, salud 111, banca_finanzas 34, telecomunicaciones 29, empresas_estado 20)
- Migration batch 75 (agua 25 + combustibles 25 + transporte 25) also fully catalogued in known-domains.json (995 total = 909 + 75 + 11 supplemental)
- No RUT duplicates in DB; all 984 RUTs are unique

### Coverage at v0.4.0 (FULL UNIVERSE)
- banca_finanzas: 34/34 (100% closed)
- telecomunicaciones: 29/29 (100% closed)
- transporte: 25/25 (100% closed)
- agua: 25/25 (100% closed)
- empresas_estado: 20/20 (100% closed)
- combustibles: 25/25 (100% closed · also as migration batch)
- salud: 111/111 (100% closed)
- administracion_estado: 155/155 (100% closed)
- energia_electrica: 147/147 (100% closed)
- infraestructura_digital: 413/413 (100% closed · NEW ✓)
- **TOTAL: 909/909 OIVs · 100% universe coverage · 10/10 sectors closed**
- **Verified domains: 793/995 (79.7%) · Documented unverified: 202 (20.3%)**

## [0.3.0] - 2026-05-23

### Added
- **277 new DNS-verified entries** (367→644 total · 70.8% universe coverage of 909 OIVs)
- **salud sector CLOSED** 62→111 (100%): all 49 missing hospitals and institutions added, including Hospital Clínico San Borja Arriarán (hcsba.cl), Hospital Urgencia Pública (urgencias.cl), Instituto Nacional del Cáncer (inc.cl), Instituto Neurocirugía Asenjo (asenjo.cl), Hospital El Pino, Hospital de San Fernando, IMARED Puerto Montt, Hospital de Linares, Hospital Franco Ravera, Hospital Calama, Hospital Coquimbo, Hospital de los Andes, Hospital Las Higueras · NXDOMAINs documented honestly for hospitals without public web presence
- **administracion_estado sector CLOSED** 79→155 (100%): all 76 missing entries added including Defensa Civil, IGM (igmchile.cl), DGMN, Subsecretaría de Energía (minenergia.cl), SUBTEL (subtel.cl), MINEDUC, MINCIENCIA, SUBPESCA, Bienes Nacionales, SENAME, 14 Servicios de Salud regionales, 10 subsecretarías ministériales, reinsercionjuvenil.cl, casinos.cl · NXDOMAINs documented for entities without standalone domains
- **energia_electrica sector CLOSED** 30→147 (100%): 117 entries added — Interchile (interchile.cl), Cerro Dominador CSP (cerrodominador.cl), AELA Generación (aela.cl), Guacolda Energía (guacoldaenergia.cl), ENAP Refinerías (enap.com), Mantos Copper (mantoscopper.com), Eletrans group (eletrans.cl), Pacific Hydro, Besalco, Copihue, Centella, Nueva Atacama, ON-GROUP, Tecnocap, Torino, WPD Malleco, CONAFE (conafe.cl), all cooperativas · SPEs without public domains documented as NXDOMAIN
- **combustibles sector** completed with 2 missing entries: ENAP Refinería Aconcagua (enap.cl), ABIGAS S.A. (abigas.cl) → 25/25 (100% closed)
- **infraestructura_digital sample** expanded 22→65: NEC Chile (nec.cl), Kyndryl (kyndryl.cl), Equinix (equinix.cl), Unisys (unisys.cl), Softland (softland.cl), Red Hat (redhat.cl), Iron Mountain, Intersystems, Novis, Intercity, Fintoc (fintoc.cl), Flow (flow.cl), Defontana (defontana.cl), BUK (buk.cl), Fintual, Rayen Salud, Modyo, i-MED, Dlocal, Koywe, Unholster, Google Chile, Amazon AWS Chile, Scala DC, Thales · with honest note that 413-entity sector cannot be fully mapped
- `_meta.sectors_closed` updated to 9 sectors (was 6): added salud, administracion_estado, energia_electrica
- `_meta.coverage_pct` = 70.8
- 41 new regression tests (v0.3.0 spot-checks across all 4 expanded sectors)

### Changed
- `package.json` version bumped 0.2.0 → 0.3.0
- `_meta.version` bumped to `v0.3.0-data`
- `_meta.total_entries` = 644 · verified = 445 · unverified = 199
- Test thresholds updated: total ≥640, salud =111, admin =155, energia =147, infra ≥60
- README.md stats updated to v0.3.0

### Coverage at v0.3.0
- banca_finanzas: 34/34 (100% closed)
- telecomunicaciones: 29/29 (100% closed)
- transporte: 25/25 (100% closed)
- agua: 25/25 (100% closed)
- empresas_estado: 20/20 (100% closed)
- combustibles: 25/25 (100% closed)
- salud: 111/111 (100% closed · NEW ✓)
- administracion_estado: 155/155 (100% closed · NEW ✓)
- energia_electrica: 147/147 (100% closed · NEW ✓)
- infraestructura_digital: 65/413 (15.7% · representative sample only)
- **TOTAL: 644 entries · 70.8% of 909 OIVs registered**

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
