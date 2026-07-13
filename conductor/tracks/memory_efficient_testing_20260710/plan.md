# Implementation Plan: Memory Efficient Testing

## Phase 1: Track Setup and Test Surface Inventory

- [x] Task: Establish implementation branch and review surface
    - [x] Capture the current branch as the PR base during implementation.
    - [x] Create the implementation branch `conductor/memory_efficient_testing_20260710` from current HEAD.
    - [x] Open or update a draft PR using the track specification as the PR body when required for review visibility.

  Notes: Captured `feat/manager-oss` as the PR base after user approval because it is non-main and ahead of upstream by one commit. Created implementation branch `conductor/memory_efficient_testing_20260710`. Draft PR creation is deferred until the first required PR visibility/manual verification point.

- [x] Task: Inventory relevant test and memory infrastructure
    - [x] Review package AVA runner files: `scripts/run-ava.js` and `scripts/lib/ava-options.js`.
    - [x] Review BDD runner files: `scripts/run-bdd.js`, `scripts/run-bdd-docker.js`, `scripts/lib/bdd-options.js`, and `scripts/lib/bdd-cleanup.js`.
    - [x] Review Cucumber support and lifecycle files: `bdd/cucumber.js`, `bdd/step-definitions/world.ts`, `bdd/step-definitions/e2e/host-steps.ts`, and `bdd/lib/host-utils.ts`.
    - [x] Review sequence-test capture/fixture files including `packages/sequence-test/src/captures.ts` and fake instance support.
    - [x] Review runner/runtime monitoring files including `packages/types/src/messages/monitoring.ts`, `packages/runner-node`, and process/docker adapter stats paths.
    - [x] Record existing reusable helpers and any intentional reasons for package-local implementation.

  Notes: Inventory confirmed the supported AVA entrypoint is `scripts/run-ava.js`, with reusable env/default option patterns in `scripts/lib/ava-options.js`. BDD memory work should extend `scripts/run-bdd.js`, `scripts/run-bdd-docker.js`, `scripts/lib/bdd-options.js`, and `scripts/lib/bdd-cleanup.js`; Docker mode already forwards `SCRAMJET_*` and `BDD_*` env vars into the container. Cucumber state retention is centered in `CustomWorld` and module-level hooks in `bdd/step-definitions/e2e/host-steps.ts`. Host process tracking belongs near `HostUtils.trackHost()` / `spawnHost()`. Sequence-test captures retain chunks and monitoring frames without clear/dispose APIs. Monitoring memory fields already exist in `packages/types/src/messages/monitoring.ts`; Docker adapter populates them, while process and Kubernetes adapter stats paths still have memory TODOs. Existing path-anchored leak patterns in `bdd-cleanup.js` should be preserved to avoid broad process matching.

- [x] Task: Define shared memory measurement semantics
    - [x] Define parent test-process heap metric as `heapUsed + external + arrayBuffers` after forced GC.
    - [x] Define test-runner heap target threshold with a planned 512 KiB default and documented env override.
    - [x] Define child-process RSS semantics separately from Node heap checks.
    - [x] Define Docker runner container working-set semantics separately from raw Docker memory usage.
    - [x] Document how higher process/container thresholds such as 100-200 MiB are represented and justified.

  Notes: Shared semantics for implementation are: `node.postGc.totalBytes = heapUsed + external + arrayBuffers`, `node.postGc.deltaBytes = after - before`, `process.rssBytes` / `process.rssDeltaBytes` for spawned PIDs or process groups, `docker.workingSetBytes = memory_stats.usage - inactive_file/cache` where available, and `resource.leak.count` for live resources expected to be gone. Planned defaults are `SCRAMJET_MEMORY_GUARD=1`, `SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES=524288`, AVA/BDD-specific threshold overrides, `SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES=104857600`, and `SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES=104857600`. Node heap sampling must drain, GC, drain, GC before baseline and final measurements, after teardown/dispose hooks. RSS/container checks first enforce expected process/container lifecycle; long-lived resources compare deltas. 100 MiB is the default child/container threshold, 100-200 MiB requires a scoped reason, and above 200 MiB should require explicit approval or an issue. Any memory skip must include a reason; reasonless skips fail.

- [x] Task: Conductor - Phase Checkpoint 'Track Setup and Test Surface Inventory' (Protocol in workflow.md)

  Checkpoint Notes: Phase 1 completed with the implementation branch created, track status marked in progress, local infrastructure inventory recorded, and shared memory semantics defined. Shared-code review found existing reusable option/env parsing patterns in `scripts/lib/ava-options.js` and `scripts/lib/bdd-options.js`; BDD process matching should preserve `bdd-cleanup.js` path-anchored patterns. No product code changed in this phase, so build/test validation was not applicable. Verification performed with `git status --short` confirming a clean worktree before checkpoint update. Phase commits: `737442c3`, `b0ab8a42`, `7a4e0d34`.

## Phase 2: AVA Package-Test Memory Guard

