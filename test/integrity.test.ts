/**
 * Dataset integrity tests.
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';
import { assertDatasetIntegrity } from '../src/integrity.js';

function createTamperedFixture(): string {
  const root = mkdtempSync(join(process.cwd(), 'tmp anci integrity '));
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'data'), { recursive: true });
  copyFileSync(new URL('../src/integrity.ts', import.meta.url), join(root, 'src', 'integrity.ts'));
  copyFileSync(new URL('../data/MANIFEST.json', import.meta.url), join(root, 'data', 'MANIFEST.json'));

  const dataset = JSON.parse(
    readFileSync(new URL('../data/known-domains.json', import.meta.url), 'utf-8'),
  ) as Record<string, Record<string, unknown>>;
  dataset['97006000-6'] = {
    ...dataset['97006000-6'],
    domain: 'tampered.example',
  };
  writeFileSync(join(root, 'data', 'known-domains.json'), `${JSON.stringify(dataset, null, 2)}\n`);
  return root;
}

async function importFixtureIntegrity(root: string) {
  const href = pathToFileURL(join(root, 'src', 'integrity.ts')).href;
  return import(`${href}?fixture=${randomUUID()}`) as Promise<typeof import('../src/integrity.js')>;
}

describe('assertDatasetIntegrity', () => {
  it('passes for the checked-in manifest and dataset', () => {
    const result = assertDatasetIntegrity();
    assert.equal(result.rowCount, 987);
    assert.equal(result.expectedSha256, result.actualSha256);
  });

  it('throws when one dataset row is tampered', async () => {
    const root = createTamperedFixture();
    try {
      const mod = await importFixtureIntegrity(root);
      assert.throws(
        () => mod.assertDatasetIntegrity(),
        /Dataset integrity mismatch/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
