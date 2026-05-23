## Descripción

Brief description of changes.

## Tipo de cambio

- [ ] Bug fix (cambio que arregla un issue)
- [ ] Feature (nueva funcionalidad)
- [ ] Domain entry addition (nuevo OIV mapping)
- [ ] Documentation update
- [ ] Test improvement
- [ ] Breaking change (rompe backward compatibility)

## Verificación · domain entries

Si esta PR agrega/modifica entries en `data/known-domains.json`:

- [ ] Ejecuté `dig +short A <domain>` y verifiqué resolución
- [ ] Ejecuté `dig +short MX <domain>` cuando aplicable
- [ ] RUT formato verificado (XXXXXXXX-X)
- [ ] razon_social match exact ANCI registry
- [ ] sector match ANCI taxonomy
- [ ] Si NXDOMAIN/edge case · documentado en `_note`

## Checklist

- [ ] `npm test` passing
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` exitoso
- [ ] CHANGELOG.md actualizado (si aplica)
- [ ] Documentation actualizada (si aplica)

## Contexto adicional

Capturas · enlaces · referencias relevantes.
