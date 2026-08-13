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
    - [x] Focused sequential Node E2E-017 and Python E2E-014 BDD paths passed; the initial combined Docker guard run OOMed because 1536 MiB cannot hold both suite and scenario Hosts. Node guarded proof passed with `BDD_INCLUDE_LONG_RUNNING=1 BDD_DOCKER_MEMORY=2g SCRAMJET_BDD_MEMORY_GUARD=1 SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES=2097152 node scripts/run-bdd.js -- --name="E2E-017 TC-001" --format progress`; no migration defect found.
    - [x] Memory-guarded Node TC-001 passed at a 2 MiB parent-heap threshold; Python TC-003 passed with `SCRAMJET_BDD_MEMORY_GUARD=1 SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES=2097152 node scripts/run-bdd.js -- --name="E2E-014 TC-003" --format progress` at 2 MiB plus its existing 77,824-byte exception. Child RSS limit remained 200 MiB and Docker working-set limit was raised only to 2 GiB for the Node proof.
    - [x] `npm --prefix packages/runner-node test` passed (101 tests) and `npm --prefix packages/runner test` passed (113 tests).
- [x] Task: Review runner test boundaries and shared step reuse, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
    - [x] Phase review passed with a deferred CI-tag selection check recorded in `td.md`.
    - [x] Retained executor/five-pipe tests remain isolated fixture contracts; no duplicate BDD runtime journey was introduced.
    - [x] Phase checkpoint commit: `70076fecf`.
- [x] Task: Conductor - Phase Completion 'Rewrite Runner and Runtime Artifact Journeys' (Protocol in workflow.md)

## Phase 4: Rewrite External-Service and Adapter Journeys
- [x] Task: Rebuild MinIO/S3 client and Manager proxy behavior as tagged Cucumber scenarios.
    - [x] Added a scenario-owned real MinIO journey covering production S3Client streaming plus S3Proxy upload, retrieve, list, delete, and index behavior.
    - [x] Removed migrated Host and Manager MinIO AVA integration suites; retained deterministic S3 client units.
- [x] Task: Rebuild Docker-daemon behavior as a tagged Cucumber scenario when the BDD container can access the daemon safely.
    - [x] Added an owner-labeled Dockerode lifecycle journey covering create, start, inspect, logs, stop, and removal through the mounted daemon socket.
    - [x] Replaced shell-based prerequisite checks with Dockerode, so the supported BDD image needs no Docker CLI; removed the AVA daemon smoke.
- [x] Task: Review process and Kubernetes adapter tests; remove any remaining boundary-crossing behavioral cases and retain deterministic archive/config unit tests.
    - [x] Retained all process and Kubernetes tests because they are deterministic extraction, configuration, `/proc`, or stubbed-process unit contracts; no Kubernetes cluster coverage was added.
- [x] Task: Run tagged MinIO/S3 and Docker-daemon Cucumber validation with service/container cleanup checks, then run relevant adapter package tests.
    - [x] Guarded `@minio-s3` BDD passed with its exact 4,194,304-byte allowance (effective 4,718,592 bytes); guarded `@docker-daemon` BDD passed with its exact 69,632-byte allowance (effective 593,920 bytes). Both reported no leaked repository processes.
    - [x] Retained adapter suites passed: adapter-docker 5, adapter-process 15, adapter-kubernetes 4.
- [x] Task: Deduplicate shared infrastructure helpers, run relevant package build/lint validation, and commit the phase checkpoint on the current branch.
    - [x] Reused ScenarioIsolation, Dockerode prerequisite, lifecycle ownership, and exact memory-guard exception infrastructure; no duplicate container harness was added.
    - [x] Focused BDD support tests passed (46), BDD build and full Biome lint passed. Broad `build:packages` again failed only on the unrelated `runner-python` external artifact download; focused changed-surface validation passed.
    - [x] Phase review passed. Phase checkpoint commit: `cec4e5820`.
- [x] Task: Conductor - Phase Completion 'Rewrite External-Service and Adapter Journeys' (Protocol in workflow.md)

## Phase 5: Complete AVA Cleanup and Track Validation
- [x] Task: Re-scan package AVA suites to prove retained tests meet the approved single-unit boundary and remove any migrated references, fixtures, or scripts.
    - [x] Removed remaining subprocess OpenAPI tests, orphan fixed-port API-server helper, and legacy-gated Verser HTTP/TLS suite with its retired certificate scripts.
    - [x] Retained only deterministic mocked, in-memory, fixture-child, and PKI-helper unit contracts; moved the Verser2 certificate fixture into BDD-owned fixtures.
    - [x] Registered E2E-018/E2E-019 in default BDD waves, preserved tagged external services as an explicit prerequisite-based exclusion, and selected `@ci-runner-node` in CI.
