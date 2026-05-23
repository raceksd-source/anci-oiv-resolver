# Contribuir a anci-oiv-resolver

Gracias por el interés en mejorar la cobertura del registro OIV chileno. Las contribuciones más valiosas son las entradas de dominios verificados para sectores subrepresentados.

[English version](CONTRIBUTING.en.md)

## Cómo añadir entradas de dominios

Este es el tipo de contribución más impactante. Antes de abrir un PR:

**1. Verifica el dominio real con DNS público:**

```bash
dig +short A <dominio>
dig +short MX <dominio>
```

Si `dig +short A bci.cl` retorna una IP, el dominio existe y es válido. Si retorna vacío, no abrir PR.

**2. Edita `data/known-domains.json`** añadiendo la entrada con el formato:

```json
"97030000-7": {
  "domain": "bancoestado.cl",
  "razon_social": "BANCO DEL ESTADO DE CHILE",
  "sector": "banca_finanzas",
  "source_note": "Verified via dig 2026-05-23"
}
```

**3. Añade test case en `test/known-domains.test.ts`:**

```typescript
assert.strictEqual(
  resolveBytable('97030000-7')?.domain,
  'bancoestado.cl',
  'Banco Estado lookup'
);
```

**4. Corre la suite de tests:**

```bash
npm run test:no-dns
```

Todos los tests existentes deben seguir pasando.

**5. Abre PR** con título: `feat(domains): add <Nombre OIV>`

Incluye en la descripción:
- Output de `dig +short A <dominio>`
- Fuente del RUT (registro ANCI público)
- Sector según clasificación Ley 21.663

## Sectores con mayor necesidad de cobertura

En orden de prioridad:

| Sector | OIVs totales | Cobertura actual | Gap |
|--------|-------------|-----------------|-----|
| Salud (hospitales regionales) | 111 | 22 | 89 |
| Administración del Estado | 155 | 24 | 131 |
| Energía eléctrica | 147 | 7 | 140 |
| Agua potable y saneamiento | ~45 | 0 | ~45 |
| Transporte | ~30 | 0 | ~30 |
| Combustibles | ~20 | 0 | ~20 |

## Reportar bugs

Usa el template `domain_submission` para dominios incorrectos o el template `bug_report` para errores en código.

Para bugs de dominio, incluye:
- OIV razón social exacta (como aparece en registro ANCI)
- RUT
- Dominio inferido (output actual del tool)
- Dominio real esperado
- Output verbatim de `npx tsx examples/cli-demo.ts <RUT> --verify`

## Mejoras a la heurística

El fallback heurístico vive en `src/heuristic.ts`. Los casos más problemáticos son:

- Organizaciones con marcas completamente distintas a la razón social (ej: Telefónica → movistar)
- Nombres con acentos o caracteres especiales no cubiertos por `normalizeAccents`
- Sufijos legales regionales no incluidos en el strip list

Para proponer mejoras: PR con test case que falla + fix + explicación del edge case.

## Code style

- TypeScript strict (`tsconfig.json` existente)
- ESLint clean (`npm run lint`)
- Conventional commits: `feat` / `fix` / `docs` / `test` / `refactor`
- 100% test coverage para código nuevo

## Proceso de review

PRs de dominios: review en 48-72h hábiles.
PRs de código: review en 7 días.

Si no hay respuesta en 2 semanas, mencioname en el issue.

## Código de conducta

- Research de seguridad defensivo y de buena fe únicamente
- No publicar exploits ni información de vulnerabilidades activas en este repo
- Disclosure responsable: reportar a [david@reizan.io](mailto:david@reizan.io) antes de publicar hallazgos
- Respeto al marco Apache 2.0 en derivados

---

[English version](CONTRIBUTING.en.md) | [SECURITY.md](SECURITY.md) | [docs/METHODOLOGY.md](docs/METHODOLOGY.md)
