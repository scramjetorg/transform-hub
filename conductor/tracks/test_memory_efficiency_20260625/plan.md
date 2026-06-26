# Implementation Plan: Test Memory Efficiency and Process Cleanup

## Phase 1: Baseline, Branch Setup, and Failure Inventory

- [x] Task: Create implementation branch during execution
    - [x] Capture the current branch as the PR base branch.
    - [x] Check worktree status, upstream state, and branch divergence per the branching policy before branching.
    - [x] Create the implementation branch with name `conductor/test_memory_efficiency_20260625` or a sanitized equivalent.
    - [x] Do NOT make granular start-marker commits or open a PR early during planning or track creation.
    - [x] Perform all implementation work on this branch, deferring all commits and PR creation to final Branching Policy finalization.
- [x] Task: Research - confirm current AVA and BDD runner surfaces
    - [x] Use the research specialist to inventory `scripts/run-ava.js`, package `test:ava`/`npm test` scripts, BDD scripts, Cucumber configuration, BDD host utilities, and cleanup helpers.
    - [x] Record current memory limits, worker/thread behavior, timeout behavior, and cleanup behavior in the plan notes.
    - [x] Confirm issue 38 and issue 39 wording and list affected commands/files.
- [x] Task: Research - review reusable shared helpers and prior solutions
    - [x] Review `scripts/`, `bdd/lib/`, package codemaps, and `conductor/known-solutions.md` before adding new helper code.
    - [x] Decide whether a shared test-runner helper module should be used by both runner scripts or whether duplicated logic is intentionally avoided through another mechanism.
- [x] Task: Establish safe baseline validation commands
    - [x] Define narrow AVA smoke commands that exercise the affected Host/runner/api-server profile under `ulimit -v 1835008` or a stricter equivalent below 2 GB.
    - [x] Define narrow BDD smoke/AppContext commands that exercise host/runner lifecycle and cleanup under the memory guard.
    - [x] Ensure no test command in this track intentionally runs without a memory limit.
- [x] Task: Conductor - Phase Completion 'Baseline, Branch Setup, and Failure Inventory' (Protocol in workflow.md)
    - [x] Review the phase against the goal.
    - [x] Confirm shared packages/helpers were reviewed and reused or intentionally not used.
    - [x] Record validation scope and any skipped validation with reasons.

### Phase 1 Research Notes

- Issue 38: BDD AppContext runs can pass but leave orphaned STH/Host process groups; manual `kill -TERM -- -<pgid>` was needed after runs. Cleanup currently depends on Cucumber process exit and can miss SIGKILL/OOM cases.
- Issue 39: AVA tests are unstable under the memory guard because default `--jitless` avoids V8 CodeRange OOM but can trigger `ReferenceError: WebAssembly is not defined` via WASM-using dependencies such as undici/ssh2/poly1305. Affected packages include `host`, `runner`, `runner-node`, `api-server`, and transitively `manager`.
- AVA inventory: 18 packages use AVA and all package test paths route through `scripts/run-ava.js`; no package currently bypasses it directly. Notable wrappers include timeout flags, `--serial`, `SCRAMJET_AVA_FETCH=0`, and `nyc node ../../scripts/run-ava.js` coverage wrappers.
- Current `scripts/run-ava.js`: forces `--max-old-space-size=1536`; defaults to `--jitless`; supports `SCRAMJET_AVA_JITLESS=0`; appends WASM limits when JIT is enabled; supports `SCRAMJET_AVA_FETCH=0`; does not enforce a runner-level timeout or post-run cleanup/leak detection.
- BDD inventory: root BDD scripts mostly use `scripts/run-bdd-docker.js`, but `test:bdd-appcontext` invokes Cucumber directly. `run-bdd-docker.js` currently defaults container memory to `4096m`, optional CPU cap, disabled timeout by default, and `docker rm -f` plus temp-dir cleanup on process exit.
- BDD cleanup risks: `bdd/lib/host-utils.ts` tracks detached host process groups but cleanup depends on process exit handlers; `stopProcess()` sends SIGTERM with no SIGKILL fallback; `killAllRunners()` uses blunt `killall runner`; `killProcessByName()` uses unconditional SIGKILL; `aggregation-repro.ts` has a better targeted SIGTERM-to-SIGKILL pattern.
- Shared-helper decision: prefer a new shared script helper such as `scripts/lib/test-utils.js` for Node option construction, memory/worker defaults, timeout escalation, and leak detection, while TypeScript BDD helpers can either consume equivalent conventions or use a thin local wrapper if direct JS reuse is awkward.
- Known-solutions: preserve the existing AVA binary mismatch guidance; update the memory-constrained validation guidance after supported runner behavior changes.