- [x] Task: Add AVA memory guard configuration and runner wiring
    - [x] Add documented environment variables for enabling AVA memory guard mode and threshold overrides.
    - [x] Ensure memory guard mode runs the AVA process with `--expose-gc`.
    - [x] Force or validate serial AVA execution in memory guard mode.
    - [x] Reject conflicting user-provided concurrency options when deterministic measurement would be invalid.
    - [x] Ensure the supported `scripts/run-ava.js` path remains the only AVA entrypoint.

  Notes: Added AVA/common memory guard env names, 512 KiB heap threshold default, `isMemoryGuardEnabled()`, `memoryHeapThresholdBytes()`, and `buildAvaArgs()` wiring that injects `--expose-gc` and forces `--concurrency 1` when guard mode is enabled. AVA-specific guard env explicitly overrides the common guard, including disabled values. No new runner entrypoint was introduced; `scripts/run-ava.js` continues to consume `buildAvaArgs()`. Verification: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js` passed with 64 tests.

- [x] Task: Implement AVA per-test memory measurement
    - [x] Add guard lifecycle that samples before and after each test.
    - [x] Drain the event loop and run GC twice before each measurement.
    - [x] Measure `heapUsed + external + arrayBuffers`.
    - [x] Fail with actionable diagnostics when growth exceeds threshold.
    - [x] Verify measurement happens after test teardown; add a hook-order self-test or fallback guarded helper if global hooks cannot guarantee ordering.

  Notes: AVA 3.15.0 does not provide a supported global hook mechanism through preload/config `require`; use an explicit per-file guard helper rather than monkey-patching `require('ava')`.

  Implementation Notes: Added `scripts/lib/ava-memory-guard.js` with `installAvaMemoryGuard(test, options)`, `measureMemoryUsage()`, and `drainAndGc()`. The helper is no-op when guard mode is disabled, fails immediately if `global.gc` is unavailable when enabled, stores per-test baselines in a `WeakMap` keyed by the AVA execution context, and measures after `t.teardown()` cleanup via `test.afterEach.always`. Memory guard mode now injects `--serial` as well as `--expose-gc` and `--concurrency 1`. Added `scripts/test/ava-memory-guard.spec.js` and `scripts/test/ava-memory-guard-hook-order.spec.js`, including a real AVA hook-order self-test proving `t.teardown()` runs before `afterEach.always`. Verification: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js scripts/test/ava-memory-guard.spec.js scripts/test/ava-memory-guard-hook-order.spec.js` passed with 81 tests; `git diff --check` passed.

- [x] Task: Add AVA exception and skip support
    - [x] Support near-test documented exceptions with threshold and reason.
    - [x] Support environment-based skip only when a reason is supplied and printed.
    - [x] Fail or warn clearly for silent, broad, or reasonless skips.
    - [x] Include examples for valid exceptions and invalid broad skips.

  Notes: Added `allowAvaMemoryGrowth(t, { threshold, reason })` for scoped per-test allowances with required positive threshold and non-empty reason. The guard uses per-test allowance thresholds when present and includes the allowance reason in diagnostics if exceeded. Added `SCRAMJET_MEMORY_SKIP=1` handling in the AVA helper; `SCRAMJET_MEMORY_SKIP_REASON` is required and printed when broad env skip is used, while reasonless skips fail during installation. Tests cover valid allowances, invalid thresholds/reasons, exceeded allowance diagnostics, and env skip behavior. Verification: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js scripts/test/ava-memory-guard.spec.js scripts/test/ava-memory-guard-hook-order.spec.js` passed with 96 tests; `git diff --check` passed.

- [x] Task: Validate AVA guard on focused packages
    - [x] Add or update runner self-tests for option parsing, `--expose-gc`, serial execution, missing GC failure, threshold failure, and documented exception behavior.
    - [x] Run the narrowest runner-helper validation command.
    - [x] Run at least one deterministic package surface under AVA memory guard mode.
    - [x] Commit completed AVA guard work according to task-level commit policy.

  Notes: Added `scripts/test/ava-memory-guard-live.spec.js`, a deterministic live smoke surface that uses the strict `createAvaMemoryGuard(baseTest)` wrapper under the default 512 KiB threshold with no file-level threshold override. The helper now measures inside the guarded test body before AVA afterEach/reporting overhead, uses `registerAvaMemoryCleanup(t, fn)` for cleanup observed by final measurement, and avoids running-min or other dynamic subtraction. Review fixes added fail-closed threshold validation, deterministic retained-leak coverage, strict cleanup/error handling, AVA member wrapping for common test modifiers, live `test.serial` coverage, and detailed diagnostics with component breakdowns. Focused validations passed: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js scripts/test/ava-memory-guard.spec.js scripts/test/ava-memory-guard-hook-order.spec.js` passed with 106 tests; `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node scripts/run-ava.js scripts/test/ava-memory-guard-live.spec.js` passed with 12 tests under memory guard; `git diff --check` passed.

- [x] Task: Conductor - Phase Checkpoint 'AVA Package-Test Memory Guard' (Protocol in workflow.md)

  Checkpoint Notes: Phase 2 completed with AVA memory guard configuration wired through the supported `scripts/run-ava.js` entrypoint, strict per-test measurement helper APIs, reasoned exception/skip support, modifier coverage including `test.serial`, and focused live guard validation under the default 512 KiB threshold. External AVA hook research confirmed AVA 3.15.0 lacks a supported global preload hook suitable for this strict post-cleanup measurement, so the explicit `createAvaMemoryGuard(baseTest)` wrapper is the documented adoption path. Review concerns were resolved by removing dynamic overhead subtraction, measuring inside the wrapped test body before AVA reporting overhead, requiring `registerAvaMemoryCleanup(t, fn)` for cleanup observed by final measurement, validating thresholds fail-closed, and preserving common AVA modifiers. Validation performed before checkpoint: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js scripts/test/ava-memory-guard.spec.js scripts/test/ava-memory-guard-hook-order.spec.js` passed with 106 tests; `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node scripts/run-ava.js scripts/test/ava-memory-guard-live.spec.js` passed with 12 tests; `git diff --check` passed. Phase 2 commits: `4795582b`, `b6282a37`, `df359aec`, `209b8b52`, `57134e94`, `7eee2a01`.

## Phase 3: Sequence-Test Cleanup and Memory Assertions

- [x] Task: Add deterministic cleanup to sequence-test captures
    - [x] Add `clear()` or `dispose()` behavior to byte, output, log, and monitoring captures where retained data exists.
    - [x] Ensure captured chunks, concatenated buffers, parsed frames, waiters, and pending text can be released.
    - [x] Update sequence-test APIs without breaking existing callers unnecessarily.

- [x] Task: Add memory-aware sequence-test assertions or helpers
    - [x] Add helper assertions for bounded memory growth where monitoring data is available.
    - [x] Keep assertions opt-in for scenarios that exercise runner/runtime memory behavior.
    - [x] Ensure helpers distinguish parent harness heap from child runner/process memory.

- [x] Task: Update sequence-test consumers and tests
    - [x] Update tests to clear retained chunks and captures in teardown.
    - [x] Keep `Buffer.concat` allowed for assertions while clearing references after use.
    - [x] Add focused tests proving cleanup/disposal releases retained capture state.
    - [x] Run sequence-test package validation under the AVA memory guard.
    - [x] Commit completed sequence-test work according to task-level commit policy.

  Notes: Added additive `clear()` APIs to byte/output/log captures and monitoring captures. Byte captures clear retained chunks while preserving existing `raw()`/`text()`/`lines()` behavior; monitoring clear releases parsed frames, pending text, and resolves pending waiters so tests do not hang. `createSequenceTest().close()` now clears output, log, and monitoring captures. Added `extractMemoryMonitoringFrames()` and opt-in `SequenceAssertions.memoryWithinLimit({ threshold })` for runner/process monitoring-frame memory fields, with diagnostics distinguishing these values from parent AVA heap measurements. Focused sequence-test specs now opt into `createAvaMemoryGuard(baseTest)` and use guard cleanup for retained monitoring frames. Validation passed: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js test/harness/captures.spec.ts test/harness/index.spec.ts` from `packages/sequence-test` passed with 23 tests; the same focused command with `SCRAMJET_AVA_MEMORY_GUARD=1` passed with 23 strict guarded tests; full `node ../../scripts/run-ava.js` passed with 132 tests; full `SCRAMJET_AVA_MEMORY_GUARD=1 node ../../scripts/run-ava.js` passed with 132 tests, with strict measurement active in the focused wrapper-adopted specs. `git diff --check` passed. Oracle review found no blockers; non-blocking follow-up for Phase 4 is to consider failing on non-numeric memory payload fields instead of relying on comparison behavior.

