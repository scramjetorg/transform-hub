# Implementation Plan: Coverage Tooling Replacement

## Phase 1: Remove Repository-Owned nyc Tooling

- [x] Task: Establish the implementation branch and review surface
    - [x] Capture the current branch as the PR base during `/conductor:implement`.
    - [x] Create `conductor/coverage_tooling_replacement_20260809` from that base.
    - [x] Open draft upstream PR #1082 with the approved specification.

- [x] Task: Remove active nyc/Istanbul ownership
    - [x] Remove direct `nyc` and `@istanbuljs/nyc-config-typescript` declarations from root and package manifests.
    - [x] Remove active nyc wrappers from package scripts while preserving their supported `scripts/run-ava.js` execution path.
    - [x] Remove the root nyc configuration and nyc-specific ignored artifacts.
    - [x] Preserve c8 transitive dependencies, historical records, and unrelated text references.

- [x] Task: Refresh and validate the dependency lock
    - [x] Regenerate `package-lock.json` with npm using only the dependency changes in this phase.
    - [x] Run `npm ci` and static searches proving direct nyc/Istanbul ownership is gone.
    - [x] Run one affected package test through its direct supported AVA runner to prove the removal did not leave a broken package script.

    Validation: `npx --yes npm@11.19.0 install --package-lock-only --ignore-scripts` refreshed the lockfile; `npm ci` completed successfully (with existing Node-engine, deprecation, and Python resolver warnings); semantic manifest/lock checks found no direct nyc/Istanbul ownership; `npm run test --workspace @scramjet/logger` passed 3 tests with 2 existing skips through `scripts/run-ava.js`.

- [x] Task: Conductor - Phase Completion 'Remove Repository-Owned nyc Tooling' (Protocol in workflow.md)

## Phase 2: Clear Remaining Active Coverage Wiring

- [ ] Task: Inventory the remaining coverage surface
    - [ ] Search package manifests, root scripts, runner code, CI, ignore files, documentation, and configurations for coverage references.
    - [ ] Classify each result as active wiring, generated/build artifact handling, archive/history, or unrelated text.
    - [ ] Record the intended new AVA source scope and generated/build artifact exclusions before introducing c8.

- [ ] Task: Remove stale active coverage wiring
    - [ ] Remove inactive nyc configuration files, commented wrappers, stale report references, and stale ignore entries only where they are active repository-owned coverage wiring.
    - [ ] Preserve generic `coverage/` artifact handling when it remains appropriate for c8 output.
    - [ ] Update `conductor/tech-stack.md` to describe the absence of nyc and the planned c8 coverage model.

- [ ] Task: Verify the clean baseline
    - [ ] Re-run the active-reference inventory and confirm no active nyc/Istanbul flow or direct dependency remains.
    - [ ] Confirm standard AVA runner commands do not collect coverage and retain their existing behavior.

- [ ] Task: Conductor - Phase Completion 'Clear Remaining Active Coverage Wiring' (Protocol in workflow.md)

## Phase 3: Add Opt-In c8 Coverage to the AVA Runner

- [ ] Task: Define the minimal coverage-mode contract
    - [ ] Add c8 as the only new direct coverage dependency and refresh `package-lock.json` with npm.
    - [ ] Define an opt-in `scripts/run-ava.js` flag that enables coverage while leaving its default invocation unchanged.
    - [ ] Keep the initial coverage surface limited to the supported AVA runner; do not add Docker BDD instrumentation, thresholds, parity checks, or CI gates.

- [ ] Task: Implement c8 runner integration
    - [ ] Route coverage mode through c8 without introducing package-specific wrapper flows.
    - [ ] Configure reproducible report output and V8 source remapping to original TypeScript paths.
    - [ ] Exclude generated, staged `.ava-*`, build, dependency, and coverage-output paths from source metrics.
    - [ ] Preserve the runner's normal staging cleanup and test-worker behavior.

- [ ] Task: Add focused coverage-mode regression tests
    - [ ] Add or update runner tests for flag parsing, default-mode preservation, c8 invocation, report location, and exclusions.
    - [ ] Cover source-map attribution and coverage propagation to the configured AVA worker mode where practical.
    - [ ] Run focused runner tests through the supported AVA command under the repository memory guard.

- [ ] Task: Conductor - Phase Completion 'Add Opt-In c8 Coverage to the AVA Runner' (Protocol in workflow.md)

## Phase 4: Establish and Stabilize Fresh Coverage Metrics

- [ ] Task: Run the selected AVA coverage surface
    - [ ] Run focused coverage-mode tests first, then the defined package AVA coverage command.
    - [ ] Capture report artifacts and raw failures without comparing them to historical nyc output.
    - [ ] Confirm reports use original source paths and omit generated, staged, build, dependency, and coverage-output artifacts.

- [ ] Task: Fix coverage-mode mechanics
    - [ ] Diagnose and fix only failures introduced by c8 execution: command wiring, process inheritance, source-map remapping, report generation, or cleanup ordering.
    - [ ] Re-run the narrowest affected coverage command after each fix.
    - [ ] Do not alter tests, production source, exclusions, limits, timeouts, skips, allowances, or assertions to improve coverage numbers.

- [ ] Task: Document the new metrics command
    - [ ] Document the opt-in AVA coverage command, report outputs, source scope, and exclusions.
    - [ ] Document that metrics are newly established and have no historical parity or enforcement threshold.

- [ ] Task: Conductor - Phase Completion 'Establish and Stabilize Fresh Coverage Metrics' (Protocol in workflow.md)

## Phase 5: Assess Coverage and Gate Remediation

- [ ] Task: Produce an evidence-only coverage assessment
    - [ ] Record overall line, branch, and function metrics.
    - [ ] Record package and file metrics, including zero-hit files.
    - [ ] Identify scope anomalies such as generated, staged, unmapped, or unexpectedly included files.
    - [ ] Verify generated and build artifacts are excluded from the assessed source scope.

- [ ] Task: Present coverage findings for a user decision
    - [ ] Summarize potential under-coverage, over-coverage, redundant tests, and remaining gaps without making source or test changes.
    - [ ] Stop for the user's explicit decision whether to remediate any identified gap, accept the assessment, or create a follow-up track.

- [ ] Task: Conductor - Phase Completion 'Assess Coverage and Gate Remediation' (Protocol in workflow.md)
