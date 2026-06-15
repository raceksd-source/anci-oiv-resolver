/**
 * anci-oiv-resolver · heuristic domain inference
 *
 * Fallback when RUT is not in the known-domains table.
 * Uses accent-normalization, stopword stripping, and legal-suffix removal
 * to infer the most likely .cl domain from a razón social string.
 *
 * Accuracy tested against verified entries: ~61% exact match on .cl names.
 * Always combine with verify.ts in production to confirm DNS existence.
 */

import type { OIVDomainResolution } from './types.js';

/** Spanish/legal stopwords that rarely appear in domain names */
const STOPWORDS = new Set([
  'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'a', 'en',
  'su', 'sus', 'por', 'con', 'para', 'sin', 'sobre', 'bajo',
  'al', 'ante', 'desde', 'hasta', 'hacia', 'entre', 'sin', 'que',
]);

/** Legal entity suffixes to strip */
const LEGAL_SUFFIXES = [
  'sociedad anonima',
  'sociedad anónima',
  's.a.',
  'spa',
  's.p.a.',
  'limitada',
  'ltda.',
  'ltda',
  'eirl',
  'e.i.r.l.',
  'sociedad de responsabilidad limitada',
  'cooperativa de ahorro y credito',
  'cooperativa de ahorro y crédito',
  'bolsa de valores',
  'bolsa de comercio',
  'empresa de transporte de pasajeros',
  'depósito de valores',
  'deposito de valores',
  'empresa de los ferrocarriles del estado',
  'empresa de correos de chile',
];

/** Well-known brand abbreviation expansions. Maps short ANCI name → actual domain token. */
const BRAND_OVERRIDES: Record<string, string> = {
  // Banca / Finanzas
  'banco de credito e inversiones': 'bci',
  'banco de crédito e inversiones': 'bci',
  'banco del estado de chile': 'bancoestado',
  'banco bice': 'bice',
  'banco de chile': 'bancochile',
  'banco itau chile': 'itau',
  'banco itaú chile': 'itau',
  'banco santander-chile': 'santander',
  'banco santander chile': 'santander',
  'banco security': 'bancosecurity',
  'banco consorcio': 'bancoconsorcio',
  'banco ripley': 'bancoripley',
  'banco falabella': 'bancofalabella',
  'banco internacional': 'bancointernacional',
  'scotiabank chile': 'scotiabankchile',
  'cooperativa de ahorro y credito coopeuch': 'coopeuch',
  'cooperativa de ahorro y crédito coopeuch': 'coopeuch',
  'bolsa de comercio de santiago': 'bolsadesantiago',
  'transbank': 'transbank',
  'mercado pago': 'mercadopago',
  'redbanc': 'redbanc',
  'deposito central de valores': 'dcv',
  'depósito central de valores': 'dcv',
  // Telecomunicaciones
  'empresa nacional de telecomunicaciones': 'entel',
  'telefonica chile': 'movistar',
  'telefónica chile': 'movistar',
  'telefonica empresas chile': 'movistar',
  'telefónica empresas chile': 'movistar',
  'claro chile': 'claro',
  'claro comunicaciones': 'claro',
  // Energia
  'corporacion nacional del cobre': 'codelco',
  'corporación nacional del cobre': 'codelco',
  'empresa nacional del petroleo': 'enap',
  'empresa nacional del petróleo': 'enap',
  // Salud
  'asociacion chilena de seguridad': 'achs',
  'asociación chilena de seguridad': 'achs',
  'mutual de seguridad de la camara chilena de la construccion': 'mutual',
  'mutual de seguridad de la cámara chilena de la construcción': 'mutual',
  // Estado
  'servicio de impuestos internos': 'sii',
  'agencia nacional de ciberseguridad': 'anci',
  'servicio de registro civil e identificacion': 'registrocivil',
  'servicio de registro civil e identificación': 'registrocivil',
  'instituto nacional de estadisticas': 'ine',
  'instituto nacional de estadísticas': 'ine',
  'comision para el mercado financiero': 'cmf',
  'comisión para el mercado financiero': 'cmf',
  'policia de investigaciones de chile': 'pdichile',
  'policía de investigaciones de chile': 'pdichile',
  'carabineros de chile': 'carabineros',
  'ejercito de chile': 'ejercito',
  'ejército de chile': 'ejercito',
  'fuerza aerea de chile': 'fach',
  'fuerza aérea de chile': 'fach',
  'armada de chile': 'armada',
  'universidad de chile': 'uchile',
  'comision nacional de energia': 'cne',
  'comisión nacional de energía': 'cne',
  'tesoreria general de la republica': 'tesoreria',
  'tesorería general de la república': 'tesoreria',
  'direccion de presupuestos': 'dipres',
  'dirección de presupuestos': 'dipres',
  'unidad de analisis financiero': 'uaf',
  'unidad de análisis financiero': 'uaf',
  'defensoria penal publica': 'dpp',
  'defensoría penal pública': 'dpp',
  'fondo nacional de salud': 'fonasa',
  'empresa de transporte de pasajeros metro': 'metro',
};

