# Security Policy

## Divulgación responsable (Responsible Disclosure)

Si encuentras una vulnerabilidad en este tool, repórtala **de forma privada** vía:

- **Email:** `david@reizan.io`
- **PGP key:** publicado en [keys.openpgp.org](https://keys.openpgp.org/search?q=david%40reizan.io) (fingerprint anunciado en release notes v0.5.0)
- **Asunto sugerido:** `[SECURITY] anci-oiv-resolver — <descripción breve>`

**No publiques** la vulnerabilidad de forma pública hasta coordinar el disclosure con el mantenedor.

### Información a incluir
- Descripción clara de la vulnerabilidad
- Pasos de reproducción (proof of concept)
- Impacto potencial para usuarios del paquete
- Tu nombre/handle para crédito (opcional · reportes anónimos aceptados)

### Plazos de respuesta (ISO/IEC 29147:2018)

| Etapa | Plazo |
|---|---|
| Acuse de recibo | **≤ 72 horas** |
| Evaluación inicial + triage | **≤ 7 días** |
| Desarrollo del parche | **≤ 30 días** (depende de severidad) |
| Disclosure público coordinado | **≤ 90 días desde el reporte** |

Vulnerabilidades críticas (CVSS ≥ 9.0) pueden ser parchadas en plazos acelerados con notificación privada a consumidores conocidos.

## Scope

### En scope
- Paquete `anci-oiv-resolver` (todas las versiones publicadas)
- Precisión del dataset de OIVs (mappings de dominio incorrectos, entradas faltantes)
- Integridad del pipeline build/CI
- Vectores de supply chain (dependency confusion, typosquats)
- Cliente DNS pasivo (`src/verify.ts`)
- Data poisoning en `data/known-domains.json` (entradas incorrectas que pasen CI)

### Fuera de scope
- Vulnerabilidades en servicios externos referenciados (ej: infraestructura npmjs.com)
- Social engineering contra el mantenedor
- DoS por agotamiento del verificador DNS (usa `SKIP_LIVE_DNS=1`)

## Versiones soportadas

| Versión | Soporte |
|---------|---------|
| 0.4.x | Activo |
| 0.3.x | Activo |
| 0.1.x – 0.2.x | EOL — actualiza a 0.4.x |

## Marco legal aplicable

Esta herramienta opera bajo:

- **Ley 21.663** (Marco Nacional de Ciberseguridad, Chile · 2024) — marco de investigación OIV
- **Ley 21.459** (Delitos Informáticos, Chile · 2022) — protección de research de buena fe
- **ISO/IEC 29147:2018** — estándar internacional de coordinated disclosure
- **DOJ Good Faith Security Research Framework** (EEUU 2017) — cross-border safe harbor

Investigadores actuando de buena fe bajo estos marcos **no serán objeto de acciones legales** por parte del mantenedor o entidades afiliadas.

## Safe Harbor

**Nos comprometemos a:**
- No iniciar acciones legales contra researchers de buena fe
- Trabajar colaborativamente para entender y validar reportes
- Acreditar contribuyentes en release notes (salvo solicitud de anonimato)
- Otorgar plazo razonable para deployment del parche antes de disclosure público

**Esperamos que los researchers:**
- Hagan esfuerzo de buena fe por evitar violaciones de privacidad
- Solo interactúen con cuentas/datos que les pertenecen o tienen permiso explícito para acceder
- No exploten findings más allá de lo necesario para verificar
- No engagen en extorsión o amenazas

## Nota sobre propósito de la herramienta

`anci-oiv-resolver` es una herramienta de **defensa y research académico**, no ofensiva. Realiza exclusivamente consultas DNS pasivas a registros públicos (A, AAAA, MX). No realiza ningún acceso activo a sistemas de terceros.

Si tienes dudas sobre uso apropiado, consulta [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Hall of Fame

Researchers que reporten responsablemente serán acreditados aquí (con consentimiento).

*Sin entradas aún.*

---

**English version available on request.**

**Maintainer:** David Mellafe Z. · `david@reizan.io`
**Última actualización:** 2026-05-23