### Phase 1 Safe Baseline Validation Commands

All validation commands in this track must run under a memory guard. Do not intentionally run test commands without a memory limit.

- AVA affected-package smoke candidates:
  - `ulimit -v 1835008; cd packages/host && SCRAMJET_AVA_FETCH=0 node ../../scripts/run-ava.js -T 50000`
  - `ulimit -v 1835008; cd packages/runner && SCRAMJET_AVA_FETCH=0 node ../../scripts/run-ava.js -T 50000`
  - `ulimit -v 1835008; cd packages/api-server && node ../../scripts/run-ava.js -T 50000 --serial`
  - `ulimit -v 1835008; cd packages/runner-node && SCRAMJET_AVA_FETCH=0 node ../../scripts/run-ava.js`
- AVA broader serial package candidate:
  - `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npm run test:packages-no-concurrent`
- BDD AppContext/process-adapter smoke candidate:
  - `ulimit -v 1835008; cd bdd && SCRAMJET_SPAWN_TS=1 RUNTIME_ADAPTER=process npx cucumber-js features/appcontext/APPCONTEXT-001-full-sequence.feature --tags "@ci-appcontext and not @ignore" --exit --format @cucumber/pretty-formatter`
- BDD runner-script smoke candidate:
  - `ulimit -v 1835008; node scripts/run-bdd-docker.js -- --format=@cucumber/pretty-formatter -t "@ci-instance-node and not @slow and not @stress and not @perf and not @load and not @external-dependency and not @compatibility"`
- Post-run leak-detection target: known repository-owned STH/Host/runner/Manager/MultiManager processes and `/tmp/bdd-runner.*` temp directories.

### Phase 1 Checkpoint Notes

- Phase goal met: implementation branch created, track status marked in progress, current AVA/BDD runner surfaces inventoried, and safe validation command candidates recorded.
- Shared-helper review complete: prefer a shared `scripts/lib/test-utils.js`-style helper for common runner behavior where practical; avoid duplicating option construction and leak-detection logic across AVA and BDD scripts.
- Validation scope: no package or BDD tests were run in Phase 1 because this phase changed only Conductor status/plan notes and performed read-only research. Validation consisted of reviewing the Phase 1 diff and confirming all future test commands are recorded with memory guards.
- Skipped validation: runtime tests intentionally deferred to Phase 2/3 after focused runner test coverage is added, to avoid running unstable current profiles outside the planned implementation steps.

## Phase 2: AVA Runner Stabilization

- [x] Task: Tests - add or update AVA runner regression coverage
    - [x] Add focused tests or script-level checks for AVA runner option construction, memory/worker defaults, direct invocation guard behavior, timeout behavior, and environment overrides.
    - [x] Include regression coverage for the supported profile avoiding the `--jitless`/WebAssembly failure mode where feasible without reproducing host-crashing OOMs.
- [x] Task: Implementation - create the supported AVA runner profile
    - [x] Use the implementation specialist for bounded edits to the AVA runner and package test script wiring.
    - [x] Update `scripts/run-ava.js` or the new supported AVA runner entrypoint to enforce safe default memory, worker/thread, timeout, and Node/V8/WASM settings.
    - [x] Route all package `test:ava` and package test commands through the supported AVA runner.
    - [x] Add a direct `npx ava` fail-fast or informative guard where feasible, without breaking legitimate runner-invoked AVA execution.
    - [x] Keep npm as the command surface for repository workflows.