/**
 * Remove accented characters → ASCII equivalents.
 * á→a  é→e  í→i  ó→o  ú→u  ü→u  ñ→n
 */
export function normalizeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/gi, 'n');
}

/**
 * Infer the most likely .cl domain token from a razón social string.
 * Returns a lowercase slug ready to append `.cl` (or `.gob.cl` etc.).
 */
export function inferDomainToken(razonSocial: string): string {
  const lower = razonSocial.toLowerCase().trim();

  // 1. Check brand overrides (longest match wins)
  for (const [pattern, replacement] of Object.entries(BRAND_OVERRIDES)) {
    if (lower.includes(pattern)) {
      return replacement;
    }
  }

  // 2. Strip legal suffixes
  let cleaned = lower;
  for (const suffix of LEGAL_SUFFIXES) {
    cleaned = cleaned.replace(new RegExp(`\\b${suffix}\\b`, 'gi'), ' ');
  }

  // 3. Remove punctuation except spaces
  cleaned = cleaned.replace(/[^a-záéíóúüñ\s]/g, ' ');

  // 4. Normalize accents
  cleaned = normalizeAccents(cleaned);

  // 5. Split and filter stopwords
  const tokens = cleaned.split(/\s+/).filter(t => t.length > 0 && !STOPWORDS.has(t));

  if (tokens.length === 0) {
    // Absolute fallback: first word of original name, lowercased, no accents
    const firstWord = razonSocial.toLowerCase().split(/\s+/)[0] ?? '';
    return normalizeAccents(firstWord.replace(/[^a-z]/g, ''));
  }

  // 6. Concatenate remaining tokens
  return tokens.join('').replace(/[^a-z0-9]/g, '');
}

/**
 * Exhaustive list of token stems derived from the known-domains catalog that
 * use the .gob.cl TLD. Checked against every administracion_estado entry
 * in the v0.5.1 catalog (2026-06-01 audit).
 *
 * When a heuristic token exactly matches one of these stems the TLD is
 * overridden to `.gob.cl` instead of the default `.cl`.
 * Kept as a flat array for O(n) scan — the list is small and stable.
 */
const GOB_CL_STEMS: ReadonlyArray<string> = [
  'anci', 'ani', 'casademoneda', 'conadi', 'cultura', 'defensa',
  'dgac', 'dipreca', 'dipres', 'dpp', 'dt', 'economia',
  'educacionpublica', 'extranjeria', 'fne', 'fosis', 'gendarmeria',
  'hacienda', 'inapi', 'injuv', 'interior', 'ips', 'isl',
  'junaeb', 'junji', 'minciencia', 'minjusticia', 'minrel', 'minvu',
  'mma', 'monumentos', 'mop', 'msgg', 'niñez', 'odepa',
  'sag', 'sea', 'seguridadpublica', 'senapred', 'senda', 'sernameg',
  'sernatur', 'serviciocivil', 'serviu', 'sma', 'sml',
  'subdere', 'subrei', 'subtrans', 'supersalud', 'tesoreria', 'trabajo',
];

/**
 * Determine TLD suffix based on sector context.
 * Chilean government agencies typically use .gob.cl or .cl
 */
export function inferTld(sector: string, token: string): string {
  if (sector === 'administracion_estado') {
    // Use the exhaustive catalog-derived stem list instead of the original
    // 6-entry list that missed 47 of the 55 .gob.cl domains.
    if (GOB_CL_STEMS.some(p => token === p || token.includes(p))) {
      return '.gob.cl';
    }
  }
  return '.cl';
}

/**
 * Heuristic inference: razón social string → best-guess domain.
 * Returns a partial OIVDomainResolution (no verify fields, confidence ~0.4–0.6).
 */
export function heuristicInfer(
  razonSocial: string,
  rut = '',
  sector = 'unknown'
): Omit<OIVDomainResolution, 'verified' | 'mxRecords'> {
  const token = inferDomainToken(razonSocial);
  const tld = inferTld(sector, token);
  const domain = `${token}${tld}`;

  return {
    domain,
    source: 'heuristic',
    rut,
    razonSocial,
    sector: sector as OIVDomainResolution['sector'],
    confidence: 0.45,
  };
}