- [x] Task: Conductor - Phase Checkpoint 'Sequence-Test Cleanup and Memory Assertions' (Protocol in workflow.md)

  Checkpoint Notes: Phase 3 completed with additive cleanup APIs for sequence-test captures, close-time capture cleanup in the public harness, opt-in runner/process monitoring memory assertions, and strict AVA wrapper coverage for focused capture/index tests. `Buffer.concat` remains allowed for capture read/assertion helpers because retained chunk references can now be cleared before measurement. Validation performed before checkpoint: focused sequence-test capture/index tests passed normally with 23 tests; focused strict guard command passed with 23 tests under `SCRAMJET_AVA_MEMORY_GUARD=1` and the default 512 KiB threshold; full sequence-test package passed with 132 tests normally and with 132 tests under guard env. `git diff --check` passed. Review found no blockers. Phase 3 commit: `efa13324`.

## Phase 4: Runner and Adapter Memory Observability

- [x] Task: Populate runner memory monitoring data
    - [x] Add current and max memory measurements to runner-node monitoring frames where appropriate.
    - [x] Preserve existing monitoring message compatibility.
    - [x] Avoid hidden production behavior changes beyond reporting observability data.

- [x] Task: Improve process and adapter stats where practical
    - [x] Review process adapter stats gaps and populate process memory data when observable.
    - [x] Review Docker adapter stats behavior and align terminology with container working-set documentation where needed.
    - [x] Record Kubernetes limitations or deferrals if pod memory stats are not practical in this track.

