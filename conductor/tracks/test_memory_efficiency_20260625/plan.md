# Implementation Plan: Test Memory Efficiency and Process Cleanup

## Phase 1: Baseline, Branch Setup, and Failure Inventory

- [ ] Task: Create implementation branch during execution
    - [ ] Capture the current branch as the PR base branch.
    - [ ] Check worktree status, upstream state, and branch divergence per the branching policy before branching.
    - [ ] Create the implementation branch with name `conductor/test_memory_efficiency_20260625` or a sanitized equivalent.
    - [ ] Do NOT make granular start-marker commits or open a PR early during planning or track creation.
    - [ ] Perform all implementation work on this branch, deferring all commits and PR creation to final Branching Policy finalization.
- [ ] Task: Research - confirm current AVA and BDD runner surfaces
    - [ ] Use the research specialist to inventory `scripts/run-ava.js`, package `test:ava`/`npm test` scripts, BDD scripts, Cucumber configuration, BDD host utilities, and cleanup helpers.
    - [ ] Record current memory limits, worker/thread behavior, timeout behavior, and cleanup behavior in the plan notes.
    - [ ] Confirm issue 38 and issue 39 wording and list affected commands/files.
- [ ] Task: Research - review reusable shared helpers and prior solutions
    - [ ] Review `scripts/`, `bdd/lib/`, package codemaps, and `conductor/known-solutions.md` before adding new helper code.
    - [ ] Decide whether a shared test-runner helper module should be used by both runner scripts or whether duplicated logic is intentionally avoided through another mechanism.
- [ ] Task: Establish safe baseline validation commands
    - [ ] Define narrow AVA smoke commands that exercise the affected Host/runner/api-server profile under `ulimit -v 1835008` or a stricter equivalent below 2 GB.
    - [ ] Define narrow BDD smoke/AppContext commands that exercise host/runner lifecycle and cleanup under the memory guard.
    - [ ] Ensure no test command in this track intentionally runs without a memory limit.
- [ ] Task: Conductor - Phase Completion 'Baseline, Branch Setup, and Failure Inventory' (Protocol in workflow.md)
    - [ ] Review the phase against the goal.
    - [ ] Confirm shared packages/helpers were reviewed and reused or intentionally not used.
    - [ ] Record validation scope and any skipped validation with reasons.

## Phase 2: AVA Runner Stabilization

- [ ] Task: Tests - add or update AVA runner regression coverage
    - [ ] Add focused tests or script-level checks for AVA runner option construction, memory/worker defaults, direct invocation guard behavior, timeout behavior, and environment overrides.
    - [ ] Include regression coverage for the supported profile avoiding the `--jitless`/WebAssembly failure mode where feasible without reproducing host-crashing OOMs.
- [ ] Task: Implementation - create the supported AVA runner profile
    - [ ] Use the implementation specialist for bounded edits to the AVA runner and package test script wiring.
    - [ ] Update `scripts/run-ava.js` or the new supported AVA runner entrypoint to enforce safe default memory, worker/thread, timeout, and Node/V8/WASM settings.
    - [ ] Route all package `test:ava` and package test commands through the supported AVA runner.
    - [ ] Add a direct `npx ava` fail-fast or informative guard where feasible, without breaking legitimate runner-invoked AVA execution.
    - [ ] Keep npm as the command surface for repository workflows.
- [ ] Task: Validate AVA runner behavior under memory limits
    - [ ] Run the narrow AVA runner script-level tests under the memory guard.
    - [ ] Run affected package AVA smoke checks under the memory guard.
    - [ ] Record any failure classification, supported retry profile, and cleanup result.
- [ ] Task: Review - AVA runner stability and maintainability
    - [ ] Use the review specialist to inspect the AVA runner profile, guard behavior, and package wiring for maintainability and hidden operational risks.
- [ ] Task: Conductor - Phase Completion 'AVA Runner Stabilization' (Protocol in workflow.md)
    - [ ] Review the phase against the goal.
    - [ ] Confirm deduplication and shared-helper decisions.
    - [ ] Record validation results and any skipped checks.

## Phase 3: BDD Runner and Cleanup Hardening

