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

- [ ] Task: Add BDD memory guard configuration and Cucumber invocation support
    - [ ] Add documented BDD memory guard environment variables and threshold overrides.
    - [ ] Ensure direct BDD mode invokes Cucumber with `--expose-gc` when memory guard mode is enabled.
    - [ ] Ensure Docker BDD mode invokes the Cucumber Node process with `--expose-gc` when memory guard mode is enabled.
    - [ ] Fail early when `global.gc` is unavailable in memory guard mode.

- [ ] Task: Add Cucumber parent process scenario guard
    - [ ] Add a support hook loaded before normal step definitions.
    - [ ] Verify hook order so memory measurement runs after normal scenario cleanup.
    - [ ] Measure parent Cucumber heap growth per scenario after cleanup and forced GC.
    - [ ] Fail with scenario name, delta, threshold, and skip/exception context.

- [ ] Task: Add BDD world and resource cleanup
    - [ ] Add cleanup/disposal for `CustomWorld` resources, CLI resources, responses, streams, and retained outputs.
    - [ ] Clear retained HostUtils output or other scenario-local buffers after assertions.
    - [ ] Ensure cleanup runs before memory measurement.

- [ ] Task: Add BDD parent guard tests and focused validation
    - [ ] Add harness tests proving hook order, missing GC failure, threshold failure, valid exception, and valid env skip with reason.
    - [ ] Run a focused BDD memory guard scenario in Docker mode.
    - [ ] Run direct mode only if needed for diagnostic coverage.
    - [ ] Commit completed BDD parent guard work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'BDD Parent Scenario Memory Guard' (Protocol in workflow.md)

## Phase 6: BDD Child Process and Docker Container Memory Checks

- [ ] Task: Add BDD memory registry for spawned processes
    - [ ] Track spawned Host processes from `bdd/lib/host-utils.ts`.
    - [ ] Track extra Hub processes from hub configuration steps.
    - [ ] Track Manager and MultiManager processes from manager helpers.
    - [ ] Track process-adapter runner PIDs where they are observable.
    - [ ] Distinguish short-lived processes that must exit from long-lived shared processes checked by RSS delta.

- [ ] Task: Add child process RSS measurement and diagnostics
    - [ ] Implement safe RSS sampling using `/proc/<pid>/status` or `ps -o rss= -p <pid>`.
    - [ ] Report role, PID, scenario, baseline RSS, final RSS, delta, and threshold.
    - [ ] Add configurable thresholds for process RSS checks, supporting higher documented limits for scenarios that legitimately retain 100-200 MiB.
    - [ ] Integrate with existing BDD leak detection without broad-killing unrelated host processes.

- [ ] Task: Add Docker runner container memory checks
    - [ ] Baseline runner containers before scenarios.
    - [ ] Assert new runner containers are gone after scenario cleanup unless intentionally retained.
    - [ ] For intentionally retained containers, sample working-set memory and compare to configured thresholds.
    - [ ] Prefer working set over raw usage where Docker stats provide cache/inactive-file details.

- [ ] Task: Validate BDD child/container memory checks
    - [ ] Add unit tests for process RSS helpers and registry behavior.
    - [ ] Add or update focused Cucumber scenarios covering process tracking and Docker container tracking.
    - [ ] Run relevant BDD validation under memory guard mode.
    - [ ] Commit completed BDD child/container work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'BDD Child Process and Docker Container Memory Checks' (Protocol in workflow.md)

## Phase 7: Documentation, CI, and Conductor Completion Policy

- [ ] Task: Document memory guard usage and exception rules
    - [ ] Update agent/contributor documentation with AVA memory guard commands and BDD memory guard commands.
    - [ ] Document threshold semantics for parent heap, child RSS, and Docker working set.
    - [ ] Document valid near-test exception comments and env skip reason requirements.
    - [ ] Document that `Buffer.concat` is allowed when retained references are cleared before measurement.

- [ ] Task: Add Conductor track completion guardrail documentation
    - [ ] Update Conductor workflow or related documentation so every track end requires relevant memory-guarded tests.
    - [ ] Require final track summaries to list memory-guarded commands that were run.
    - [ ] Require skipped memory-guard validation to include reason and follow-up.
    - [ ] Include examples for AVA, BDD, sequence-test, runner/runtime, and docs-only tracks.

- [ ] Task: Add CI memory guard jobs
    - [ ] Add or document required CI jobs for AVA/package memory guard validation.
    - [ ] Add or document required CI jobs for BDD memory guard validation once stable.
    - [ ] Ensure CI uses supported npm commands and does not bypass repository runners.

- [ ] Task: Run final integrated validation
    - [ ] Run focused AVA memory guard validation.
    - [ ] Run focused BDD memory guard validation.
    - [ ] Run sequence-test or runner memory validation where changed.
    - [ ] Run lint/build checks needed by changed files.
    - [ ] Record memory-guarded commands, thresholds, exceptions, skips, and follow-ups in the final track summary.
    - [ ] Commit completed documentation and CI work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'Documentation, CI, and Conductor Completion Policy' (Protocol in workflow.md)

## Phase 8: Review, Stabilization, and Finalization

- [ ] Task: Perform implementation review
    - [ ] Request review for architecture, hook ordering, exception governance, and CI impact.
    - [ ] Verify no parallel unsupported test entrypoints were introduced.
    - [ ] Verify no hidden runtime production defaults changed.
    - [ ] Verify exceptions and env skips are scoped and documented.

- [ ] Task: Stabilize thresholds and diagnostics
    - [ ] Review observed guard failures and classify them as cleanup bugs, legitimate exceptions, environment issues, or implementation defects.
    - [ ] Fix cleanup bugs before raising thresholds.
    - [ ] Keep higher process/container thresholds scoped and documented.
    - [ ] Ensure final diagnostics are actionable for future track owners.

- [ ] Task: Final branch and PR checkpoint
    - [ ] Ensure all completed work is committed with scoped task-level commits.
    - [ ] Push the implementation branch.
    - [ ] Update the draft PR with final validation results as a PR comment.
    - [ ] Mark the PR ready only after final verification is complete.

- [ ] Task: Conductor - Phase Checkpoint 'Review, Stabilization, and Finalization' (Protocol in workflow.md)
