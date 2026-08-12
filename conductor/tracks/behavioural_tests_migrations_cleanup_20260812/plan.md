# Implementation Plan: Behavioral Tests Migration and Cleanup

## Phase 1: Establish the Migration Boundary and BDD Infrastructure
- [x] Task: Re-audit the AVA inventory against the approved behavioral boundary and record the exact AVA cases, helpers, and Cucumber destination for each migration group. See [inventory.md](./inventory.md).
    - [x] Read package and BDD codemaps plus existing feature/step patterns before modifying test infrastructure.
    - [x] Separate deterministic mocked single-unit tests that remain in AVA from real-artifact, process, network, TLS/mTLS, service, and composed-system cases.
    - [x] Identify existing Cucumber journeys to extend and prevent duplicate coverage.
- [x] Task: Implement reusable Cucumber support for rewritten behavioral scenarios.
    - [x] Provide per-scenario isolated home, profile, configuration, temporary-artifact, port, child-process, and certificate lifecycle helpers.
    - [x] Provide reusable mTLS control-ingress setup and assertions without leaking PKI material to logs.
    - [x] Provide tagged Docker-daemon and MinIO/S3 prerequisites with explicit availability diagnostics and cleanup.
    - [x] Add focused support-level tests where support code has deterministic unit behavior.
- [x] Task: Run focused BDD-support validation and record the baseline inventory, selected BDD tags, and unavailable infrastructure prerequisites.
    - [x] `npm --prefix bdd run build:bdd` passed.
    - [x] Focused AVA support tests passed (78 tests), and `node scripts/run-bdd.js -- --tags "@ci-verser2 and not @ignore" --format pretty` passed (2 scenarios, 36 steps) with no leaked processes.
    - [x] Docker is available on the host but unavailable to the BDD runner container; future `@docker-daemon` behavior requires a mounted daemon socket. `@requires-minio` requires `BDD_MINIO_ENDPOINT`.
- [x] Task: Review shared BDD support for duplication, complete relevant lint/build checks, and commit the phase checkpoint on the current branch.
    - [x] Shared ownership and lifecycle helpers were reused; no duplicate BDD support abstraction was introduced.
    - [x] Phase review passed after prerequisite tag remediation. BDD source is excluded by the repository Biome configuration, so scoped Biome lint is not applicable.
    - [x] Phase checkpoint commit: pending.
- [ ] Task: Conductor - Phase Completion 'Establish the Migration Boundary and BDD Infrastructure' (Protocol in workflow.md)

## Phase 2: Rewrite CLI and Control-Plane Behavioral Journeys
- [ ] Task: Rewrite real CLI ingress behavior as isolated Cucumber scenarios.
    - [ ] Extend the existing CLI and Verser2 feature areas with mTLS and non-mTLS ingress journeys using the real CLI artifact.
    - [ ] Cover endpoint/API dispatch, profile selection, isolated session/profile configuration, representative success and error exit codes, SIGINT, timeout, and cancellation behavior.
    - [ ] Remove the migrated behavioral cases and no-longer-needed harness code from `packages/cli/test/real-mtls-ingress-process.spec.ts`, `real-nonmtls-ingress-process.spec.ts`, and `profile-selection-process.spec.ts`.
- [ ] Task: Rewrite Host and Manager control-plane behavior as Cucumber scenarios.
    - [ ] Cover client-certificate admission and rejection, fingerprint/trust behavior, external-broker routing, and Manager/Host control-ingress lifecycle through real artifacts.
    - [ ] Rebuild CSR enrollment as CLI-oriented Cucumber behavior while retaining deterministic certificate-helper unit tests where appropriate.
    - [ ] Remove migrated behavioral cases and obsolete AVA harness code from Host and Manager ingress, external-client, and CSR CLI suites.
- [ ] Task: Run focused CLI, Hub, Manager, and Verser2 Cucumber tags under the supported runner; repair leaks, isolation defects, or behavior regressions.
- [ ] Task: Perform review and deduplication of Cucumber steps, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
- [ ] Task: Conductor - Phase Completion 'Rewrite CLI and Control-Plane Behavioral Journeys' (Protocol in workflow.md)

