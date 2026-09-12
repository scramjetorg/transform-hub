# Phase 2 — Immutable Bundle Tooling

## Outcome

A credentialless producer can create and stage one final-tarball candidate release asset set, and consumers can verify it by signed manifest digest without rebuilding.

## Tasks

- [x] Implement a clean build-and-pack command that produces final production-named `.tgz` files exactly once and emits `release-set.v1`.
- [x] Implement tarball inspection that validates release boundary, package metadata, dependency-wave membership, SHA-256, SRI, duplicate identities, and forbidden/unexpected content.
- [x] Implement candidate release asset assembly and verification for tarballs, lockfile, manifest, image digests, release/tag identity, and schema/version identity.
- [x] Implement a durable candidate-state record keyed by canonical source SHA/tree, lockfile digest, release configuration revision, and build identity:
  - [x] acquire an atomic build claim before packing; a compatible existing sealed bundle is reused after verification, never rebuilt.
  - [x] record candidate release ID/tag, signed release-set manifest digest, producer attestation, per-BDD-shard status, test-matrix revision, and terminal admission state.
  - [x] reject conflicting claims for the same source/version identity and preserve records for recovery/audit.
- [x] Split CI trust domains:
  - [x] credentialless builder creates a transient handoff only.
  - [x] narrow stager verifies the handoff and uploads bytes to a temporary candidate GitHub Release without installing or executing bundle code.
  - [x] consumers resolve only the injected candidate ID/manifest digest reference and verify every downloaded asset hash through the adapter.
- [x] Produce build provenance binding source SHA/tree and tarball identity without embedding an eventual candidate-release identity into package bytes.
- [x] Add deterministic test fixtures for corrupt, incomplete, duplicate, traversal, symlink, mismatched-checksum, and wrong-wave bundles.

## Acceptance Criteria

- One candidate build produces every publishable byte once.
- Re-verification of downloaded candidate assets proves byte identity without `npm pack`, package builds, or package installation.
- No production publish credential is available to builder or stager code.
- Sequential reruns reuse a compatible sealed bundle and never create a second pack operation for the same candidate state key.

## Validation Evidence

- Focused bundle-tool unit tests and malicious-bundle fixtures.
- A recorded build count showing one pack invocation for a candidate SHA.

## Phase 2 Evidence and Limitations

- Local evidence: `scripts/release-bundle.js` and the three `scripts/lib/release-*` helpers
  implement credentialless build/pack orchestration, atomic candidate claims, non-extracting
  tar inspection, provenance, and injected candidate asset staging/download verification.
- Focused evidence: `scripts/test/release-bundle.spec.js` covers build/seal/verify/reuse,
  pack-count-once, state conflicts, incomplete/traversal/symlink/wrong-wave inputs;
  `scripts/test/release-candidate-assets.spec.js` covers injected staging and corrupt downloads;
  `scripts/test/github-release-candidate.spec.js` covers state mutations, mocked GitHub draft
  release create/reuse/upload/list/download, post-upload verification, and state persistence.
- The narrow `scripts/lib/github-release-candidate.js` adapter uses only the injected `gh` CLI
  edge, allowlists candidate assets, and performs no build, pack, install, execution, signing,
  BDD admission, or publication.
- Limitation: credentials, signing, BDD admission, and publication remain deferred.
- Local credential enforcement is intentionally deferred to the protected production workflow in Phase 5.
