/**
 * anci-oiv-resolver · CLI demo
 *
 * Usage:
 *   npx tsx examples/cli-demo.ts <RUT> [razon_social] [--verify]
 *
 * Examples:
 *   npx tsx examples/cli-demo.ts 97006000-6
 *   npx tsx examples/cli-demo.ts 97006000-6 "BANCO DE CRÉDITO E INVERSIONES" --verify
 *   npx tsx examples/cli-demo.ts 62000560-6 "AGENCIA NACIONAL DE CIBERSEGURIDAD"
 */

import { resolveOIVDomain, getCoverageStats } from '../src/index.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
anci-oiv-resolver CLI

Usage:
  tsx examples/cli-demo.ts <RUT> [razon_social] [--verify] [--stats]

Options:
  --verify   Run live DNS verification against the resolved domain
  --stats    Print coverage statistics and exit
  --help     Show this help

Examples:
  tsx examples/cli-demo.ts 97006000-6
  tsx examples/cli-demo.ts 97006000-6 "BANCO DE CRÉDITO E INVERSIONES" --verify
  tsx examples/cli-demo.ts --stats
`);
    process.exit(0);
  }

  if (args.includes('--stats')) {
    const stats = getCoverageStats();
    console.log(`anci-oiv-resolver · Coverage Statistics`);
    console.log(`Total entries: ${stats.total}`);
    console.log(`DNS verified:  ${stats.dnsVerified} (${Math.round(stats.dnsVerified/stats.total*100)}%)`);
    console.log('\nBy sector:');
    for (const [sector, s] of Object.entries(stats.bySector)) {
      const pct = Math.round(s.dnsVerified / s.count * 100);
      console.log(`  ${sector.padEnd(25)} ${s.count} entries · ${s.dnsVerified} verified (${pct}%)`);
    }
    return;
  }

  const doVerify = args.includes('--verify');
  const cleanArgs = args.filter(a => !a.startsWith('--'));
  const rut = cleanArgs[0];
  const razonSocial = cleanArgs[1] ?? '';

  if (!rut) {
    console.error('Error: RUT is required');
    process.exit(1);
  }

  console.log(`Resolving RUT: ${rut}`);
  if (razonSocial) console.log(`Razón social:  ${razonSocial}`);
  if (doVerify) console.log('DNS verify:    enabled\n');

  const result = await resolveOIVDomain(rut, razonSocial, { verify: doVerify });

  console.log('\nResult:');
  console.log(`  domain:       ${result.domain}`);
  console.log(`  source:       ${result.source}`);
  console.log(`  confidence:   ${result.confidence}`);
  console.log(`  sector:       ${result.sector}`);
  if (doVerify) {
    console.log(`  dns_ok:       ${result.verified}`);
    console.log(`  mx_records:   ${result.mxRecords?.join(', ') ?? 'none'}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
