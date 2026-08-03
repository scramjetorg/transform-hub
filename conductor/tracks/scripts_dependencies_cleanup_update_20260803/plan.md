# Scripts and Dependencies Cleanup and Update Plan

## Phase 1: Establish Cleanup Evidence and Remove Approved Legacy Scripts

- [x] Task: Create the implementation review surface.
  - [x] Capture the current branch, upstream state, immutable base SHA, clean-worktree status, and selected validation baseline.
    - Evidence: base `devel` tracked `origin/devel`, was clean and aligned at `9377dfec1cca015ce9ba1f60059f5f6a4a9325fc`; Phase 1 validation baseline is `npm run test:runner` and `npm run build:packages`.
  - [x] Create `conductor/scripts_dependencies_cleanup_update_20260803` from the captured base during implementation.
    - Evidence: branch `conductor/scripts_dependencies_cleanup_update_20260803` created at `9377dfec1cca015ce9ba1f60059f5f6a4a9325fc`.
  - [x] Open or update a draft pull request targeting the captured base branch.
    - Evidence: draft PR #1080, https://github.com/scramjetorg/transform-hub/pull/1080, targets `devel` from `conductor/scripts_dependencies_cleanup_update_20260803`.
- [x] Task: Revalidate the approved script-deletion inventory.
  - [x] Search source, package scripts, active workflows, runtime loading, tests, fixtures, and documentation for each approved path.
  - [x] Record negative-reference evidence for `scripts/validate-bdd-archive.js`, `scripts/test-all.sh`, `build/Dockerfile`, and `build/package.json`.
    - Evidence: repository-wide inventory found no external references to the four approved targets; `validate-bdd-archive.js` has only self references and `test-all.sh` has none. The sole non-track reference in `validate-bdd-archive.js` is its own retained fixture helper import.
  - [x] Reconfirm that `build/` contains no retained asset before directory removal.
    - Evidence: `build/` contains only the approved `Dockerfile` and `package.json`; neither has source, manifest, workflow, test, fixture, runtime, or documentation consumers.
- [x] Task: Remove the approved obsolete script and build assets.
  - [x] Delete the four approved paths and remove the empty `build/` directory.
    - Evidence: safety proposal received `PASS/accepted` phase review; all four tracked paths and the empty directory are absent.
  - [x] Keep `scripts/lib/bdd-fixture-archives.js` and all active runner/container entrypoints intact.
    - Evidence: protected fixture helper remains present; deletion diff contains only the four approved files.
- [x] Task: Validate script cleanup.
  - [x] Run `npm run test:runner`.
    - Evidence: run under `ulimit -v 1835008` and `NODE_OPTIONS=--max-old-space-size=1024`; exited with 25 failures in pre-existing BDD-wave manifest coverage, Docker telemetry, docs metadata drift, setup-action fixture expectations, and GC-enabled Verser2 tests. The change diff is limited to the four approved deletions and Conductor evidence, and no deleted-target reference remains; this is an unrelated baseline failure recorded for Phase 1 handoff.
  - [x] Run `npm run build:packages`.
    - Evidence: passed under `ulimit -v 1835008` and `NODE_OPTIONS=--max-old-space-size=1024`; all package TypeScript builds and dist prepacking completed. The runner-python build emitted a pip resolver conflict warning for the host environment's `pyopenssl`, without failing the build.
  - [x] Repeat targeted reference searches and record any residual references.
    - Evidence: tracked-file search outside `conductor/` returned no references to any deleted target; `scripts/lib/bdd-fixture-archives.js` remains present. No residual references found.