## Phase 3: Rewrite Runner and Runtime Artifact Journeys
- [ ] Task: Rebuild runner-node full-artifact scenarios in the existing runner E2E feature area.
    - [ ] Cover fixture-sequence execution, streamed input/output, completion and stop lifecycle, and actionable sequence-load failure diagnostics through the Host process adapter.
    - [ ] Extend existing runner scenarios instead of duplicating their completion and streaming assertions.
    - [ ] Remove migrated spawn-based tests from `packages/runner-node/test/runtime-entry.spec.ts` while retaining direct single-unit tests.
- [ ] Task: Rebuild long-running runtime behavior for coverage and isolation.
    - [ ] Replace raw Python stdout/order behavior with a user-observable BDD streaming journey where it exercises a full artifact.
    - [ ] Add supported runtime-specific BDD scenarios only where the BDD environment can execute the production runtime artifact repeatably.
    - [ ] Retain fast executor and five-pipe tests only when they remain deterministic isolated contracts; remove any that continue to cross the behavioral boundary.
- [ ] Task: Run focused runner BDD scenarios plus relevant retained runner package tests and repair runtime, process, or cleanup failures.
- [ ] Task: Review runner test boundaries and shared step reuse, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
- [ ] Task: Conductor - Phase Completion 'Rewrite Runner and Runtime Artifact Journeys' (Protocol in workflow.md)

## Phase 4: Rewrite External-Service and Adapter Journeys
- [ ] Task: Rebuild MinIO/S3 client and Manager proxy behavior as tagged Cucumber scenarios.
    - [ ] Use a real isolated MinIO service and production storage paths to cover object streaming, upload, retrieval, deletion, and proxy routing.
    - [ ] Remove migrated AVA MinIO/S3 integration suites and their obsolete suite-specific orchestration.
- [ ] Task: Rebuild Docker-daemon behavior as a tagged Cucumber scenario when the BDD container can access the daemon safely.
    - [ ] Validate create, start, inspect/log, stop, and remove lifecycle using an isolated labeled container.
    - [ ] If daemon access cannot be supplied repeatably, preserve only the minimal AVA fallback smoke and document the prerequisite and ownership rather than silently skipping coverage.
- [ ] Task: Review process and Kubernetes adapter tests; remove any remaining boundary-crossing behavioral cases and retain deterministic archive/config unit tests.
- [ ] Task: Run tagged MinIO/S3 and Docker-daemon Cucumber validation with service/container cleanup checks, then run relevant adapter package tests.
- [ ] Task: Deduplicate shared infrastructure helpers, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
- [ ] Task: Conductor - Phase Completion 'Rewrite External-Service and Adapter Journeys' (Protocol in workflow.md)

## Phase 5: Complete AVA Cleanup and Track Validation
- [ ] Task: Re-scan package AVA suites to prove retained tests meet the approved single-unit boundary and remove any migrated references, fixtures, or scripts.
- [ ] Task: Validate the rewritten Cucumber coverage and retained package coverage.
    - [ ] Run focused Cucumber tags for CLI, ingress, control plane, runner/runtime, MinIO/S3, and Docker-daemon behavior where available.
    - [ ] Run the relevant BDD smoke paths and package tests, escalating to broader validation only when required by affected boundaries.
    - [ ] Run the supported memory-guarded BDD commands for migrated scenarios and record heap, child-process RSS, Docker working-set thresholds, exceptions, skips, and reasons.
    - [ ] Run affected package builds, Biome lint, runtime-invariant checks where applicable, and verify no track-caused leaked processes or containers remain.
- [ ] Task: Review final changes against the specification, complete deduplication and documentation updates, and record deferred Docker/runtime prerequisites if any.
- [ ] Task: Run formal track review, remediate in-scope findings, commit the final phase checkpoint on the current branch, and publish validation evidence according to the active workflow.
- [ ] Task: Conductor - Phase Completion 'Complete AVA Cleanup and Track Validation' (Protocol in workflow.md)
