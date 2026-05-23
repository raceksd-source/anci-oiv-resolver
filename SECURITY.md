# Security Policy

## Divulgación responsable (Responsible Disclosure)

Si encuentras vulnerabilidades en este tool, reporta **de forma privada** a:

- **Email:** david@reizan.io
- **Plazo de respuesta:** 7 días hábiles (alineado con ISO/IEC 29147:2018)
- **PGP key:** pendiente publicación

No publiques vulnerabilidades públicamente hasta coordinar el disclosure con el mantenedor. El objetivo es una divulgación coordinada que proteja a los usuarios actuales antes de la divulgación pública.

## Scope

Este repositorio contiene:

1. **Código TypeScript** del resolver (src/, test/, examples/)
2. **Datos estáticos** de mapping RUT → dominio (data/known-domains.json)
3. **Documentación** (docs/, README, CONTRIBUTING)

Las vulnerabilidades relevantes incluyen:
- Bugs que produzcan resoluciones incorrectas que podrían contaminar research de seguridad
- Problemas de seguridad en el cliente DNS pasivo (src/verify.ts)
- Data poisoning en known-domains.json (entradas incorrectas que pasen CI)

## Versiones soportadas

| Versión | Soporte |
|---------|---------|
| 0.1.x   | Activo |

## Marco legal aplicable

Esta herramienta opera bajo:

- **Ley 21.663** (Marco Nacional de Ciberseguridad, Chile) — marco de investigación OIV
- **Ley 21.459** (Delitos Informáticos, Chile) — protección de research de buena fe
- **DOJ Good Faith Security Research Framework** (2017) — no-malicious research

Esta herramienta realiza **exclusivamente consultas DNS pasivas** a registros públicos (A, AAAA, MX). No realiza ningún acceso activo a sistemas de terceros.

## Nota sobre el propósito de la herramienta

`anci-oiv-resolver` es una herramienta de **defensa y research académico**, no ofensiva. Su propósito es eliminar falsos positivos en investigación de seguridad pasiva, mejorando la calidad del research sobre infraestructura crítica chilena bajo el marco legal vigente.

Si tienes dudas sobre el uso apropiado de esta herramienta, consulta [docs/METHODOLOGY.md](docs/METHODOLOGY.md).