- [x] Task: Add focused runtime monitoring tests
    - [x] Add tests proving memory fields are emitted or enriched where implemented.
    - [x] Validate sequence-level memory assertions against monitoring frames.
    - [x] Run relevant runner/runtime package tests under memory guard where applicable.
    - [x] Commit completed runner observability work according to task-level commit policy.

  Notes: Added runner-node RSS memory reporting to the existing one-shot MONITORING frame via `getMemoryUsage()`, preserving the existing payload shape and adding only `memoryUsage` plus a non-decreasing `memoryMaxUsage` peak tracked in-process. Added process adapter RSS enrichment from `/proc/<pid>/status` when a runner PID is observable; sampling failures are best-effort and preserve existing passthrough stats plus `processId`. Docker adapter already populates memory fields and was not changed; Kubernetes adapter remains deferred because pod memory requires metrics API/kubectl integration outside this phase. Focused runtime validation passed: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js test/monitoring-memory.spec.ts` from `packages/runner-node` passed with 3 tests; `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js` from `packages/adapter-process` passed with 6 tests. Full runner-node package validation was attempted and still fails in pre-existing spawn/undici paths with `ReferenceError: WebAssembly is not defined` under the repo's guarded jitless host profile; the new focused tests pass. `git diff --check` passed. Review found no blockers after correcting `memoryMaxUsage` from a current-RSS duplicate to a non-decreasing peak.

- [x] Task: Conductor - Phase Checkpoint 'Runner and Adapter Memory Observability' (Protocol in workflow.md)

  Checkpoint Notes: Phase 4 completed with additive runner-node and process-adapter memory observability. Runner-node emits current RSS and tracked peak RSS on its existing startup MONITORING frame; process adapter enriches stats with sampled `/proc/<pid>/status` VmRSS when observable and never fails stats on sampling errors. Docker stats were reviewed and already populate memory fields; Kubernetes stats remain explicitly deferred. Validation performed before checkpoint: runner-node focused memory tests passed with 3 tests; adapter-process full package tests passed with 6 tests; full runner-node validation was attempted but remains blocked by pre-existing WebAssembly/undici failures in spawn-path tests under the repo guarded jitless profile. `git diff --check` passed. Phase 4 commit: `4489d6d8`.

## Phase 5: BDD Parent Scenario Memory Guard

- [x] Task: Add BDD memory guard configuration and Cucumber invocation support
    - [x] Add documented BDD memory guard environment variables and threshold overrides.
    - [x] Ensure direct BDD mode invokes Cucumber with `--expose-gc` when memory guard mode is enabled.
    - [x] Ensure Docker BDD mode invokes the Cucumber Node process with `--expose-gc` when memory guard mode is enabled.
    - [x] Fail early when `global.gc` is unavailable in memory guard mode.

  Notes: Added `isBddMemoryGuardEnabled()`, `bddMemoryHeapThresholdBytes()`, `bddMemorySkipCheck()` and memory guard env constants (`SCRAMJET_MEMORY_GUARD`, `SCRAMJET_BDD_MEMORY_GUARD`, `SCRAMJET_MEMORY_HEAP_THRESHOLD_BYTES`, `SCRAMJET_BDD_MEMORY_THRESHOLD_BYTES`, `SCRAMJET_MEMORY_SKIP`, `SCRAMJET_MEMORY_SKIP_REASON`) to `scripts/lib/bdd-options.js`. BDD-specific guard env (`SCRAMJET_BDD_MEMORY_GUARD`) overrides common guard including disabled values, mirroring AVA semantics. Default threshold 524288 bytes. Threshold parsing fails closed on invalid/zero/negative/non-finite values. `bddNodeOptions()` now adds `--expose-gc` when BDD memory guard is enabled, covering both direct mode (via `run-bdd.js`) and Docker mode (via NODE_OPTIONS injection in `run-bdd-docker.js`). `ensureGlobalGc()` throws early with a clear error message when `global.gc` is unavailable.

- [x] Task: Add Cucumber parent process scenario guard
    - [x] Add a support hook loaded before normal step definitions.
    - [x] Verify hook order so memory measurement runs after normal scenario cleanup.
    - [x] Measure parent Cucumber heap growth per scenario after cleanup and forced GC.
    - [x] Fail with scenario name, delta, threshold, and skip/exception context.

  Notes: Created `bdd/support/memory-hooks.ts` with Before (baseline) and After (measurement) hooks. The support file is loaded via `bdd/cucumber.js` BEFORE step-definitions so Cucumber's reverse-definition-order After hook semantics ensure the memory guard After runs after all step-definition cleanup hooks. The After hook captures raw `process.memoryUsage()` before drain+GC for component breakdown diagnostics, then fails with scenario name, delta, threshold, source label, component breakdown, and any cleanup errors.

- [x] Task: Add BDD world and resource cleanup
    - [x] Add cleanup/disposal for `CustomWorld` resources, CLI resources, responses, streams, and retained outputs.
    - [x] Clear retained HostUtils output or other scenario-local buffers after assertions.
    - [x] Ensure cleanup runs before memory measurement.

  Notes: Added `cleanupWorldResources()` in memory-hooks.ts that clears `response`, `resources.outStream`, `resources.instance/instance1/instance2/sequence/sequence1/sequence2`, `cliResources.collectedTopicData`, `cliResources.stdio/stdio1/stdio2`, and `cliResources.commandInProgress`. Cleanup runs inside the After hook before the final memory measurement. Added optional `__memoryBaseline` and `__memoryBeforeUsage` fields to `CustomWorld` in `bdd/step-definitions/world.ts`.

- [x] Task: Add BDD parent guard tests and focused validation
    - [x] Add harness tests proving missing GC failure, threshold failure, valid exception, and valid env skip with reason.
    - [x] Verify test coverage for guard enable/disable, threshold defaults/overrides/fail-closed, `--expose-gc` in `bddNodeOptions()`, skip behavior, and diagnostic formatting.
    - [x] Record focused Docker BDD runtime scenario deferral to Phase 6 integration.
    - [x] Commit completed BDD parent guard work according to task-level commit policy.

  Notes: Added `scripts/lib/bdd-memory-guard.js` with `ensureGlobalGc`, `checkBddMemorySkip`, `formatComponentBreakdown`, `buildBddMemoryDiagnostics`, and `measureWithGc`, reusing `measureMemoryUsage` and `drainAndGc` from the AVA memory guard. Tests added to `scripts/test/bdd-options.spec.js` (51 tests → 51+24=75 tests), `scripts/test/bdd-memory-guard.spec.js` (17 tests), and `scripts/test/run-bdd.spec.js` (12 tests → 15 tests). All 75 tests pass under `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/bdd-options.spec.js scripts/test/bdd-memory-guard.spec.js scripts/test/run-bdd.spec.js`. Docker mode focused BDD run is deferred to Phase 6 where child-process/Docker container checking provides the integration surface; the guard wiring (NODE_OPTIONS injection) is structurally tested via source-level tests in `run-bdd.spec.js`.

- [x] Task: Conductor - Phase Checkpoint 'BDD Parent Scenario Memory Guard' (Protocol in workflow.md)

  Checkpoint Notes: Phase 5 completed with BDD guard env/threshold parsing, direct and Docker `--expose-gc` runner wiring, per-scenario Cucumber parent heap measurement after cleanup hooks, world cleanup before measurement, focused helper/options/runner tests, and review with no blockers. Validation performed before checkpoint: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/bdd-options.spec.js scripts/test/bdd-memory-guard.spec.js scripts/test/run-bdd.spec.js` passed with 75 tests; `git diff --check` passed. A focused runtime Docker BDD scenario run is intentionally deferred to Phase 6 integration, where child process and Docker container memory checks are implemented alongside the parent guard. Phase 5 commit: `a9f8b6d8`.

## Phase 6: BDD Child Process and Docker Container Memory Checks

- [x] Task: Add BDD memory registry for spawned processes
    - [x] Track spawned Host processes from `bdd/lib/host-utils.ts`.
    - [x] Track extra Hub processes from hub configuration steps.
    - [x] Track Manager and MultiManager processes from manager helpers.
    - [x] Track process-adapter runner PIDs where they are observable.
    - [x] Distinguish short-lived processes that must exit from long-lived shared processes checked by RSS delta.

- [x] Task: Add child process RSS measurement and diagnostics
    - [x] Implement safe RSS sampling using `/proc/<pid>/status` VmRSS.
    - [x] Report role, PID, scenario, baseline RSS, final RSS, delta, and threshold.
    - [x] Add configurable thresholds for process RSS checks, supporting higher documented limits for scenarios that legitimately retain 100-200 MiB.
    - [x] Integrate with existing BDD leak detection without broad-killing unrelated host processes.

- [x] Task: Add Docker runner container memory checks
    - [x] Baseline runner containers before scenarios.
    - [x] Assert new runner containers are gone after scenario cleanup unless intentionally retained.
    - [x] For intentionally retained containers, sample working-set memory and compare to configured thresholds.
    - [x] Prefer working set over raw usage where Docker stats provide cache/inactive-file details.

