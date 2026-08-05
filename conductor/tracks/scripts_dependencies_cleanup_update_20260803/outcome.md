# Outcome: Scripts and Dependencies Cleanup and Update

## Summary

Completed cleanup and dependency-maintenance track covering obsolete script removal, direct-dependency cleanup, compatible production and tooling updates, CI leak repair, and deferred production-major migrations.

## Delivered

- Removed the approved obsolete build and script assets while retaining active fixture and runtime entrypoints.
- Removed evidence-proven unused direct dependencies and updated compatible production chains.
- Migrated root/CLI archive tooling to tar 7, Dockerode to 5, MinIO to 8, and UUID to CommonJS-compatible 11 with focused regression coverage.
- Repaired Manager mTLS test-resource cleanup, atomic CLI session persistence, BDD Python availability, Docker staging, and AVA completion diagnostics.
- Added the npm 11.19-pinned lockfile rebuild and fast-gate reproducibility check; it restored the BDD workspace link without reverting audit updates.

## Final Validation

- Devel validation run `30995910414` passed at `e64115187`: workspace setup, package build, AVA, and Node/API/Python BDD jobs all succeeded.
- Phase 6 formal review: `PASS/accepted`.
- Final Oracle assessment: `APPROVE archival`; current production audit is clean.
- Memory-guard evidence: `npm run test:memory-guard-ava` passed with `ulimit -v 1835008`, `NODE_OPTIONS=--max-old-space-size=1024`, and `SCRAMJET_AVA_MEMORY_GUARD=1`; AVA threshold remained 524288 bytes. BDD thresholds remained 524288-byte parent heap, 209715200-byte child RSS, and 1073741824-byte Docker working set. No skip, exception, allowance, timeout, or limit was added for track closure.

## Deferred and Operational Follow-ups

- npm 11.19.0 bundled development-only advisories remain deferred pending a compatible upstream npm release.
- GHCR checkpoint publication remains fail-closed until `SCRAMJET_GHCR_SCOPED_PUBLISHER` and scoped package-write access are configured.
- nyc-to-c8 and legacy helper-script removal are optional follow-up tracks, not remaining production work.

## Important Revisions

- PR #1080 merged to `devel` as `9101c5814`.
- `e64115187` — pinned npm lockfile reproducibility validation, validated by the final green Devel run.

The track was archived on 2026-08-05 with all working records retained in this directory.