- [x] Task: Review Phase 2 scope and create handoff notes.
  - [x] Record deleted paths, retained scripts, validation results, known failures, and exact dependency-removal entry criteria.
    - Deleted: `scripts/validate-bdd-archive.js`, `scripts/test-all.sh`, `build/Dockerfile`, `build/package.json`, and the now-empty `build/` directory.
    - Retained: `scripts/lib/bdd-fixture-archives.js` and all active runner/container entrypoints. `npm run build:packages` passed; `npm run test:runner` retains the unrelated baseline failures recorded above.
    - Phase 2 entry: inventory every root/workspace direct dependency and remove only owner-scoped candidates with source, runtime, workflow, test, fixture, generated-output, and documentation evidence plus prior cleanup safety review.
  - [x] Review potential script candidates without deleting them: `scripts/_/pack-sequence`, `scripts/_/upload-sequence`, and `scripts/packsequence.js`.
  - [x] Record each potential candidate as retained, deferred, or requiring an explicit compatibility decision.
    - `scripts/_/pack-sequence`: deferred; it is invoked by `scripts/_/upload-sequence` and uses legacy Yarn/package assumptions. Owner: repository scripts maintainers; revisit only with a joint removal/migration plan.
    - `scripts/_/upload-sequence`: deferred; no external caller was found, but it invokes `pack-sequence` and is compatibility-sensitive. Owner: repository scripts maintainers; requires an explicit joint-removal decision.
    - `scripts/packsequence.js`: retained; invoked by `bdd/data/sequences/args-to-output/package.json` and documented in `ENV_VARS.md`. Owner: BDD fixture maintainers; remove only with a fixture/package-interface migration.
- [ ] Task: Conductor - Phase Completion 'Establish Cleanup Evidence and Remove Approved Legacy Scripts' (Protocol in workflow.md)

## Phase 2: Inventory and Remove Proven-Unused Direct Dependencies

- [ ] Task: Rebuild the direct dependency-removal inventory.
  - [ ] Inspect root and workspace manifests, lockfile paths, source imports, dynamic runtime loading, package scripts, active workflows, fixtures, generated outputs, and documentation.
  - [ ] Classify every candidate as safe removal, retained runtime/CI/test dependency, or compatibility-sensitive deferral.
  - [ ] Preserve `@vscode/ripgrep`, BDD/Cucumber dependencies, runtime wrappers, compatibility types, and explicitly retained legacy packages unless new evidence disproves their use.
- [ ] Task: Obtain cleanup safety review before destructive dependency removal.
  - [ ] Have the cleanup specialist propose each owner-scoped removal with evidence.
  - [ ] Have the reviewer approve the bounded removal set before manifests or the lockfile change.
- [ ] Task: Remove only approved direct dependencies by owner group.
  - [ ] Update manifests and regenerate `package-lock.json` with npm; do not hand-edit lockfile metadata.
  - [ ] Verify every removed direct declaration and its direct lockfile entry are absent.
  - [ ] Preserve behavior and document intentional transitive residuals.
- [ ] Task: Validate each dependency-removal group.
  - [ ] Run clean `npm ci` after lockfile changes.
  - [ ] Run focused package build/type/test commands for each affected owner.
  - [ ] Run `npm run check:runtime-invariants` when a removed dependency affects runtime, build, or validation tooling.
- [ ] Task: Review Phase 3 scope and create handoff notes.
  - [ ] Record each candidate's removed/retained/deferred disposition, lockfile result, validation evidence, and production-audit delta.
  - [ ] Define the retained production vulnerability owner groups and fixed-version targets for Phase 3.
- [ ] Task: Conductor - Phase Completion 'Inventory and Remove Proven-Unused Direct Dependencies' (Protocol in workflow.md)

## Phase 3: Remediate Retained Production Dependency Findings

- [ ] Task: Capture a fresh retained-production audit baseline.
  - [ ] Run `npm audit --omit=dev --json` and `npm explain` for each retained critical or high production chain.
  - [ ] Record dependency path, workspace owner, installed version, fixed minimum, runtime reachability, and compatibility risk.
- [ ] Task: Apply compatible production dependency updates by owner group.
  - [ ] Prioritize archive-processing, Docker adapter, Kubernetes client, HTTP, YAML, WebSocket, and protobuf dependency chains.
  - [ ] Update same-major fixes in isolated groups with focused package build and tests before proceeding to the next group.
  - [ ] Regenerate the npm lockfile after each approved owner group and verify the intended resolution.
