# Outcomes: Test Memory Efficiency and Process Cleanup

## Key Findings

- AVA/package tests needed a supported runner profile with bounded workers, heap, timeout, fetch/JIT controls, and package-level overrides for memory-heavy suites.
- Strict host memory limits can make direct host Cucumber runs fail from WASM allocation pressure; Docker-backed BDD is the supported memory-constrained path.
- Several BDD blockers were not timeout problems: they were unnecessary fixed waits, full-stream waits, missing per-scenario hub cleanup, or heavy/redundant scenarios included in lean CI buckets.
- Process leak detection and scoped cleanup are required after both package and BDD validation to avoid stale Hub/STH/runner/Manager/MultiManager children.

## Deliverables

- Added centralized AVA runner option handling and regression coverage for memory, worker, timeout, fetch, JIT/WASM, and guard behavior.
- Hardened BDD runner defaults and cleanup helpers, including bounded Docker mode defaults, TERM-to-KILL escalation, temp/container cleanup, and repository process leak reporting.
- Stabilized memory-heavy package scripts for `api-server`, `manager`, `runner`, `runner-node`, and `sth-config` under the repository memory guard.
- Reduced BDD smoke cost by replacing unnecessary fixed waits with condition-based stream/data assertions, avoiding full-stream waits where bounded matching suffices, adding explicit hub cleanup, and tagging long/redundant scenarios `@slow` for non-lean runs.
- Updated repository and Conductor guidance for supported AVA/BDD entrypoints, memory/thread defaults, cleanup expectations, and validation commands.

## Validation Summary

- `npm run test:runner`: passed under `ulimit -v 1835008` and `NODE_OPTIONS="--max-old-space-size=1024"`.
- `npm run test:packages-no-concurrent`: passed under the same guard.
- Targeted guarded package reruns passed for `api-server`, `manager`, `runner`, `runner-node`, and `sth-config`.
- Guarded BDD buckets passed: `test:bdd-ci-node`, `test:bdd-ci-api-node`, `test:bdd-ci-hub`, `test:bdd-ci-verser2`, `test:bdd-appcontext`, and `test:bdd-ci-api-topic`.
- `test:bdd-ci-python` selected 0 scenarios under current tags and completed with no leaks; this remains a tag coverage issue, not a memory blocker.
- Explicit `reportLeakedProcesses()` checks reported no leaked repository processes after validation.

## Deviations from Plan

- Full Compose lifecycle replacement was not introduced; the existing Docker-backed BDD runner already provides the needed atomic lifecycle for this track.
- Direct hard-blocking of all `npx ava` invocations was deferred; an opt-in/preload guard and supported runner guidance were added instead.
- Full broad/Docker-heavy BDD suites were not run; lean guarded buckets were validated and intentionally heavy `@stress`, `@load`, `@external-dependency`, `@requires-docker`, `@docker-specific`, and aggregation-repro scenarios remain deferred.

## Handoff Notes

- Use `npm` commands only; keep validation under the documented memory guard.
- Supported package tests must continue routing through `scripts/run-ava.js`.
- Supported BDD validation should use `scripts/run-bdd.js` or `scripts/run-bdd-docker.js` Docker mode under memory constraints.
- Before adding BDD waits or broad stream assertions, prefer condition-based polling/matching and keep heavy scenarios out of lean CI buckets.
- PR: https://github.com/0rail/transform-hub/pull/47
