# Phase 2 — Immutable Bundle Tooling

## Outcome

A credentialless producer can create and stage one final-tarball candidate release asset set, and consumers can verify it by signed manifest digest without rebuilding.

## Tasks

- [ ] Implement a clean build-and-pack command that produces final production-named `.tgz` files exactly once and emits `release-set.v1`.
- [ ] Implement tarball inspection that validates release boundary, package metadata, dependency-wave membership, SHA-256, SRI, duplicate identities, and forbidden/unexpected content.
- [ ] Implement candidate release asset assembly and verification for tarballs, lockfile, manifest, image digests, release/tag identity, and schema/version identity.
- [ ] Implement a durable candidate-state record keyed by canonical source SHA/tree, lockfile digest, release configuration revision, and build identity:
  - [ ] acquire an atomic build claim before packing; a compatible existing sealed bundle is reused after verification, never rebuilt.
  - [ ] record candidate release ID/tag, signed release-set manifest digest, producer attestation, per-BDD-shard status, test-matrix revision, and terminal admission state.
  - [ ] reject conflicting claims for the same source/version identity and preserve records for recovery/audit.
- [ ] Split CI trust domains:
  - [ ] credentialless builder creates a transient handoff only.
  - [ ] narrow stager verifies the handoff and uploads bytes to a temporary candidate GitHub Release without installing or executing bundle code.
  - [ ] consumers resolve only the candidate release ID plus signed manifest digest and verify every downloaded asset hash.
- [ ] Produce build provenance binding source SHA/tree and tarball identity without embedding an eventual candidate-release identity into package bytes.
- [ ] Add deterministic test fixtures for corrupt, incomplete, duplicate, traversal, symlink, mismatched-checksum, and wrong-wave bundles.

## Acceptance Criteria

- One candidate build produces every publishable byte once.
- Re-verification of downloaded candidate assets proves byte identity without `npm pack`, package builds, or package installation.
- No production publish credential is available to builder or stager code.
- Sequential reruns reuse a compatible sealed bundle and never create a second pack operation for the same candidate state key.

## Validation Evidence

- Focused bundle-tool unit tests and malicious-bundle fixtures.
- A recorded build count showing one pack invocation for a candidate SHA.
