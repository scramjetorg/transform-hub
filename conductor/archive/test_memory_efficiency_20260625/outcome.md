# Outcome: Test Memory Efficiency and Process Cleanup

## Summary

Completed the test memory efficiency and process cleanup track for issues 38 and 39.

The track established supported AVA/package-test and BDD runner entrypoints that run reliably under the repository memory guard, reduce stale process risk, and document memory-safe validation expectations.

## What Was Done

- Centralized AVA runner option construction and safe defaults in the supported `scripts/run-ava.js` path.
- Added AVA runner regression coverage for memory, worker, timeout, JIT/WASM/fetch, and environment override behavior.
- Confirmed all package test paths route through the supported AVA runner.
- Added `scripts/run-bdd.js` as the supported BDD entrypoint, with Docker mode as the default memory-constrained path.
- Added BDD option defaults for memory, CPU, timeout, and grace-period escalation.
- Added centralized BDD cleanup helpers for process-group signaling, TERM-to-KILL escalation, temp cleanup, Docker cleanup utilities, and repository-owned process leak detection.
- Hardened BDD host/manager cleanup utilities to use bounded escalation.
- Updated `AGENTS.md`, `conductor/workflow.md`, `conductor/tech-stack.md`, `conductor/known-solutions.md`, and BDD documentation with supported command guidance and limitations.
- Stabilized memory-heavy package scripts and lean BDD smoke buckets under the memory guard.

## Validation

Final validation recorded during the track included:

- `npm run test:runner` under `ulimit -v 1835008` with `NODE_OPTIONS="--max-old-space-size=1024"` — passed, 93/93.
- Docker-backed BDD dry-run via `scripts/run-bdd.js` under the memory guard — completed with no leaked repository processes reported.
- `npm run test:packages-no-concurrent` under the memory guard — passed across package workspaces.
- Targeted guarded package reruns for `api-server`, `manager`, `runner`, `runner-node`, and `sth-config` — passed.
- Guarded BDD buckets for node, API node, hub, verser2, AppContext, and API topic paths — passed.
- Leak detection command reported no leaked repository processes.
- `npm run lint` under the memory guard completed with only pre-existing `scripts/docs.js` warnings; session-introduced warnings were fixed.

## Deferred Follow-ups

- Generated/older contributing docs can be synced with the new runner guidance later.
- Leak detection currently reports rather than fails CI by default.
- Docker-heavy, stress/load, external-dependency, aggregation-repro, and broad BDD suites remain deferred because lean guarded buckets cover the intended runner behavior and cleanup paths.
- `npm run test:bdd-ci-python` selected 0 scenarios under current tags; this remains a tag coverage issue rather than a memory blocker.

## Final State

The track is complete and archived.