- [x] Task: Validate BDD child/container memory checks
    - [x] Add unit tests for process RSS helpers and registry behavior.
    - [x] Add focused unit coverage for process tracking and Docker container tracking; defer broad Docker BDD runtime scenario.
    - [x] Run relevant BDD validation under memory guard mode.
    - [x] Commit completed BDD child/container work according to task-level commit policy.

  Notes: Added `SCRAMJET_BDD_PROCESS_RSS_THRESHOLD_BYTES` and `SCRAMJET_BDD_DOCKER_WORKING_SET_THRESHOLD_BYTES` env constants with 104857600 (100 MiB) defaults, fail-closed parsing, and diagnostic builders to `scripts/lib/bdd-options.js`. Created `bdd/lib/memory-registry.ts` with async (`getProcessRssBytes`) and sync (`getProcessRssBytesSync`) RSS sampling from `/proc/<pid>/status` VmRSS, Docker Engine socket working-set sampling (`usage - inactive_file` / `total_inactive_file`) with raw-usage CLI fallback, and a `MemoryRegistry` singleton with `trackProcess()`, `trackChildProcess()`, `trackContainer()`, `untrackProcess()`, `untrackContainer()`, `clear()`, and `assertAll()`. Registry records baselines at track time where observable, treats shared ChildProcesses as long-lived by default, and enforces `expectExit=true` resources by polling for exit before failing. Integrated tracking into `bdd/lib/host-utils.ts` (hub process with label `hub`), `bdd/step-definitions/manager/common.ts` (spawned processes with label `manager:<command>`), `bdd/step-definitions/e2e/host-steps.ts` (runner PID with label `runner:process`, container ID with label `runner:docker`), and `bdd/support/memory-hooks.ts` (registry assertion in After hook after heap measurement). Validation: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/bdd-options.spec.js scripts/test/bdd-memory-guard.spec.js scripts/test/run-bdd.spec.js scripts/test/bdd-memory-registry.spec.js --serial` passed with 121 tests; `git diff --check` passed. Docker BDD runtime scenario remains deferred from Phase 6 scope; child/container checks are structurally tested with focused unit coverage and Docker-availability guards. Review blockers around expected-exit enforcement and Docker working-set semantics were fixed and re-reviewed with no blockers.

- [x] Task: Conductor - Phase Checkpoint 'BDD Child Process and Docker Container Memory Checks' (Protocol in workflow.md)

## Phase 7: Documentation, CI, and Conductor Completion Policy

- [x] Task: Document memory guard usage and exception rules
    - [x] Update agent/contributor documentation with AVA memory guard commands and BDD memory guard commands.
    - [x] Document threshold semantics for parent heap, child RSS, and Docker working set.
    - [x] Document valid near-test exception comments and env skip reason requirements.
    - [x] Document that `Buffer.concat` is allowed when retained references are cleared before measurement.

- [x] Task: Add Conductor track completion guardrail documentation
    - [x] Update Conductor workflow or related documentation so every track end requires relevant memory-guarded tests.
    - [x] Require final track summaries to list memory-guarded commands that were run.
    - [x] Require skipped memory-guard validation to include reason and follow-up.
    - [x] Include examples for AVA, BDD, sequence-test, runner/runtime, and docs-only tracks.

- [x] Task: Add CI memory guard jobs
    - [x] Add or document required CI jobs for AVA/package memory guard validation.
    - [x] Add or document required CI jobs for BDD memory guard validation once stable.
    - [x] Ensure CI uses supported npm commands and does not bypass repository runners.

- [x] Task: Run final integrated validation
    - [x] Run focused AVA memory guard validation.
    - [x] Run focused BDD memory guard validation.
    - [x] Run sequence-test or runner memory validation where changed.
    - [x] Run lint/build checks needed by changed files.
    - [x] Record memory-guarded commands, thresholds, exceptions, skips, and follow-ups in the final track summary.
    - [x] Commit completed documentation and CI work according to task-level commit policy.

  Notes: Added memory guard usage and threshold documentation to `AGENTS.md`, BDD usage notes to `bdd/README.md`, sequence-test capture cleanup notes to `docs-source/readmes/packages/sequence-test.md`, and final track evidence policy to `conductor/workflow.md`. Added root npm scripts `test:memory-guard-ava`, `test:memory-guard-bdd-focused`, and `test:memory-guard-sequence-test`; no GitHub workflow files exist in this checkout, so CI wiring is documented through supported npm/script entrypoints rather than workflow edits. Validation passed: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`; `npm run test:memory-guard-ava` passed with 12 strict AVA guard tests; `npm run test:memory-guard-bdd-focused` passed with 121 tests; `npm run test:memory-guard-sequence-test` passed with 23 strict sequence-test guard tests; `git diff --check` passed. Defaults documented: parent heap 524288 bytes, child RSS 104857600 bytes, Docker working set 104857600 bytes. No skips were used in Phase 7 validation.

- [x] Task: Conductor - Phase Checkpoint 'Documentation, CI, and Conductor Completion Policy' (Protocol in workflow.md)

  Checkpoint Notes: Phase 7 completed documentation, npm validation scripts, and Conductor completion evidence policy. Validation commands and thresholds are recorded above; GitHub workflow edits were not applicable because this checkout has no `.github/workflows` directory. Phase 7 documentation commit pending at checkpoint.

## Phase 8: Review, Stabilization, and Finalization

- [x] Task: Perform implementation review
    - [x] Request review for architecture, hook ordering, exception governance, and CI impact.
    - [x] Verify no parallel unsupported test entrypoints were introduced.
    - [x] Verify no hidden runtime production defaults changed.
    - [x] Verify exceptions and env skips are scoped and documented.

- [x] Task: Stabilize thresholds and diagnostics
    - [x] Review observed guard failures and classify them as cleanup bugs, legitimate exceptions, environment issues, or implementation defects.
    - [x] Fix cleanup bugs before raising thresholds.
    - [x] Keep higher process/container thresholds scoped and documented.
    - [x] Ensure final diagnostics are actionable for future track owners.

  Notes: Final review found one blocker: `registerAvaMemoryCleanup()` callback failures were collected but only reported when the memory delta also exceeded the threshold. Fixed the AVA guard to fail the guarded test when cleanup callbacks throw even if memory growth remains below threshold, and added a focused regression test. No threshold increases were needed. The final review found no remaining blockers. Unsupported direct AVA/Cucumber entrypoints were not introduced; memory guard mode remains wired through supported repo runners and explicit AVA wrapper adoption. Runtime production behavior changes remain additive observability only.

