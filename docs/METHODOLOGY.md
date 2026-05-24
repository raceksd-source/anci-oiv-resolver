# Methodology

## Scope

This library implements passive domain resolution for Chilean Operadores de Importancia Vital (OIVs) registered under Ley 21.663 (Marco Nacional de Ciberseguridad de Chile, 2023). The registry published by ANCI (Agencia Nacional de Ciberseguridad) lists approximately 915 organizations across eleven critical infrastructure sectors.

## Passive OSINT Principle

All resolution is performed using **passive techniques only**:

- Forward DNS queries (A, AAAA, MX record lookups)
- No port scanning
- No HTTP/HTTPS requests
- No banner grabbing
- No web crawling
- No active fingerprinting

This approach is consistent with the ISO/IEC 29147:2018 framework for vulnerability disclosure and reconnaissance methodology.

## Resolution Pipeline

### Stage 1: RUT table lookup

The primary resolution method uses a curated JSON table mapping Chilean RUT (Rol Único Tributario) identifiers to canonical web domains. RUTs are normalized before lookup (dots removed, uppercase verifier digit).

The table was assembled by:
1. Extracting the ANCI OIV public registry
2. For each organization, performing passive domain research (WHOIS, DNS, public corporate communications)
3. Verifying DNS A record existence with `dig +short A <domain>`
4. Cross-referencing with official Chilean government domain registries (NIC Chile)

**Confidence: 0.85–1.0** depending on `dns_verified` status.

### Stage 2: Heuristic inference

For RUTs not in the table, the library falls back to string-based inference:

1. Check brand override map (handles 30+ well-known abbreviation cases)
2. Strip legal entity suffixes (S.A., SPA, LTDA, etc.)
3. Remove Spanish stopwords (de, del, la, y, etc.)
4. Normalize accented characters (á→a, é→e, ñ→n, etc.)
5. Concatenate remaining tokens into a slug
6. Apply TLD inference (`.gob.cl` for known government patterns, `.cl` default)

**Confidence: ~0.45** — always pair with `verify: true` in production.

## Known False-Positive Patterns

The heuristic commonly produces incorrect results for:

| Pattern | Example (wrong) | Correct |
|---------|-----------------|---------|
| Bank acronyms | bancodecrditoeinversiones.cl | bci.cl |
| International parent brands | movistar vs telefonica | movistar.cl |
| Short brand names | bice vs bancobice | bice.cl |
| `.com` vs `.cl` TLD | codelco.cl | codelco.com |
| Shared domains (subsidiaries) | entelpcstellefonica.cl | entel.cl |

The known-domains table handles all documented cases above.

## Coverage Gap Context

ANCI registered 915 OIVs as of May 2025. The Coverage Gap refers to the structural challenge that:

- Only ~1.3% of OIVs have a documented vulnerability disclosure contact
- Only ~3.5% have any public attack surface mapping
- Domain-to-RUT mapping is a prerequisite for systematic passive reconnaissance

This library addresses the domain-mapping prerequisite, enabling downstream tooling to run passive OSINT without generating false-positive findings against non-existent domains.

## Responsible Use

This library is intended for:
- Security researchers performing authorized passive reconnaissance
- Organizations conducting their own attack surface assessments
- Academic research on Chilean critical infrastructure cybersecurity

It is **not** intended for unauthorized scanning, enumeration of protected systems, or any activity prohibited under the Chilean Código Penal or Ley 21.459 (Delitos Informáticos).

## References

- Ley 21.663 — Marco Nacional de Ciberseguridad (2023)
- ANCI OIV Registry — https://anci.gob.cl
- ISO/IEC 29147:2018 — Information technology — Security techniques — Vulnerability disclosure
- NIC Chile — https://www.nic.cl
