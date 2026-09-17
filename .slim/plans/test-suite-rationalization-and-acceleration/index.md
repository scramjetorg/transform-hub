# Test Suite Rationalization and Acceleration

## Objective

Reduce avoidable CI test cost while preserving meaningful unit, integration, runtime, adapter, API, CLI, protocol, and lifecycle coverage.

## Scope

- Remove only explicitly approved safe or safe-ish unit-test candidates after their stated preconditions are met.
- Record—not automatically remove—redundant, overlapping, and overcautious test findings.
- Reuse the existing normal E2E/AppContext suite Hub per Cucumber chunk with an immutable catalog of eligible registered sequence packages.
- Keep all runtime instances, streams, topics, and mutable state scenario-owned, with exact resource-ledger cleanup.
- Replace only non-semantic fixed delays with bounded, diagnostic readiness predicates.
- Add a compiled BDD mode that avoids Cucumber's `ts-node/register`; retain explicit source mode and the BDD build/type gate.
- Inventory unit-test `ts-node` usage without broadly replacing package AVA staging or manifest hooks.

## Non-goals

- Do not share running sequence instances across scenarios.
- Do not add scenario parallelism in the initial acceleration change.
- Do not reuse scenario-owned Hub/IaC, Manager/MultiManager, MinIO/external-service, Verser2, CLI-configuration, upload-semantic, malformed-input, or storage scenarios.
- Do not remove tests solely because they are lexically similar or cover different adapters, runtimes, protocols, lifecycles, errors, or value boundaries.
- Do not remove semantic timing behavior, protocol ordering/framing, security, public CLI/API compatibility, or runtime-parity coverage.
- Do not replace package AVA TypeScript staging or remove all unit-test `ts-node` hooks.

## Acceptance Criteria

1. Only safe candidates, or safe-ish candidates with their documented precondition confirmed in the Phase 1 Test Audit Register, are removed; all other audit findings remain documented and untouched.
2. The Phase 1 Test Audit Register is the durable removal gate. Each record has a stable ID, location, classification, boundary tuple, counterpart/public-contract evidence, confidence, precondition, final disposition, and approver; it separately records redundant, overlapping, and overcautious findings.
3. Every inventoried sequence-upload caller is mapped in the provision manifest to a catalog entry or an explicit upload-under-test/excluded rationale. Catalog consumers obtain immutable registered packages from a per-chunk catalog and create fresh scenario-owned instances without scenario-time upload.
4. Upload/packaging semantics and isolated Hub/IaC, Manager/MultiManager, external-service, and excluded paths retain independent provisioning and cleanup.
5. Scenario teardown disposes only World/ledger-owned resources; retries receive a fresh World and ledger; suite-Hub/catalog resources stop only at suite teardown, as proved by sequential-consumer and forced-retry regression coverage.
6. Every removed fixed wait has a bounded observable readiness predicate and timeout diagnostics; semantic delays and existing startup/health predicates remain supported.
7. Compiled BDD mode loads generated JavaScript without `ts-node/register`; every compiled CI lane has an intentional build gate, source freshness is verified, missing/stale output is rejected, and source mode is explicit.
8. Supported package and BDD test paths pass required focused/final verification, and comparable before/after timing records per-chunk startup, registration, scenario, total wall time, median, and p95.

## Supported-Path Assumptions

- Registered catalog packages are immutable and are not deleted, replaced, or mutated by catalog consumers.
- Cucumber Worlds, run/chunk ownership, ports, artifact roots, retries, and scheduler-exclusive chunks remain isolated.
- Compiled BDD output is generated from `bdd/tsconfig.json` before compiled-mode execution and is not accepted as a stale source substitute.

## Dependencies

- Suite lifecycle: `bdd/step-definitions/e2e/host-steps.ts`.
- Isolation and ownership: `bdd/support/scenario-isolation.ts`, `bdd/lib/scenario-isolation.ts`, `bdd/lib/ownership.js`, and `bdd/step-definitions/world.ts`.
- BDD build/runner wiring: `bdd/cucumber.js`, `bdd/package.json`, `bdd/tsconfig.json`, `scripts/run-bdd-docker.js`, `scripts/run-bdd-waves.js`.
- CI lane definitions: `.github/workflows/pr-validate.yml`.

## Delivery Mode
- Mode: branch/worktree
- User decision: confirmed before planning

## Approved Decisions

- 2026-09-14: User chose `branch/worktree`; @orchestrator decides actual setup later.
- 2026-09-14: Reuse immutable registered sequence artifacts, not pre-running instances.
- 2026-09-14: Keep initial BDD acceleration serial within existing chunk scheduling; scenario parallelism is deferred.
- 2026-09-14: Treat redundancy, overlap, and overcautiousness audits as evidence; do not automatically remove those tests.
- 2026-09-14: Remove waits only when a non-timing observable predicate can replace them.

## Research Evidence

- `bdd/step-definitions/e2e/host-steps.ts:251-375` already starts/stops a suite Hub per chunk; uploads remain scenario-local at `:608-661`.
- `bdd/step-definitions/hub/config.ts:184-265` and `bdd/step-definitions/manager/aggregation-repro.ts:555-759` deliberately own isolated service stacks.
- `bdd/cucumber.js:18-32` uses `ts-node/register`; `bdd/tsconfig.json` targets `bdd/dist`; `bdd/package.json:29-32` provides `build:bdd`.
- `.github/workflows/pr-validate.yml:121-234` invokes BDD lanes without a visible `build:bdd` step.
- Static audit found no high-confidence behavioral duplicates, but found contained/partial overlap and implementation-detail review candidates. Safe/safe-ish placeholder removals require precondition checks.

## Unresolved Decisions

- Which safe-ish unit candidates have confirmed public-API or zero-test-command compatibility and may be removed?
- Which fixture archives have stable identities and can enter the immutable catalog after a caller inventory?
- Which fixed waits are demonstrably non-semantic after trace-level review?
- Where should compiled BDD artifacts be built and cached in CI?
- Is scenario-level parallelism desired after serial catalog reuse and ledger isolation are proven?