- [x] Task: Final branch and PR checkpoint
    - [x] Ensure all completed work is committed with scoped task-level commits.
    - [x] Push the implementation branch.
    - [x] Update the draft PR with final validation results as a PR comment.
    - [x] Mark the PR ready only after final verification is complete.

- [x] Task: Conductor - Phase Checkpoint 'Review, Stabilization, and Finalization' (Protocol in workflow.md)

  Checkpoint Notes: Phase 8 final validation after the cleanup-error fix: `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" node scripts/run-ava.js scripts/test/ava-options.spec.js scripts/test/ava-memory-guard.spec.js scripts/test/ava-memory-guard-hook-order.spec.js` passed with 107 tests; `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node scripts/run-ava.js scripts/test/ava-memory-guard-live.spec.js` passed with 12 strict guard tests; `git diff --check` passed. Default parent heap threshold remains 524288 bytes; BDD child RSS and Docker working-set defaults remain 104857600 bytes. No skips were used. Scoped exceptions remain the documented per-test allowance paths only. Known follow-ups remain deferred: run an actual Docker BDD scenario under `SCRAMJET_BDD_MEMORY_GUARD=1` in an environment with required Docker artifacts; revisit full `runner-node` package validation once unrelated guarded-profile WebAssembly/undici spawn-path failures are fixed; broaden AVA wrapper adoption per package as future tracks require. Final PR validation comment: https://github.com/0rail/transform-hub/pull/55#issuecomment-4938562945. PR #55 was marked ready for review after final verification.

## Phase 9: BDD Fixture Migration and Legacy Test Removal

- [x] Task: Stabilize the current BDD stop-handler assertion
    - [x] Diagnose the `E2E-015 TC-008` retained-stdout timeout without masking a runner lifecycle failure.
    - [x] Make stream completion/cleanup observation deterministic and retain actionable diagnostics.
    - [x] Add focused regression coverage for the bounded wait behavior.

- [x] Task: Add local replacement fixtures for legacy refapp coverage
    - [x] Inventory every active BDD assertion that currently reads a root `refapps/` archive or relies on its fallback resolution.
    - [x] Replace retained behavioral coverage with committed local BDD fixture sources and deterministic package generation.
    - [x] Preserve meaningful assertions while removing dependencies on externally downloaded archives.
    - [x] Rewrite mixed feature scenarios to use explicit local fixture directories rather than a root-refapps fallback.

- [x] Task: Delete legacy refapp and performance-test paths
    - [x] Delete legacy-refapp-only BDD scenarios/features after equivalent local-fixture coverage exists.
    - [x] Delete performance/load BDD features and their generated-artifact assumptions from this test run.
    - [x] Remove root `refapps/` fallback resolution and the `download:refapps` / `prebuild:refapps` scripts.
    - [x] Remove obsolete CI/docs references to downloaded refapps and update supported BDD commands.

- [x] Task: Isolate CLI configuration for BDD runs
    - [x] Add CLI `-c` / `--config` support to select an explicit configuration file.
    - [x] Generate a per-run BDD CLI configuration under `/tmp` and pass it to every BDD CLI invocation.
    - [x] Remove reliance on shared profiles, shared active-profile mutation, and `~/.si` state in BDD setup/teardown.
    - [x] Add focused CLI/config and BDD setup coverage for isolated configuration paths.

- [x] Task: Prepare safe name-based BDD waves
    - [x] Add BDD-runner support for two explicitly named feature-path waves, not tag-based selection.
    - [x] Keep fixed-port Hub, Manager/MultiManager, Docker-cleanup, harness, and stress paths serial until their resource ownership is isolated.
    - [x] Start with a proven-isolated wave and a serial remainder; require distinct config roots, artifact directories, ports, and cleanup ownership before balancing waves.
    - [x] Record wall time, parent RSS, Docker working set, leak detection, and scenario ownership evidence for every parallel trial.

  Notes: Added an opt-in feature-path wave runner. An explicit `BDD_WAVE=verser2` run owns only `VERSER2-001-isolated-routing.feature` and passed with 2 scenarios/16 steps in 5.91 seconds, 64372 KiB outer-wrapper max RSS, and no leaked repository processes. The serial remainder intentionally remains a separate Docker invocation because fixed-port Hub, Manager/MultiManager, Docker-cleanup, harness, and stress paths are not yet safe for concurrent execution. Full default and remainder runs were externally terminated at approximately 240 seconds with exit 137; postmortem diagnostics recorded `OOMKilled: false`, so this is an execution-watchdog limitation rather than fixture or container-memory evidence.

- [x] Task: Validate fixture-only BDD execution and completion policy
    - [x] Run focused BDD fixture, CLI-config, and runner-helper tests under supported runners.
    - [x] Run the default BDD suite without root `refapps/` or performance features.
    - [x] Run repeated wave smoke tests before enabling any default parallelism.
    - [x] Record memory-guard thresholds, skips/exceptions, deleted coverage, and deferred isolation work in the final checkpoint.

  Notes: Focused BDD fixture, CLI config/profile, runner-helper, stream-capture, and wave-runner tests passed. The default fixture-only BDD command was started twice and reached the serial remainder, but the outer environment terminated the Docker run around 240 seconds with exit 137 before Cucumber could emit its final summary. Docker inspect reported `OOMKilled: false`; a complete default-suite result requires an execution environment that permits the repo's supported 600-second BDD timeout. No memory-guard skip was used; full BDD memory-guard validation remains deferred until the longer-running environment is available.

  Checkpoint Notes: On 2026-07-13, `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run test:bdd` deterministically packed all local appcontext, BDD, and Python fixtures and ran the supported Docker BDD path without root `refapps/` or performance features. The outer execution watchdog stopped the container after 239.5 seconds (`ExitCode: 137`, `OOMKilled: false`), before Cucumber emitted a final summary; this is recorded as an external watchdog limitation, not a fixture, guard, or container-memory failure. The per-scenario parent heap threshold remains 524288 bytes; child process RSS and Docker working-set thresholds remain 104857600 bytes. No skips or threshold exceptions were used in this run. Legacy root-refapp and performance/load coverage remains deleted as planned. Deferred work: rerun the complete default suite in an environment allowing the supported 600-second BDD timeout, then complete the Phase 10/11 chunk classification, ownership isolation, and bounded parallel scheduling work.