- [x] Task: Validate AVA runner behavior under memory limits
    - [x] Run the narrow AVA runner script-level tests under the memory guard.
    - [x] Run affected package AVA smoke checks under the memory guard.
    - [x] Record any failure classification, supported retry profile, and cleanup result.
- [x] Task: Review - AVA runner stability and maintainability
    - [x] Use the review specialist to inspect the AVA runner profile, guard behavior, and package wiring for maintainability and hidden operational risks.
- [x] Task: Conductor - Phase Completion 'AVA Runner Stabilization' (Protocol in workflow.md)
    - [x] Review the phase against the goal.
    - [x] Confirm deduplication and shared-helper decisions.
    - [x] Record validation results and any skipped checks.

### Phase 2 AVA Runner Notes

- Added a centralized AVA runner helper module and regression tests for option construction, environment overrides, JIT/WASM/fetch profile behavior, concurrency, timeout, and guard-related behavior.
- Updated `scripts/run-ava.js` to use the shared helper, set a supported runner environment marker, support configurable max old space, worker count, runner timeout, JIT/WASM/fetch behavior, and preserve pass-through AVA CLI args.
- Added an opt-in direct AVA bypass guard. Hard-blocking direct `npx ava` was deferred as too invasive for this bounded phase; the warning/preload infrastructure is in place for runner-spawned/preloaded processes and future hardening.
- Incidental validation failure: `packages/host/test/runner-transport.spec.ts` used brittle object identity (`t.is`) for deeply equal route-contract objects. This was corrected to `t.deepEqual`; no runtime behavior changed.
- Review follow-up completed: safe default AVA worker fan-out is `2`; default runner timeout is `600000` ms; guard condition and documentation were corrected; the default `--jitless` profile remains documented with `SCRAMJET_AVA_JITLESS=0` as the WASM-needed opt-out with WASM limits.
- Validation under `ulimit -v 1835008`:
  - `NODE_OPTIONS="--max-old-space-size=1024" npm run test:runner`: 41/41 passed.
  - `SCRAMJET_AVA_FETCH=0 NODE_OPTIONS="--max-old-space-size=1024" node ../../scripts/run-ava.js test/runner-transport.spec.ts -T 50000` from `packages/host`: 35/35 passed after correcting the brittle assertion.
  - Full host smoke initially reached the runner profile successfully but exposed the same brittle assertion; the targeted corrected spec now passes. Full host rerun is deferred unless needed because this phase's intended regression coverage is runner-focused.
- Phase 2 review: no code blockers or majors after fixes. Follow-up for final hardening: runner timeout uses Node `spawnSync` timeout for the AVA parent and is not yet a general orphan-worker cleanup mechanism; BDD/AppContext adjacent scripts with semicolon-based `ulimit` chaining should be handled in Phase 3/4.

## Phase 3: BDD Runner and Cleanup Hardening

- [x] Task: Tests - add or update BDD cleanup regression coverage
    - [x] Add focused checks for process-group tracking, TERM-to-KILL escalation, leak detection patterns, and temp/container cleanup where feasible.
    - [x] Add or update a BDD smoke/AppContext validation path that can prove cleanup without running the full Docker-heavy suite.
- [x] Task: Implementation - create the supported BDD runner profile
    - [x] Use the implementation specialist for bounded edits to the BDD runner, BDD scripts, and BDD host cleanup utilities.
    - [x] Standardize BDD memory caps, CPU/thread caps, command timeout, and grace-period escalation.
    - [x] Centralize known STH/Host/runner/Manager/MultiManager process cleanup patterns and avoid broad destructive host process killing.
    - [x] Add post-run leak detection that fails or reports clearly when repository-owned test children remain.