- [x] Task: Validate the rewritten Cucumber coverage and retained package coverage.
    - [x] Focused Cucumber tags passed: CI Node selector (2 scenarios, including `@ci-runner-node`) and `@ci-verser2` (16 scenarios, including CLI ingress and control-plane journeys), both with no leaked repository processes.
    - [x] BDD manifest/tag AVA tests passed (71), and retained api-router (91), api-server (65), and Manager (209) package suites plus API-router/Manager builds and BDD TypeScript build passed.
    - [x] Run the supported memory-guarded BDD commands for migrated scenarios and record heap, child-process RSS, Docker working-set thresholds, exceptions, skips, and reasons.
        - [x] CLI/ingress/control-plane guarded proof passed: 14 scenarios / 234 steps with a 2 MiB parent-heap threshold, 200 MiB child RSS threshold, and 1 GiB Docker working-set threshold; no skips or exceptions, no leaked processes.
        - [x] Guarded MinIO/S3 and Docker-daemon journeys each passed with the 512 KiB base threshold plus exact documented allowances of 4,194,304 bytes (effective 4,718,592) and 69,632 bytes (effective 593,920), respectively; child RSS remained 200 MiB and Docker working-set remained 1 GiB; no skips or leaked processes.
    - [x] Run affected package builds, Biome lint, runtime-invariant checks where applicable, and verify no track-caused leaked processes or containers remain.
        - [x] Full `npm run build:packages` passed, including runner-python artifact preparation and all 35 TypeScript project builds; `npm run lint` passed and `npm run check:runtime-invariants` reported all eight guards passing.
        - [x] Retained adapter suites passed: Docker 5, process 15, Kubernetes 4; every BDD validation path reported no leaked repository processes and scenario-owned external resources were cleaned up.
- [x] Task: Review final changes against the specification, complete deduplication and documentation updates, and record deferred Docker/runtime prerequisites if any.
    - [x] Final readiness remediation moved Verser2 TLS credentials from the source tree to scenario-owned temporary lifecycle storage, added Docker/MinIO prerequisite callback tests, and moved built OpenAPI generator artifact coverage into BDD while retaining pure AVA units.
    - [x] Reverted the out-of-scope Manager trust-export semantic change; a Manager-local public CA fixture replaces the deleted legacy Verser fixture.
    - [x] Removed track/phase leakage from BDD fixture directories, feature/tag names, step identifiers, labels, and control-plane admission names; left intentional Conductor and pre-existing tags untouched.
    - [x] Rewrote E2E-017 TC-001 from scratch as a bounded runner completion journey (runner PID, terminal exit, and Host availability), removing retained stdout/request-body observation and the completion fixture's marker/keepalive output. The standard 1536 MiB Docker cap still OOMs before scenario execution while starting the process-adapter runner; the scoped 2 GiB guarded proof passes with no skip or allowance, so the existing runtime-container prerequisite remains documented rather than tuning the test.
    - [x] Final closure evidence: `SCRAMJET_BDD_MEMORY_GUARD=1 node scripts/run-bdd.js -- --tags "@minio-s3 and not @ignore" --format progress` and the equivalent `@docker-daemon` command passed with 512 KiB base plus exact 4,194,304-byte and 69,632-byte allowances (effective 4,718,592 and 593,920); both retained 200 MiB child RSS and 1 GiB Docker working-set limits with no skips or leaks. The built OpenAPI generator BDD passed at a 512 KiB parent threshold with no allowance/skip. E2E-020 transport passed with `NO_HOST=true SCRAMJET_BDD_MEMORY_GUARD=1 SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES=2097152 SCRAMJET_BDD_FAIL_ON_LEAK=1 node scripts/run-bdd.js -- --name="An external broker exchanges runner, runtime, and RPC traffic through the built transport" --format progress`; it uses 2 MiB parent, 200 MiB child RSS, and 1 GiB Docker working-set limits with no allowance/skip or leaks.
    - [x] Deferred callback prerequisite diagnostics are now closed in `td.md`; CI runner-node selection is already resolved. No Docker/runtime prerequisite remains deferred.
- [x] Task: Run formal track review, remediate in-scope findings, commit the final phase checkpoint on the current branch, and publish validation evidence according to the active workflow.
    - [x] Final formal review passed after adding required `@ci-verser2` PR validation, loading control-plane journeys from built artifacts, and migrating live runner Verser2 transport coverage to BDD while retaining only listener-free option mapping in AVA.
    - [x] Re-review accepted the bounded E2E-017 completion rewrite: it keeps process-adapter runner PID, terminal-exit, and Host-availability coverage without retained stdout/request-body concatenation; the 1536 MiB pre-scenario Docker OOM is documented alongside a scoped successful 2 GiB guard proof, with no skip or global limit change.
    - [x] Final ledger remediation registered E2E-020 in the default Verser2 BDD wave and scoped `BDD_DOCKER_MEMORY=2g BDD_INCLUDE_LONG_RUNNING=1` to Node BDD CI only. The CI-equivalent selector passed 8 scenarios / 180 steps without leaks, and the default Verser2 wave passed 3 scenarios / 58 steps without leaks.
    - [x] Final validation: full package build; BDD and affected package builds; targeted package/BDD/CI workflow AVA; focused migrated BDD; guarded ingress, external-service, Python, Node, and Verser2 paths; full Biome lint; runtime invariants; all passed except the documented standard-memory Node container prerequisite, and all BDD paths reported no track-caused process/container leaks.
- [x] Task: Conductor - Phase Completion 'Complete AVA Cleanup and Track Validation' (Protocol in workflow.md)
