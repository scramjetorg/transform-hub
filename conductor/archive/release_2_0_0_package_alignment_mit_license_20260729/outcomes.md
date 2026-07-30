# Outcome: Release 2.0.0 Package Alignment and MIT License

## Summary

Completed the 2.0.0 release-preparation track in PR #59. Included first-party
Transform Hub packages are aligned to 2.0.0 and MIT distribution licensing;
legacy Verser, bpmux, frame-stream, and licensing-only `scramjet-bdd` remain
outside the version-alignment boundary.

## Key Changes

- Added deterministic release-boundary and alignment tooling with check,
  dry-run, apply, and license-validation modes.
- Aligned included package versions, internal ranges, image tags, and the npm
  lockfile to 2.0.0 while preserving excluded package versions.
- Added MIT metadata and package license materials for the approved first-party
  release set, including Runner Python.
- Hardened Runner Python packaging and its test invocation; corrected
  release-induced API Router cleanup and Config image-tag test regressions.
- Restricted generated dist workspace installation to included release packages
  while retaining legacy artifacts in `dist/`.
- Published the curated 2.0.0 changelog, source-faithful grants acknowledgment,
  release roadmap, and archival/legacy-documentation proposals.
- Replaced global `rg` prerequisites in invariant helpers with the bundled
  `@vscode/ripgrep` dev dependency.

## Validation Summary

| Validation | Result |
|---|---|
| `npm run release:align:check` / `npm run release:align:dry-run` | Passed |
| `npm run docs:check` | Passed |
| `npm run build:packages` | Passed |
| `npm run lint` | Completed with 36 existing warnings; no fixes applied |
| Focused API Router, Config, and Runner Python tests | Passed: 92, 62, and 316 tests |
| `node scripts/run-ava.js scripts/test/build-all.spec.js --serial` | Passed |
| `npm run check:runtime-invariants` | Passed: 8/8 guards |
| `npm run check:typings-split` | Passed: 4/4 guards and no-emit typecheck |

`npm run test:packages-no-concurrent` also ran. Remaining failures were
classified as pre-existing Runner Bun mock behavior, a sequence-test
documentation/test mismatch, and policy-excluded legacy bpmux/Verser dependency
resolution; none affect the included release boundary.

## Memory-Guard Evidence

- Focused release-alignment coverage ran with
  `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/release-align.spec.js --serial` and passed 34 tests.
- Package AVA tests used the repository runner's default profile: 2048 MiB old
  space, AVA concurrency 2, and 600000 ms timeout. No changed source test
  adopted per-test heap measurement via `createAvaMemoryGuard`.
- Docker BDD smoke tests were not run because this track did not change BDD
  runtime behavior. No memory skips or threshold exceptions were claimed.

## Deferred

- `release-align-failed-apply-image-immutability` remains optional P2 test
  hardening. Final Oracle review confirmed that failed validation returns before
  image writes, so this omission is not a production release blocker.

## Final State

PR #59 was verified and reviewed for merge into `feat/manager-oss`; the source
track was archived after completion.
