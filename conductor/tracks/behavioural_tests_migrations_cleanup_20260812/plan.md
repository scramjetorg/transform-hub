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
    - [x] Phase checkpoint commit: `5618903b8`.
- [x] Task: Conductor - Phase Completion 'Establish the Migration Boundary and BDD Infrastructure' (Protocol in workflow.md)

## Phase 2: Rewrite CLI and Control-Plane Behavioral Journeys
- [x] Task: Rewrite real CLI ingress behavior as isolated Cucumber scenarios.
    - [x] Added `bdd/features/e2e/E2E-018-cli-ingress.feature` using built CLI artifacts with mTLS and non-mTLS ingress journeys.
    - [x] Covered endpoint/API dispatch, isolated profile state, representative success/error exits, raw bodies/stream/error mapping, SIGINT cancellation, and legacy HTTP fallback.
    - [x] Removed `packages/cli/test/real-mtls-ingress-process.spec.ts`, `real-nonmtls-ingress-process.spec.ts`, `profile-selection-process.spec.ts`, and the obsolete `cliProcess.ts` harness.
- [x] Task: Rewrite Host and Manager control-plane behavior as Cucumber scenarios.
    - [x] Added `bdd/features/e2e/E2E-019-control-plane-migration.feature` covering client-certificate admission/rejection, fingerprint trust, external Hub routing, and real ingress lifecycle.
    - [x] Rebuilt CSR enrollment through the published Hub and Manager command artifacts while retaining certificate-helper unit tests.
    - [x] Removed migrated behavioral AVA coverage, including the external-client and CSR CLI suites, while retaining deterministic option/config tests.
- [x] Task: Run focused CLI, Hub, Manager, and Verser2 Cucumber tags under the supported runner; repair leaks, isolation defects, or behavior regressions.
    - [x] Focused BDD passed: 12 scenarios, 206 steps, no leaked repository processes.
    - [x] Memory-guarded BDD passed with `NO_HOST=true SCRAMJET_BDD_MEMORY_GUARD=1 SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES=2097152 node scripts/run-bdd.js -- --tags "(@cli-ingress or @manager-ingress or @csr-enrollment) and not @ignore" --format progress`; parent heap threshold 2 MiB, child RSS threshold 200 MiB, Docker working-set threshold 1 GiB.
    - [x] `npm --prefix packages/host test` passed (327 tests, 9 skipped) and `npm --prefix packages/manager test` passed (211 tests).
- [x] Task: Perform review and deduplication of Cucumber steps, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
    - [x] Existing CLI and control-plane step helpers were extended; no duplicate scenario lifecycle, TLS, or process cleanup implementation was added.
    - [x] `npm --prefix bdd run build:bdd`, focused CLI/ingress BDD (14 scenarios, 234 steps), `npm --prefix packages/host test`, `npm --prefix packages/manager test`, focused CLI/Host/Manager/STH builds, and `npm run lint` passed.
    - [x] `npm run build:packages` was attempted but deferred as an unrelated environment failure: `@scramjet/runner-python` HTTPS artifact download disconnected before changed-package compilation. Focused changed-package builds passed.
    - [x] Phase review passed after moving Manager listener lifecycle coverage and eliminating shared `dist/` mutation from the CLI completion scenario.
    - [x] Phase checkpoint commit: `50f9336fe`.
- [x] Task: Conductor - Phase Completion 'Rewrite CLI and Control-Plane Behavioral Journeys' (Protocol in workflow.md)

## Phase 3: Rewrite Runner and Runtime Artifact Journeys
- [x] Task: Rebuild runner-node full-artifact scenarios in the existing runner E2E feature area.
    - [x] Extended E2E-017 for fixture execution, streaming, lifecycle, and Host-adapter diagnostics without duplicating existing assertions.
    - [x] Removed real spawned runner-node cases from `runtime-entry.spec.ts` and `skeleton.spec.ts`, retaining direct unit contracts.
- [x] Task: Rebuild long-running runtime behavior for coverage and isolation.
    - [x] Replaced Python raw stdout ordering with the E2E-014 artifact journey; retained transport fixture contracts and extracted pure close translation tests.
    - [x] Removed full-artifact Python ordering and runner lifecycle child tests; retained deterministic executor/five-pipe contracts using fixture children.
- [x] Task: Run focused runner BDD scenarios plus relevant retained runner package tests and repair runtime, process, or cleanup failures.
    - [x] Focused sequential Node E2E-017 and Python E2E-014 BDD paths passed; the initial combined Docker guard run OOMed because 1536 MiB cannot hold both suite and scenario Hosts. Node guarded proof passed with `BDD_DOCKER_MEMORY=2g`; no migration defect found.
    - [x] Memory-guarded Node TC-001 passed at a 2 MiB parent-heap threshold; Python TC-003 passed at 2 MiB plus its existing 77,824-byte exception. Child RSS limit remained 200 MiB and Docker working-set limit was raised only to 2 GiB for the Node proof.
    - [x] `npm --prefix packages/runner-node test` passed (101 tests) and `npm --prefix packages/runner test` passed (113 tests).
- [x] Task: Review runner test boundaries and shared step reuse, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
    - [x] Phase review passed with a deferred CI-tag selection check recorded in `td.md`.
    - [x] Retained executor/five-pipe tests remain isolated fixture contracts; no duplicate BDD runtime journey was introduced.
    - [x] Phase checkpoint commit: `70076fecf`.
- [x] Task: Conductor - Phase Completion 'Rewrite Runner and Runtime Artifact Journeys' (Protocol in workflow.md)
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
