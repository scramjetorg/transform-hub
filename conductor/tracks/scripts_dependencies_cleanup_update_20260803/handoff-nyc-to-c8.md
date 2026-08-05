# Future Track Handoff: Replace nyc with c8

## Goal

Evaluate and, if justified, replace nyc/Istanbul coverage with c8's native V8 coverage in a dedicated follow-up track. Do not perform this migration as incidental cleanup.

## Why c8 is the preferred candidate

- c8 consumes V8 coverage rather than source-instrumenting every file, reducing runtime overhead and avoiding nyc/Istanbul's nested development advisory chain.
- It can wrap the repository's supported `scripts/run-ava.js` entrypoint while retaining AVA as the test framework.
- Node's built-in test coverage is not a drop-in option because repository suites use AVA, not `node:test`.

## Required discovery and migration work

1. Inventory every `nyc` script, CI job, config, report consumer, threshold, ignore rule, source-map path, and coverage artifact.
2. Prototype c8 around supported AVA and BDD paths; confirm TypeScript staging, CommonJS/ESM source maps, child processes, Docker BDD containers, and generated files are attributed correctly.
3. Define equivalent reports and artifacts (text, lcov, JSON as needed), threshold policy, source exclusion rules, and CI upload/retention behavior.
4. Migrate scripts and CI only after side-by-side coverage comparison establishes that files, lines, branches, and functions have acceptable semantic parity.
5. Remove nyc/Istanbul declarations and regenerate the npm lockfile only after all supported coverage commands and CI artifacts pass.

## Validation criteria

- Existing AVA/package and BDD commands retain their supported runner contracts.
- Coverage reports are reproducible and exclude generated/staged trees correctly.
- No memory limit, timeout, skip, allowance, or assertion is relaxed to accommodate the migration.
- CI artifacts and release validation continue to receive the required coverage format.
- Run focused coverage proof plus serial package tests, runner tests, and relevant Docker BDD coverage before final review.