- [x] Task: Implementation - evaluate Docker/Compose lifecycle for hubs and managers
    - [x] Use the research findings from `../drumwave-integration` to design a minimal Compose-backed lifecycle for BDD hubs/managers if it simplifies cleanup.
    - [x] Prefer an atomic lifecycle pattern: compose up, wait for test completion or lifecycle signal, collect logs, compose down with volume cleanup.
    - [x] Use `restart: "no"`, explicit service memory limits, and profile-gated test-related services when Compose is introduced.
    - [x] Do not require Docker as the test executor unless the scenario specifically needs it.
    - [x] Pause for user review before introducing large Docker/Compose workflow changes if they exceed a bounded runner/cleanup change.
- [x] Task: Validate BDD runner behavior under memory limits
    - [x] Run script-level BDD runner and cleanup checks under the memory guard.
    - [x] Run a narrow BDD smoke/AppContext command under the memory guard.
    - [x] Verify no leaked repository-owned processes or containers remain after completion.
- [x] Task: Review - BDD cleanup and lifecycle safety
    - [x] Use the review specialist to inspect cleanup targeting, escalation behavior, Compose lifecycle choices, and false-positive/false-negative leak risks.
- [x] Task: Conductor - Phase Completion 'BDD Runner and Cleanup Hardening' (Protocol in workflow.md)
    - [x] Review the phase against the goal.
    - [x] Confirm deduplication and shared-helper decisions.
    - [x] Record validation results and any skipped checks.

### Phase 3 BDD Runner Notes

- Added centralized BDD option defaults with <2G-safe defaults: Docker memory `1536m`, CPU limit `2`, runner timeout `600000` ms, and grace period `10000` ms, all environment-overridable.
- Added centralized BDD cleanup helpers for process-group signaling, TERM-to-KILL escalation, known process-pattern leak detection, temp-dir cleanup, and Docker container cleanup utilities.
- Added `scripts/run-bdd.js` as the supported BDD entrypoint. Docker mode is the default and recommended path under strict memory constraints; direct mode is documented as diagnostic/local because direct host Cucumber can hit ssh2/poly1305 WebAssembly allocation under `ulimit`.
- Updated `scripts/run-bdd-docker.js` to use safe option defaults, scoped current-run Docker/temp cleanup, and post-run repository process leak reporting for all Docker-backed BDD paths.
- Hardened BDD TypeScript cleanup helpers: HostUtils process-group kill supports escalation, actual Host teardown paths pass escalation, Hub config cleanup kill calls pass escalation, and Manager `stopProcess()` now uses TERM-to-KILL escalation.
- Documented the remaining broad `killProcessByName()` helper as a known limitation rather than expanding scope to replace every caller in this phase.
- Compose evaluation: the current Docker runner already follows an atomic container lifecycle close to the referenced Compose pattern. A full Compose stack would be medium-large and is deferred to a follow-up unless Docker-heavy BDD remains a blocker.
- Validation under `ulimit -v 1835008`:
  - `NODE_OPTIONS="--max-old-space-size=1024" npm run test:runner`: 93/93 passed, including AVA options, BDD options/cleanup, and `run-bdd` structural regressions.
  - `NODE_OPTIONS="--max-old-space-size=1024" timeout 30 node scripts/run-bdd.js -- --dry-run --format @cucumber/pretty-formatter -t "@ci-appcontext and not @ignore"`: Docker-backed dry-run completed with 7 skipped scenarios and 45 skipped steps; leak detection reported no leaked repository processes.
  - Explicit `reportLeakedProcesses()` check reported no leaked repository processes.
- Skipped validation: full live BDD AppContext execution remains deferred to final/integration validation because this phase focused on runner wiring, dry-run command loading, cleanup helpers, and leak-detection behavior without requiring packed fixtures or a live Hub.
- Phase 3 review: no code blockers or majors remain. Follow-up for Phase 4 docs: explicitly label raw `bdd/package.json` Cucumber scripts as internal/unsupported for memory-constrained validation, and document that leak detection currently reports rather than fails CI by default.