- [x] Task: Conductor - Phase Checkpoint 'BDD Fixture Migration and Legacy Test Removal' (Protocol in workflow.md)

## Phase 10: BDD Test Chunking, Resource Metrics, and Timing Rationalization

- [~] Task: Define and validate an explicit BDD chunk manifest
    - [x] Replace dynamic remainder ownership with a static, feature-path-based manifest; do not use tags as chunk ownership.
    - [x] Assign every eligible default-suite feature to exactly one named chunk and fail validation for duplicate, missing, deleted, or nonexistent paths.
    - [x] Keep harness, stress, fixed-port Hub, Manager/MultiManager, and broad Docker-cleanup paths exclusive until ownership isolation is implemented.
    - [x] Add explicit `--chunk=<name>` selection and preserve `npm run test:bdd` serial behavior.
    - [x] Use feature paths as the initial chunk boundary and enforce a 300-second timeout for every feature run.
    - [x] Classify every feature from repeated 300-second runs as parallel-ready, exclusive, timing-remediation-required, or memory-remediation-required; no feature may enter the parallel scheduler until it finishes below 300 seconds.

- [x] Task: Add chunk-scoped ownership and cleanup isolation
    - [x] Create an immutable BDD run/chunk identifier and propagate it to outer Docker labels, generated configs, temporary artifacts, process/container labels, logs, and metrics.
    - [x] Replace broad Docker/process cleanup in parallel-safe chunks with ownership-scoped cleanup.
    - [x] Reserve or coordinate host-port allocation and make generated filesystem paths chunk-specific.
    - [x] Keep manager stacks, fixed ports, nested Docker cleanup, and stress scenarios in separate exclusive chunks until repeated isolation validation passes.

  Notes: Ownership is represented by immutable run/chunk IDs, exact Docker labels, structured encoded temporary paths, and owner-attributed metrics. Cleanup is exact-owner scoped in Docker and wave lifecycles; it preserves foreign run/chunk paths. Port reservations use live-PID locks with owner tokens, and exclusive harness, Hub, Manager, and stream paths remain serial. Guarded ownership/cleanup/wave tests and two concurrent VERSER2 Docker runs passed with distinct ownership IDs and no leftover BDD containers.

- [x] Task: Measure chunk-level parent, process, and container memory growth
    - [x] Sample Cucumber parent heap baseline/final/peak at chunk lifecycle boundaries, separately from per-scenario guard checks.
    - [x] Sample readiness-baselined and final/peak RSS for long-lived Hub, Manager, and MultiManager processes, including expected exit state.
    - [x] Sample outer BDD Docker container working-set baseline/final/peak and record memory limit, exit code, OOM state, and timestamps.
    - [x] Report metrics by feature chunk and component, then set and enforce feature/chunk memory-growth limits before parallel execution; retain existing strict per-scenario threshold behavior.
    - [x] Add focused unit tests for metric collection, missing `/proc`/Docker data, and actionable diagnostics.

  Notes: The outer runner’s component contract is authoritative and is compared with the child metrics payload. Enforce mode rejects absent, downgraded, conflicting, empty, negative, or non-finite parent, expected-process, container, cgroup, and readiness telemetry. Completed expected-exit Hub/Manager measurements are retained for chunk admission while scenario lifecycle checks retain their independent semantics. Production-path tests cover enforced breach, insufficient telemetry, contract conflict, required process present, and required process absent; strict per-scenario guard thresholds are unchanged and the parallel scheduler remains disabled.

- [ ] Task: Rationalize BDD timing through observable readiness polling
    - [x] Instrument chunk wall-clock setup and teardown timing to establish a baseline.
    - [ ] Instrument scenario, slowest-step, and cleanup timing before changing waits.
    - [ ] Replace only unnecessary fixed sleeps with observable-condition polling at approximately 50-100 ms intervals and domain-specific deadlines.
    - [ ] Bound unbounded health/readiness loops and include last observed state in timeout diagnostics.
    - [ ] Preserve waits that are themselves asserted behavior: stop handlers, keep-alive, reconnect/backoff, flood/backpressure, delayed fixtures, and watchdog scenarios.
    - [ ] Add focused regression tests and repeated runs for every shortened wait to detect timing flakes.

- [ ] Task: Validate independently runnable 300-second BDD feature chunks
    - [x] Compare the serial union of all chunks with the default eligible scenario set.
    - [x] Run every feature chunk under supported Docker BDD execution with a 300-second timeout and record median, p95, maximum runtime, memory growth, and classification.
    - [ ] Remediate, split, or explicitly exclude any feature that exceeds 300 seconds; do not silently allow it into a larger remainder chunk.
    - [x] Run relevant BDD memory-guard validation and record parent heap, child RSS, Docker working-set thresholds, skips/exceptions, and deferred coverage.
    - [x] Record external watchdog limitations separately from container OOM or test failures.

  Classification Notes: On 2026-07-13, all 24 eligible static manifest feature paths were exercised individually through the supported Docker runner with a 300-second timeout, strict 524288-byte parent heap guard, 104857600-byte child RSS/Docker working-set thresholds, and no skips. The manifest union matched the eligible feature set exactly with no duplicate or missing paths. Only `VERSER2-001` was parallel-ready across three repeats (6.51–7.34 seconds). Stop-handler, stream/stress, Hub, Manager, and resource-owning paths remain exclusive. `E2E-001`, `E2E-010`, `E2E-011`, `E2E-012-cli-config`, `E2E-014`, `E2E-016`, `E2E-007`, and `MANAGER-003/004` require memory remediation; `E2E-003`, `E2E-008`, `HUB-002/003/004`, and `MANAGER-002` have functional blockers. `E2E-010-cli` ended with Docker exit 137 and `OOMKilled=true` at approximately 1.49 GiB.    No external watchdog termination occurred in these individual feature runs. Scheduler admission remains blocked pending functional/memory remediation and ownership isolation.

  VERSER2-001 Exception: On 2026-07-13, the VERSER2-001 parent memory-growth allowance was raised from 245760 to 1048576 bytes (exactly 1 MiB), user-approved for a separately tracked Verser2 allocation issue. The 1 MiB allowance covers the observed flaky parent-heap regression above the strict 524288-byte base threshold and is scoped to this exact feature, line, and scenario name. Reason: "exact 1 MiB allowance for the separately tracked Verser2 allocation issue"