- [ ] Task: Tests - add or update BDD cleanup regression coverage
    - [ ] Add focused checks for process-group tracking, TERM-to-KILL escalation, leak detection patterns, and temp/container cleanup where feasible.
    - [ ] Add or update a BDD smoke/AppContext validation path that can prove cleanup without running the full Docker-heavy suite.
- [ ] Task: Implementation - create the supported BDD runner profile
    - [ ] Use the implementation specialist for bounded edits to the BDD runner, BDD scripts, and BDD host cleanup utilities.
    - [ ] Standardize BDD memory caps, CPU/thread caps, command timeout, and grace-period escalation.
    - [ ] Centralize known STH/Host/runner/Manager/MultiManager process cleanup patterns and avoid broad destructive host process killing.
    - [ ] Add post-run leak detection that fails or reports clearly when repository-owned test children remain.
- [ ] Task: Implementation - evaluate Docker/Compose lifecycle for hubs and managers
    - [ ] Use the research findings from `../drumwave-integration` to design a minimal Compose-backed lifecycle for BDD hubs/managers if it simplifies cleanup.
    - [ ] Prefer an atomic lifecycle pattern: compose up, wait for test completion or lifecycle signal, collect logs, compose down with volume cleanup.
    - [ ] Use `restart: "no"`, explicit service memory limits, and profile-gated test-related services when Compose is introduced.
    - [ ] Do not require Docker as the test executor unless the scenario specifically needs it.
    - [ ] Pause for user review before introducing large Docker/Compose workflow changes if they exceed a bounded runner/cleanup change.
- [ ] Task: Validate BDD runner behavior under memory limits
    - [ ] Run script-level BDD runner and cleanup checks under the memory guard.
    - [ ] Run a narrow BDD smoke/AppContext command under the memory guard.
    - [ ] Verify no leaked repository-owned processes or containers remain after completion.
- [ ] Task: Review - BDD cleanup and lifecycle safety
    - [ ] Use the review specialist to inspect cleanup targeting, escalation behavior, Compose lifecycle choices, and false-positive/false-negative leak risks.
- [ ] Task: Conductor - Phase Completion 'BDD Runner and Cleanup Hardening' (Protocol in workflow.md)
    - [ ] Review the phase against the goal.
    - [ ] Confirm deduplication and shared-helper decisions.
    - [ ] Record validation results and any skipped checks.

## Phase 4: Unified Guidance, Integration Validation, and Finalization

- [ ] Task: Documentation - update supported test guidance
    - [ ] Update `AGENTS.md`, `conductor/workflow.md`, `conductor/tech-stack.md`, package scripts documentation, or other relevant guidance to reflect the supported AVA and BDD runner commands.
    - [ ] Document memory/thread defaults, timeout behavior, cleanup guarantees, environment variables, and direct-invocation guard expectations.
- [ ] Task: Integration validation under memory limits
    - [ ] Run the narrowest reliable combined validation proving both runner profiles under the memory guard.
    - [ ] Run `npm run lint` or a narrower relevant Biome check under the repository's documented memory/thread settings.
    - [ ] Run targeted package and BDD smoke validations under the memory guard.
    - [ ] Confirm post-validation process/container cleanup.
- [ ] Task: Review - final code and plan consistency
    - [ ] Use the review specialist for a final maintainability review of runner profiles, cleanup behavior, documentation consistency, and validation evidence.
    - [ ] Update this plan with final validation notes, skipped checks, and known limitations.
- [ ] Task: Branching Policy finalization
    - [ ] Create one final commit with all implementation, tests, docs, and Conductor updates.
    - [ ] Copy the final `spec.md` content to a temporary PR body file.
    - [ ] Push `conductor/test_memory_efficiency_20260625`.
    - [ ] Create a draft PR targeting the captured base branch with the spec as the PR body, or update/view the existing PR if one exists.
    - [ ] Post verification results as a PR comment.
    - [ ] Mark the PR ready for review only after final verification is complete.
- [ ] Task: Conductor - Phase Completion 'Unified Guidance, Integration Validation, and Finalization' (Protocol in workflow.md)
    - [ ] Review the phase against the goal.
    - [ ] Confirm docs, tests, code, and plan are aligned.
    - [ ] Record final PR URL, verification results, skipped checks, and cleanup status.
