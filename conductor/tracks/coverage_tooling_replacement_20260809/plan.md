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

- [x] Task: Inventory the remaining coverage surface
    - [x] Search package manifests, root scripts, runner code, CI, ignore files, documentation, and configurations for coverage references.
    - [x] Classify each result as active wiring, generated/build artifact handling, archive/history, or unrelated text.
    - [x] Record the intended new AVA source scope and generated/build artifact exclusions before introducing c8.

    Inventory: remove 15 orphaned package `.nycrc.json` files, three commented nyc wrappers, and the stale Tech Stack nyc line. Retain generic `coverage`/`*.lcov` ignores, Docker/Biome coverage exclusions, and the AVA staging `coverage` filter; retain archives and unrelated fixture/vendor references. The initial c8 scope will be remapped `packages/*/src/**/*.ts`, excluding staged `.ava-*`, build output, dependencies, coverage reports, generated BDD assets, and `*.spec.ts`.

- [x] Task: Remove stale active coverage wiring
    - [x] Remove inactive nyc configuration files, commented wrappers, stale report references, and stale ignore entries only where they are active repository-owned coverage wiring.
    - [x] Preserve generic `coverage/` artifact handling when it remains appropriate for c8 output.
    - [x] Update `conductor/tech-stack.md` to describe the absence of nyc and the planned c8 coverage model.

- [x] Task: Verify the clean baseline
    - [x] Re-run the active-reference inventory and confirm no active nyc/Istanbul flow or direct dependency remains.
    - [x] Confirm standard AVA runner commands do not collect coverage and retain their existing behavior.

    Validation: semantic package-manifest checks found no active nyc/Istanbul script or direct dependency; all package `.nycrc.json` files are gone; generic coverage ignores remain; `npm run test --workspace @scramjet/logger` passed 3 tests with 2 existing skips through normal `scripts/run-ava.js` mode without coverage.

- [x] Task: Conductor - Phase Completion 'Clear Remaining Active Coverage Wiring' (Protocol in workflow.md)

## Phase 3: Add Opt-In c8 Coverage to the AVA Runner

- [x] Task: Define the minimal coverage-mode contract
    - [x] Add c8 as the only new direct coverage dependency and refresh `package-lock.json` with npm.
    - [x] Define an opt-in `scripts/run-ava.js` flag that enables coverage while leaving its default invocation unchanged.
    - [x] Keep the initial coverage surface limited to the supported AVA runner; do not add Docker BDD instrumentation, thresholds, parity checks, or CI gates.

- [x] Task: Implement c8 runner integration
    - [x] Route coverage mode through c8 without introducing package-specific wrapper flows.
    - [x] Configure reproducible report output and V8 source remapping to original TypeScript paths.
    - [x] Exclude generated, staged `.ava-*`, build, dependency, and coverage-output paths from source metrics.
    - [x] Preserve the runner's normal staging cleanup and test-worker behavior.

- [x] Task: Add focused coverage-mode regression tests
    - [x] Add or update runner tests for flag parsing, default-mode preservation, c8 invocation, report location, and exclusions.
    - [x] Cover source-map attribution and coverage propagation to the configured AVA worker mode where practical.
    - [x] Run focused runner tests through the supported AVA command under the repository memory guard.

    Validation: `npm ci` completed successfully with existing engine, deprecation, and Python resolver warnings. `node scripts/run-ava.js scripts/test/ava-options.spec.js` passed 98 tests; `node scripts/run-ava.js scripts/test/ava-typescript-staging.spec.js` passed 9 tests, including a staged logger c8 report that asserted remapped TypeScript paths, exclusions, output location, and cleanup. Under the 524288-byte guard, `ulimit -v 1835008 && NODE_OPTIONS="--max-old-space-size=1024" SCRAMJET_AVA_MEMORY_GUARD=1 node scripts/run-ava.js scripts/test/ava-options.spec.js --match="*coverage*" --match="*Coverage*" --match="*C8*"` passed 9 coverage-mode helper tests. `npm exec -- biome lint --error-on-warnings scripts/run-ava.js scripts/lib/ava-options.js` and `git diff --check` passed.

- [x] Task: Conductor - Phase Completion 'Add Opt-In c8 Coverage to the AVA Runner' (Protocol in workflow.md)

## Phase 4: Establish and Stabilize Fresh Coverage Metrics

- [x] Task: Run the selected AVA coverage surface
    - [x] Run focused coverage-mode tests first, then the defined package AVA coverage command.
    - [x] Capture report artifacts and raw failures without comparing them to historical nyc output.
    - [x] Confirm reports use original source paths and omit generated, staged, build, dependency, and coverage-output artifacts.

- [x] Task: Fix coverage-mode mechanics
    - [x] Diagnose and fix only failures introduced by c8 execution: command wiring, process inheritance, source-map remapping, report generation, or cleanup ordering.
    - [x] Re-run the narrowest affected coverage command after each fix.
    - [x] Do not alter tests, production source, exclusions, limits, timeouts, skips, allowances, or assertions to improve coverage numbers.

- [x] Task: Document the new metrics command
    - [x] Document the opt-in AVA coverage command, report outputs, source scope, and exclusions.
    - [x] Document that metrics are newly established and have no historical parity or enforcement threshold.

    Validation: The first `npm run test:packages -- --coverage` run passed tests but generated no reports because `scripts/run-script.js` consumed the post-script option and nested package `test` scripts did not forward it. The generic workspace-runner bridge fixed this c8 execution-only mechanics issue without package-specific wrappers. `node scripts/run-ava.js scripts/test/run-script.spec.js scripts/test/ava-typescript-staging.spec.js` passed 15 tests. The rerun of `npm run test:packages -- --coverage` passed in 3m25s and retained `lcov.info` reports for 26 tested packages. An artifact audit found each report had remapped `SF:src/` records, no non-source, staged, build, dependency, coverage, or spec entries, and no residual `.ava-*` directories. No historical nyc output, parity check, threshold, or CI gate was used.

- [x] Task: Conductor - Phase Completion 'Establish and Stabilize Fresh Coverage Metrics' (Protocol in workflow.md)

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