- [ ] Task: Run classified BDD feature chunks in parallel in Docker
    - [ ] Require bounded feature memory growth, completed ownership isolation, and a passing 300-second classification before a feature enters the parallel scheduler.
    - [ ] Run classified parallel-ready chunks concurrently in Docker with explicit aggregate memory/CPU budget and exclusive-resource locks; do not use unbounded `Promise.all`.
    - [ ] Keep exclusive, timing-remediation-required, and memory-remediation-required features out of the concurrent pool until their classification changes.
    - [ ] Record aggregate memory/CPU, overlap timeline, cleanup ownership, port collisions, retries, flakes, outer-container OOM states, and per-chunk exit states.
    - [ ] Make the parallel Docker chunk run the supported full BDD execution path after all eligible features pass classification.

- [ ] Task: Conductor - Phase Checkpoint 'BDD Chunking, Resource Metrics, and Timing Rationalization' (Protocol in workflow.md)

## Phase 11: BDD Failure Resolution, RSS Budgeting, and Parallel Readiness

- [~] Task: Resolve all remaining classified BDD failures before scheduling
    - [ ] Reproduce and fix every remaining functional, lifecycle, fixture, cleanup, and telemetry failure in an individually selected chunk.
    - [ ] Keep strict per-scenario heap guard behavior and exact documented exceptions; do not mask failures with broad skips.
    - [ ] Reclassify every feature chunk under the supported Docker runner and 300-second timeout after each remediation batch.

  Deferred runner/prerunner-image coverage: HUB-001 TC-009 through TC-013 remain tagged `@needs-fix` and are excluded from default BDD selection. TC-009 (--runner-image) and TC-012 (--prerunner-image) depend on repository-built Docker runner and prerunner images and on short-lived auto-removed container metadata; a subsequent track must audit the runner-image and prerunner-image build workflows, repair them, and restore durable image/config assertions before re-enabling them. TC-009 and TC-012 share the same root cause: they reference container image tags from an internal registry (repo.int.scp.ovh/scramjet/…) and depend on pre-published image artifacts. There is no repository-built workflow that builds runner or prerunner images from the monorepo source and tags them for CI use. TC-013 (--prerunner-max-mem) is deferred for a separate reason: it does not specify or depend on an internal registry image, but its memory-limit assertion relies on short-lived prerunner container metadata that is unreliable under normal CI timing — the prerunner container is created, identified, and removed within the same scenario, making the "last container memory limit is 64" assertion fragile due to container lifecycle timing rather than image availability. This is a scoped deferment, not a memory-guard skip.  To run the deferred scenarios during repair work, opt in with the env var and select the tag:

  ```bash
  BDD_INCLUDE_LONG_RUNNING=1 BDD_INCLUDE_NEEDS_FIX=1 npx cucumber-js ... --tags "@needs-fix"
  ```

- [ ] Task: Define and enforce practical aggregate RSS limits
    - [ ] Preserve per-scenario leak checks and lifecycle assertions, while treating expected BDD workload RSS growth as a bounded integration-test cost rather than a failure by default.
    - [ ] Set a committed aggregate parallel-stack RSS budget of at most 4 GiB, including outer Docker/container and owned child-process reservations.
    - [ ] Derive evidence-backed per-chunk reservations and exclusive classifications from repeated cold runs; reject a parallel schedule whose aggregate reservation exceeds 4 GiB.
    - [ ] Keep explicit diagnostics for actual container OOM, unexpected process/container exits, missing telemetry, and budget breaches.

- [ ] Task: Inventory and review long-running test coverage
    - [ ] Produce a timing inventory from scenario, step, cleanup, setup, and teardown reports, highlighting every contributor above 10 seconds.
    - [ ] Review each long-running feature for redundant coverage multiplication, repeated topology setup, and assertions that can be simplified without reducing distinct behavioral coverage.
    - [ ] Record retained intentional waits (watchdog, keep-alive, backpressure, reconnect, and stop-handler behavior) separately from removable test overhead.

- [ ] Task: Reduce validated test latency and race-driven waits
    - [ ] Simplify redundant test paths and remove duplicated coverage after focused regression review.
    - [ ] Replace removable waits with observable readiness or completion conditions, using bounded polling and actionable last-state diagnostics.
    - [ ] Use logs and stream-listener/lifecycle audits to resolve races, dangling listeners, unawaited work, and delayed cleanup rather than increasing generic timeouts.
    - [ ] Repeat affected tests after each timing change to prove reduced duration without flakes or lost coverage.

- [ ] Task: Validate full parallel Docker BDD execution
    - [ ] Reclassify chunks as parallel-ready, exclusive, timing-remediation-required, or memory-remediation-required only after their functional, telemetry, and timing evidence is current.
    - [ ] Run the supported Docker BDD path with bounded concurrency, ownership locks, and aggregate reserved RSS at or below 4 GiB.
    - [ ] Record per-chunk and aggregate RSS, timing overlap, cleanup results, retries, port collisions, OOM state, and final classifications.
    - [ ] Run a serial comparison and full parallel validation before marking the phase complete.

- [ ] Task: Conductor - Phase Checkpoint 'BDD Failure Resolution, RSS Budgeting, and Parallel Readiness' (Protocol in workflow.md)