- [ ] Task: Handle production major-version migrations explicitly.
  - [ ] Evaluate `tar`, `dockerode`, `minio`, `uuid`, and other major remediation candidates for API/runtime compatibility.
  - [ ] Add or update focused regression coverage before or alongside each approved migration.
  - [ ] Record any unapproved major migration as deferred with its dependency path, exposure, owner, required validation, and revisit condition.
- [ ] Task: Validate retained runtime behavior.
  - [ ] Run affected package tests/builds and `npm run check:runtime-invariants`.
  - [ ] Run focused supported process, Docker, Kubernetes, or BDD validation when the changed dependency reaches that surface.
  - [ ] Reject changes that introduce a new runtime, adapter, API, CLI, or runner regression.
- [ ] Task: Review Phase 4 scope and create handoff notes.
  - [ ] Record audit delta, resolved and residual production findings, deferred major migrations, validation evidence, and development/tooling entry criteria.
  - [ ] Confirm that production behavior is stable before modifying development or test tooling.
- [ ] Task: Conductor - Phase Completion 'Remediate Retained Production Dependency Findings' (Protocol in workflow.md)

## Phase 4: Update Development and Test Tooling Safely

- [ ] Task: Inventory retained development and test-tooling findings.
  - [ ] Classify Cucumber, AVA, nyc, esbuild, npm, `@npmcli/run-script`, and their transitive findings by affected command surface and compatibility risk.
  - [ ] Separate compatible lockfile refreshes from major test-runner, package-manager, or release-tool migrations.
- [ ] Task: Update compatible development dependencies.
  - [ ] Apply owner-scoped compatible updates and regenerate the npm lockfile.
  - [ ] Run each affected package's supported AVA runner command and build/type validation.
- [ ] Task: Perform approved tooling migrations with regression evidence.
  - [ ] Update tool configuration, scripts, tests, and documentation together when a major version requires it.
  - [ ] Run `npm run test:packages-no-concurrent`, `npm run test:runner`, and focused BDD paths affected by Cucumber, packaging, or Docker tooling.
  - [ ] Do not raise memory limits, add broad skips, or weaken assertions to accommodate an upgrade.
- [ ] Task: Review final-scope readiness and create handoff notes.
  - [ ] Record every updated, retained, and deferred tooling dependency with version rationale and validation result.
  - [ ] Prepare the final audit, documentation, and release-readiness matrix.
- [ ] Task: Conductor - Phase Completion 'Update Development and Test Tooling Safely' (Protocol in workflow.md)

## Phase 5: Final Audit, Documentation, and Track Closure

- [ ] Task: Run final dependency and cleanup verification.
  - [ ] Run `npm ci`, `npm run build:packages`, `npm run test:packages-no-concurrent`, `npm run test:runner`, `npm run check:runtime-invariants`, and `npm run lint`.
  - [ ] Run final `npm audit --omit=dev --json` and `npm audit --json`.
  - [ ] Record memory-guard commands, thresholds, skips, exceptions, and non-applicable checks for the changed surfaces.
- [ ] Task: Reconcile every retained, deferred, and residual item.
  - [ ] Record package/advisory/path, production or development reachability, disposition, rationale, owner, and revisit condition.
  - [ ] Confirm that no documented compatibility-sensitive script or dependency was removed without an approved migration.
- [ ] Task: Update contributor and operational documentation when commands, tooling, or supported cleanup behavior changed.
  - [ ] Keep documentation aligned with actual npm, build, test, runtime, and release behavior.
- [ ] Task: Perform final review and publish phase evidence.
  - [ ] Request formal review of the completed cleanup, dependency changes, validation matrix, and residual-risk ledger.
  - [ ] Commit the completed phase work, record the checkpoint SHA, push the implementation branch, and update the draft pull request.
  - [ ] Record final scope review and handoff notes for track completion.
- [ ] Task: Conductor - Phase Completion 'Final Audit, Documentation, and Track Closure' (Protocol in workflow.md)
