---
name: Domain submission
about: Proponer nuevas entradas de dominios OIV verificados
title: 'domains: add <Nombre OIV>'
labels: domain-submission
assignees: ''
---

## Entradas propuestas

<!--
Por cada OIV que deseas añadir, completa la tabla.
El RUT debe estar en el formato "XXXXXXXX-X" (sin puntos).
Sector debe ser uno de: banca_finanzas | telecomunicaciones | salud | administracion_estado |
  empresas_estado | energia_electrica | agua | transporte | combustibles | otro
-->

| RUT | Razón social (ANCI) | Dominio propuesto | Sector |
|-----|---------------------|-------------------|--------|
| | | | |
| | | | |
| | | | |

## Verificación DNS

<!-- Pega el output de dig para cada dominio propuesto -->

```bash
# Ejemplo:
$ dig +short A bancoestado.cl
200.75.51.52
200.75.51.53

$ dig +short MX bancoestado.cl
10 mx.bancoestado.cl.
```

```
<!-- Tu output aquí -->
```

## Fuente del RUT

<!-- ¿Cómo verificaste que el RUT corresponde al OIV? -->
<!-- Ej: "Registro ANCI público en anci.gob.cl/oivs", "Ficha SII", "SBIF", etc. -->

## Notas

<!-- Cualquier información adicional sobre estos OIVs -->
<!-- Ej: "El dominio antiguo era X, migraron a Y en 2025" -->
<!-- Ej: "Tienen subdominio diferente para el sitio principal: servicios.ejemplo.cl" -->
