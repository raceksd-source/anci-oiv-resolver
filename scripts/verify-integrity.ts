import { assertDatasetIntegrity } from '../src/integrity.js';

const result = assertDatasetIntegrity();
console.log(
  `Dataset integrity OK: ${result.rowCount} rows, sha256 ${result.actualSha256}`,
);
