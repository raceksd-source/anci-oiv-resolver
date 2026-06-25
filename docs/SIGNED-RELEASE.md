# Signed Dataset Release

This package ships the integrity layer, but does not perform publish-time
signing or DOI registration. Those steps require the maintainer's Sigstore and
Zenodo accounts.

## Publish Steps

1. Generate a reproducible manifest:

   ```sh
   npm run build:manifest -- --generated-at 2026-06-25T00:00:00Z
   ```

2. Verify the checked-in dataset against `data/MANIFEST.json`:

   ```sh
   npm run verify:integrity
   npm run test:no-dns
   npm run build
   ```

3. Create the release bundle containing at least:

   - `data/known-domains.json`
   - `data/MANIFEST.json`
   - `README.md`
   - `LICENSE`

4. Sign the manifest or release bundle with Sigstore/cosign:

   ```sh
   cosign sign-blob --yes --output-signature data/MANIFEST.json.sig data/MANIFEST.json
   cosign verify-blob --signature data/MANIFEST.json.sig data/MANIFEST.json
   ```

5. Upload the signed bundle and signature to Zenodo, publish the deposition,
   and record the Zenodo DOI in the GitHub/npm release notes.
