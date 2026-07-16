# Specification: Memory Efficient Testing

## Overview

Implement strict memory-growth guardrails across the Scramjet Transform Hub test stack so package tests, BDD scenarios, sequence-test harnesses, runner/runtime checks, and Conductor track completion workflows actively prevent accidental memory retention. The implementation should adapt the memory-checking model reviewed from `signicode/verser2#51` to this repository's AVA, Cucumber/BDD, runner, and sequence-test architecture.

The feature must enforce memory limits as a quality gate, not merely report them. Test-runner heap checks should use a stricter default target than spawned process/container checks. Purposeful exceptions are allowed only when they are explicit, scoped, and documented near the test or scenario that needs them.

## Functional Requirements

1. Add a strict AVA/package-test memory guard integrated into the supported `scripts/run-ava.js` path.
   - The guard must run the actual AVA process with `--expose-gc` when enabled.
   - The guard must force or validate serial execution so per-test memory attribution is meaningful.
   - The guard must fail if `global.gc` is unavailable.
   - The guard must measure post-GC memory growth using `heapUsed + external + arrayBuffers`.
   - The initial planned test threshold should include a 512 KiB target for test-runner heap growth, with configurable env overrides for validation/tuning.

2. Add memory-safe lifecycle support to test harnesses and captures.
   - `Buffer.concat` and chunk collection remain allowed for assertions.
   - Retained buffers, chunks, captured frames, streams, and large response bodies must be cleared or disposed before memory measurement.
   - `sequence-test` captures and fake fixtures must expose deterministic cleanup such as `clear()` or `dispose()` where needed.

3. Add BDD memory guardrails for Cucumber scenarios.
   - BDD memory mode must invoke the actual Cucumber Node process with `--expose-gc`.
   - Parent Cucumber process checks must measure per-scenario post-GC heap growth after scenario cleanup.
   - Hook ordering must be verified so measurement happens after normal teardown.
   - `CustomWorld` state, retained resources, streams, and CLI outputs must be cleared before measurement.

4. Add BDD child-process and container memory checks.
   - Track spawned Hub, Host, Manager, MultiManager, and runner processes separately from the Cucumber parent heap.
   - Short-lived processes and runner containers should be gone after scenario cleanup unless a scenario intentionally keeps them alive.
   - Long-lived shared processes may survive but must be checked for RSS growth using a configurable threshold.
   - Process/container thresholds may be materially higher than test-runner heap thresholds; some scenarios may accept 100-200 MiB growth when purposeful and documented.
   - Docker checks should prefer working-set style measurements over raw memory usage where practical.

5. Add runner/runtime memory observability where it supports test assertions.
   - Existing monitoring message fields such as `memoryUsage`, `memoryMaxUsage`, and `limit` should be populated where appropriate.
   - Process-adapter/runtime paths should expose enough memory data for sequence-level assertions.

6. Add exception and skip handling.
   - Purposeful exceptions must be documented near the relevant test/scenario with the reason and expected retained memory behavior.
   - Environment-based skips may exist for emergency or environment-specific cases, but they must require an explicit reason in output or documentation.
   - Broad package-wide or feature-wide silent skips are out of scope.

7. Add documentation and Conductor completion policy.
   - Contributor/agent/Conductor documentation must state that every implementation track must run relevant tests with memory guardrails enabled before track completion.
   - Final track summaries must list the memory-guarded commands that were run.
   - Once stable, memory guard jobs should become required CI gates.

## Non-Functional Requirements

1. Preserve existing supported test entrypoints.
   - AVA package tests must continue to route through `scripts/run-ava.js`.
   - BDD tests must continue to route through `scripts/run-bdd.js`, with Docker mode remaining the supported memory-constrained path.

2. Avoid creating parallel test runners that bypass repository conventions.

3. Keep memory checks deterministic enough for CI by using serial execution where required.

4. Keep thresholds configurable through documented environment variables while preserving strict defaults.

5. Ensure memory guard failures produce actionable diagnostics, including test/scenario name, measured delta, threshold, and any applicable exception or skip reason.

6. Avoid hidden operational default changes to runtime adapters or production behavior; memory checks are test and observability features.

7. BDD parallel scheduling admission is based on current acceptable serial timing and memory evidence, not on expected timing targets. Timing data is recorded telemetry and observability, not a test-selection gate. Balanced logical chunks, manual timing and memory validation, and a maximum of four concurrent parallel runs compose the permitted execution plan after evidence confirms admission.

8. Strict memory guardrails (AVA/BDD parent heap, child process RSS, Docker working-set thresholds), serial-exclusive and resource-owning feature paths, and the explicit scheduler/reservation policy remain unchanged by the parallel admission policy.

## Acceptance Criteria

1. AVA memory guard mode can run package tests with `--expose-gc`, serial execution, deterministic post-GC measurement, and enforced heap-growth threshold.

2. At least one deterministic package test surface is validated under the AVA memory guard.

3. BDD memory guard mode can run Cucumber with `--expose-gc` and enforce parent scenario heap growth after cleanup.

4. BDD process/container memory tracking exists for spawned processes and Docker runner containers, with clear distinction between parent heap, child RSS, and container working-set semantics.

5. Sequence-test captures and related fixtures provide cleanup/disposal mechanisms sufficient for memory-guarded tests.

6. Runner/runtime monitoring exposes memory data needed for sequence-level or process-level memory assertions where practical.

7. Purposeful exceptions and env skips are documented, scoped, and visible in test output or nearby comments.

8. Documentation states that every Conductor track end must include relevant memory-guarded validation commands in the final summary, and memory guard CI jobs are planned or added as required gates.

9. Validation commands and skipped checks are recorded with reasons and follow-ups when guardrails cannot be run.

## Out of Scope

1. Replacing AVA or Cucumber with another test framework.

2. Requiring 512 KiB heap-growth thresholds for child process RSS or Docker container working-set checks.

3. Treating raw Docker memory usage including cache as the only source of truth when a working-set measurement is available.

4. Production enforcement of memory limits outside test/diagnostic paths, except for exposing monitoring data already supported by runtime protocols.

5. Silent package-wide memory guard disablement.
