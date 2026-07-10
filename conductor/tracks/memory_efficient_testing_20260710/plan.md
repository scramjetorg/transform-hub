# Implementation Plan: Memory Efficient Testing

## Phase 1: Track Setup and Test Surface Inventory

- [x] Task: Establish implementation branch and review surface
    - [x] Capture the current branch as the PR base during implementation.
    - [x] Create the implementation branch `conductor/memory_efficient_testing_20260710` from current HEAD.
    - [x] Open or update a draft PR using the track specification as the PR body when required for review visibility.

  Notes: Captured `feat/manager-oss` as the PR base after user approval because it is non-main and ahead of upstream by one commit. Created implementation branch `conductor/memory_efficient_testing_20260710`. Draft PR creation is deferred until the first required PR visibility/manual verification point.

- [ ] Task: Inventory relevant test and memory infrastructure
    - [ ] Review package AVA runner files: `scripts/run-ava.js` and `scripts/lib/ava-options.js`.
    - [ ] Review BDD runner files: `scripts/run-bdd.js`, `scripts/run-bdd-docker.js`, `scripts/lib/bdd-options.js`, and `scripts/lib/bdd-cleanup.js`.
    - [ ] Review Cucumber support and lifecycle files: `bdd/cucumber.js`, `bdd/step-definitions/world.ts`, `bdd/step-definitions/e2e/host-steps.ts`, and `bdd/lib/host-utils.ts`.
    - [ ] Review sequence-test capture/fixture files including `packages/sequence-test/src/captures.ts` and fake instance support.
    - [ ] Review runner/runtime monitoring files including `packages/types/src/messages/monitoring.ts`, `packages/runner-node`, and process/docker adapter stats paths.
    - [ ] Record existing reusable helpers and any intentional reasons for package-local implementation.

- [ ] Task: Define shared memory measurement semantics
    - [ ] Define parent test-process heap metric as `heapUsed + external + arrayBuffers` after forced GC.
    - [ ] Define test-runner heap target threshold with a planned 512 KiB default and documented env override.
    - [ ] Define child-process RSS semantics separately from Node heap checks.
    - [ ] Define Docker runner container working-set semantics separately from raw Docker memory usage.
    - [ ] Document how higher process/container thresholds such as 100-200 MiB are represented and justified.

- [ ] Task: Conductor - Phase Checkpoint 'Track Setup and Test Surface Inventory' (Protocol in workflow.md)

## Phase 2: AVA Package-Test Memory Guard

- [ ] Task: Add AVA memory guard configuration and runner wiring
    - [ ] Add documented environment variables for enabling AVA memory guard mode and threshold overrides.
    - [ ] Ensure memory guard mode runs the AVA process with `--expose-gc`.
    - [ ] Force or validate serial AVA execution in memory guard mode.
    - [ ] Reject conflicting user-provided concurrency options when deterministic measurement would be invalid.
    - [ ] Ensure the supported `scripts/run-ava.js` path remains the only AVA entrypoint.

- [ ] Task: Implement AVA per-test memory measurement
    - [ ] Add guard lifecycle that samples before and after each test.
    - [ ] Drain the event loop and run GC twice before each measurement.
    - [ ] Measure `heapUsed + external + arrayBuffers`.
    - [ ] Fail with actionable diagnostics when growth exceeds threshold.
    - [ ] Verify measurement happens after test teardown; add a hook-order self-test or fallback guarded helper if global hooks cannot guarantee ordering.

- [ ] Task: Add AVA exception and skip support
    - [ ] Support near-test documented exceptions with threshold and reason.
    - [ ] Support environment-based skip only when a reason is supplied and printed.
    - [ ] Fail or warn clearly for silent, broad, or reasonless skips.
    - [ ] Include examples for valid exceptions and invalid broad skips.

- [ ] Task: Validate AVA guard on focused packages
    - [ ] Add or update runner self-tests for option parsing, `--expose-gc`, serial execution, missing GC failure, threshold failure, and documented exception behavior.
    - [ ] Run the narrowest runner-helper validation command.
    - [ ] Run at least one deterministic package surface under AVA memory guard mode.
    - [ ] Commit completed AVA guard work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'AVA Package-Test Memory Guard' (Protocol in workflow.md)

## Phase 3: Sequence-Test Cleanup and Memory Assertions

- [ ] Task: Add deterministic cleanup to sequence-test captures
    - [ ] Add `clear()` or `dispose()` behavior to byte, output, log, and monitoring captures where retained data exists.
    - [ ] Ensure captured chunks, concatenated buffers, parsed frames, waiters, and pending text can be released.
    - [ ] Update sequence-test APIs without breaking existing callers unnecessarily.

- [ ] Task: Add memory-aware sequence-test assertions or helpers
    - [ ] Add helper assertions for bounded memory growth where monitoring data is available.
    - [ ] Keep assertions opt-in for scenarios that exercise runner/runtime memory behavior.
    - [ ] Ensure helpers distinguish parent harness heap from child runner/process memory.

- [ ] Task: Update sequence-test consumers and tests
    - [ ] Update tests to clear retained chunks and captures in teardown.
    - [ ] Keep `Buffer.concat` allowed for assertions while clearing references after use.
    - [ ] Add focused tests proving cleanup/disposal releases retained capture state.
    - [ ] Run sequence-test package validation under the AVA memory guard.
    - [ ] Commit completed sequence-test work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'Sequence-Test Cleanup and Memory Assertions' (Protocol in workflow.md)

## Phase 4: Runner and Adapter Memory Observability

- [ ] Task: Populate runner memory monitoring data
    - [ ] Add current and max memory measurements to runner-node monitoring frames where appropriate.
    - [ ] Preserve existing monitoring message compatibility.
    - [ ] Avoid hidden production behavior changes beyond reporting observability data.

- [ ] Task: Improve process and adapter stats where practical
    - [ ] Review process adapter stats gaps and populate process memory data when observable.
    - [ ] Review Docker adapter stats behavior and align terminology with container working-set documentation where needed.
    - [ ] Record Kubernetes limitations or deferrals if pod memory stats are not practical in this track.

- [ ] Task: Add focused runtime monitoring tests
    - [ ] Add tests proving memory fields are emitted or enriched where implemented.
    - [ ] Validate sequence-level memory assertions against monitoring frames.
    - [ ] Run relevant runner/runtime package tests under memory guard where applicable.
    - [ ] Commit completed runner observability work according to task-level commit policy.

- [ ] Task: Conductor - Phase Checkpoint 'Runner and Adapter Memory Observability' (Protocol in workflow.md)

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
