/**
 * anci-oiv-resolver · basic usage example
 *
 * Demonstrates single OIV resolution with and without DNS verification.
 * Run: npx tsx examples/basic-usage.ts
 */

import { resolveOIVDomain } from '../src/index.js';

async function main() {
  console.log('=== anci-oiv-resolver · Basic Usage ===\n');

  // Example 1: Table lookup — BCI (demonstrates false-positive prevention)
  const bci = await resolveOIVDomain('97006000-6', 'BANCO DE CRÉDITO E INVERSIONES');
  console.log('BCI resolution:');
  console.log(`  Domain:      ${bci.domain}`);
  console.log(`  Source:      ${bci.source}`);
  console.log(`  Confidence:  ${bci.confidence}`);
  console.log(`  Note: naive heuristic would produce "bancodecrditoeinversiones.cl" (NXDOMAIN)`);
  console.log();

  // Example 2: ANCI (government cyber agency)
  const anci = await resolveOIVDomain('62000560-6', 'AGENCIA NACIONAL DE CIBERSEGURIDAD');
  console.log('ANCI resolution:');
  console.log(`  Domain:     ${anci.domain}`);
  console.log(`  Sector:     ${anci.sector}`);
  console.log();

  // Example 3: With DNS verification
  console.log('Resolving Transbank with DNS verification...');
  const transbank = await resolveOIVDomain(
    '96689310-9',
    'TRANSBANK S.A.',
    { verify: true }
  );
  console.log('Transbank (with DNS verify):');
  console.log(`  Domain:     ${transbank.domain}`);
  console.log(`  DNS OK:     ${transbank.verified}`);
  console.log(`  MX records: ${transbank.mxRecords?.join(', ') ?? 'none'}`);
  console.log();

  // Example 4: Heuristic fallback (unknown RUT)
  const unknown = await resolveOIVDomain('99000000-1', 'DISTRIBUIDORA GAS NORTE S.A.');
  console.log('Unknown RUT (heuristic fallback):');
  console.log(`  Domain:     ${unknown.domain}`);
  console.log(`  Source:     ${unknown.source}`);
  console.log(`  Confidence: ${unknown.confidence} (lower — always verify heuristic results)`);
}

main().catch(console.error);