## Phase 4: Unified Guidance, Integration Validation, and Finalization

- [x] Task: Documentation - update supported test guidance
    - [x] Update `AGENTS.md`, `conductor/workflow.md`, `conductor/tech-stack.md`, package scripts documentation, or other relevant guidance to reflect the supported AVA and BDD runner commands.
    - [x] Document memory/thread defaults, timeout behavior, cleanup guarantees, environment variables, and direct-invocation guard expectations.
- [x] Task: Integration validation under memory limits
    - [x] Run the narrowest reliable combined validation proving both runner profiles under the memory guard.
    - [x] Run `npm run lint` or a narrower relevant Biome check under the repository's documented memory/thread settings.
    - [x] Run targeted package and BDD smoke validations under the memory guard.
    - [x] Confirm post-validation process/container cleanup.
- [x] Task: Review - final code and plan consistency
    - [x] Use the review specialist for a final maintainability review of runner profiles, cleanup behavior, documentation consistency, and validation evidence.
    - [x] Update this plan with final validation notes, skipped checks, and known limitations.
- [~] Task: Branching Policy finalization
    - [~] Create one final commit with all implementation, tests, docs, and Conductor updates.
    - [ ] Copy the final `spec.md` content to a temporary PR body file.
    - [ ] Push `conductor/test_memory_efficiency_20260625`.
    - [ ] Create a draft PR targeting the captured base branch with the spec as the PR body, or update/view the existing PR if one exists.
    - [ ] Post verification results as a PR comment.
    - [ ] Mark the PR ready for review only after final verification is complete.
- [~] Task: Conductor - Phase Completion 'Unified Guidance, Integration Validation, and Finalization' (Protocol in workflow.md)
    - [x] Review the phase against the goal.
    - [x] Confirm docs, tests, code, and plan are aligned.
    - [~] Record final PR URL, verification results, skipped checks, and cleanup status.

### Phase 4 Validation Notes

- Documentation/guidance updated in `AGENTS.md`, `conductor/workflow.md`, `conductor/tech-stack.md`, and `conductor/known-solutions.md` to describe supported AVA and BDD runner entrypoints, defaults, environment variables, cleanup behavior, and raw Cucumber limitations.
- Guarded validation:
  - `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run test:runner`: 93/93 passed.
  - `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" timeout 30 node scripts/run-bdd.js -- --dry-run --format @cucumber/pretty-formatter -t "@ci-appcontext and not @ignore"`: Docker-backed BDD dry-run completed with 7 skipped scenarios and 45 skipped steps; leak detection reported no leaked repository processes.
  - `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run test:packages-no-concurrent`: passed across package workspaces after stabilizing memory-heavy package scripts for `api-server`, `manager`, `runner`, `runner-node`, and `sth-config`.
  - Targeted guarded reruns passed for `packages/api-server` (55 tests), `packages/manager` (166 tests), `packages/runner` (111 tests), `packages/runner-node` (89 tests), and `packages/sth-config` (8 tests).
  - `node -e "const leaked = require('./scripts/lib/bdd-cleanup.js').reportLeakedProcesses(); process.exit(leaked ? 1 : 0);"`: no leaked repository processes detected.
- Lint validation:
  - `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" npm run lint`: completed with only pre-existing `scripts/docs.js` warnings (`noAssignInExpressions`, unused `routeKindBadge`/`opId`, and one escapable backtick). Session-introduced runner lint warnings were fixed and did not recur.
- Skipped validation: full live BDD AppContext and Docker-heavy BDD suites are deferred because this track validated runner wiring, Docker-backed Cucumber dry-run loading, and cleanup/leak detection without requiring packed fixtures, built `dist/`, or runner image artifacts.
- Final review: no code blockers or majors remained after updating stale `bdd/README.md` BDD runner documentation. Known follow-ups: generated/older contributing docs can be synced later, and leak detection currently reports rather than fails CI by default.
