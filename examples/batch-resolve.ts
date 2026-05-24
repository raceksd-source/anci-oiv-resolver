/**
 * anci-oiv-resolver · batch CSV processing example
 *
 * Demonstrates bulk OIV resolution for OSINT research workflows.
 * Run: npx tsx examples/batch-resolve.ts
 */

import { resolveBatch, getCoverageStats } from '../src/index.js';

// Sample of OIVs from different sectors — representative of the 915 OIV universe
const OIV_SAMPLE = [
  { rut: '97006000-6', razonSocial: 'BANCO DE CRÉDITO E INVERSIONES' },
  { rut: '97004000-5', razonSocial: 'BANCO DE CHILE' },
  { rut: '97080000-K', razonSocial: 'BANCO BICE' },
  { rut: '92580000-7', razonSocial: 'EMPRESA NACIONAL DE TELECOMUNICACIONES S.A.' },
  { rut: '78921690-8', razonSocial: 'WOM S.A.' },
  { rut: '96799250-K', razonSocial: 'CLARO CHILE SPA' },
  { rut: '60803000-K', razonSocial: 'SERVICIO DE IMPUESTOS INTERNOS' },
  { rut: '62000560-6', razonSocial: 'AGENCIA NACIONAL DE CIBERSEGURIDAD' },
  { rut: '61219000-3', razonSocial: 'EMPRESA DE TRANSPORTE DE PASAJEROS METRO S.A.' },
  { rut: '93930000-7', razonSocial: 'CLÍNICA LAS CONDES S.A.' },
  // Unknown RUT — triggers heuristic fallback
  { rut: '99000000-1', razonSocial: 'EMPRESA DISTRIBUIDORA AGUA ATACAMA S.A.' },
];

async function main() {
  console.log('=== anci-oiv-resolver · Batch Resolution ===\n');
  console.log(`Resolving ${OIV_SAMPLE.length} OIVs...\n`);

  const results = await resolveBatch(OIV_SAMPLE);

  // Print table
  console.log('RUT              | Domain                        | Source        | Conf');
  console.log('-----------------|-------------------------------|---------------|-----');
  for (const r of results) {
    const rut = r.rut.padEnd(16);
    const domain = r.domain.padEnd(30);
    const source = r.source.padEnd(14);
    console.log(`${rut} | ${domain} | ${source} | ${r.confidence.toFixed(2)}`);
  }

  // Coverage summary
  console.log('\n=== Coverage Statistics ===\n');
  const stats = getCoverageStats();
  console.log(`Total entries:    ${stats.total}`);
  console.log(`DNS verified:     ${stats.dnsVerified}`);
  console.log(`DNS unverified:   ${stats.dnsUnverified}`);
  console.log('\nBy sector:');
  for (const [sector, s] of Object.entries(stats.bySector)) {
    console.log(`  ${sector.padEnd(25)} ${s.count} entries (${s.dnsVerified} DNS-verified)`);
  }

  // False-positive prevention stats
  const tableHits = results.filter(r => r.source === 'known-domains').length;
  const heuristicHits = results.filter(r => r.source === 'heuristic').length;
  console.log(`\nThis batch: ${tableHits} table lookups · ${heuristicHits} heuristic fallbacks`);
}

main().catch(console.error);
