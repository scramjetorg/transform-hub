# Implementation Plan: Implement Manager Aggregation Fix

## Plan Scope

This track fixes `0rail/transform-hub#15` for all scoped Manager aggregation endpoints exposed through the MultiManager proxy:

- `/api/v1/cpm/<manager-id>/api/v1/list`
- `/api/v1/cpm/<manager-id>/api/v1/all_sequences`
- `/api/v1/cpm/<manager-id>/api/v1/instances`

The plan prioritizes reproducing the bug in focused unit/package tests first, then obtaining an `oracle` review of findings and the proposed fix attempt, then replacing ad-hoc repro assets with a clean BDD regression fixture aligned with the final solution.

## Phase 1: Unit-Test Reproduction and Root-Cause Findings

- [x] Task: Create review surface for the track
    - [x] Confirm current branch/base and create a dedicated track branch unless explicitly skipped.
    - [x] Prepare PR surface when the first phase checkpoint is ready. (Dedicated branch created locally; remote PR creation deferred until push/PR is explicitly requested.)
- [x] Task: Confirm affected packages, entrypoints, and expected behavior
    - [x] Read relevant package codemaps for `packages/manager`, `packages/host`, and affected nested `src/` folders.
    - [x] Inspect Manager registration flow, STH controller inventory events, Host CPM connector readiness, and bulk instance message handling.
    - [x] Review shared packages such as `@scramjet/types` and `@scramjet/symbols` for reusable contracts before adding local helpers.
- [x] Task: Reproduce issue #15 with focused unit/package tests
    - [x] Add or update Manager-side tests that demonstrate missed hub/sequence/instance aggregation under the suspected registration ordering path.
    - [x] Add or update tests for CPM connector readiness timing if the unit reproduction identifies early readiness as a contributing cause. (Not added in Phase 1: manager-side ordering and raw instance payload tests already reproduce the confirmed empty aggregation symptoms; CPM readiness remains a candidate for oracle review.)
    - [x] Add or update tests for bulk instance payload handling if raw `Instance[]` payloads reproduce the missing `/instances` state.
    - [x] Run the narrowest test command that demonstrates the failing reproduction.
- [x] Task: Record root-cause findings
    - [x] Document which candidate causes are proven by tests: Manager listener ordering, CPM readiness timing, bulk instance payload shape, or another cause.
    - [x] Record any candidates that are not reproduced and should not be changed.

### Phase 1 Findings

- Branch: `conductor/implement-manager-fix`, branched from `repro/manager-aggregation-bdd`.
- Focused reproduction command: `npm --workspace @scramjet/manager run test:ava -- --match "Manager *"`.
- Result: expected failure, classified as preexisting but in scope.
- Proven by focused tests:
    - Manager registration ordering gap: inventory emitted during `STHController.init()` is missed because Manager state/listeners are installed after `await sth.init()` on the new-STH path.
    - Raw instance inventory payload gap: Manager `attachSTHEventHandlers()` ignores raw `Instance` payloads because it expects `{ instance }` wrapper records, while `CPMConnector.sendInstancesInfo()` sends raw `Instance[]`.
- Not yet proven by focused tests:
    - Host `CPMConnector` early `connect` readiness semantics. Source inspection shows `connect()` emits `connect` after registration and `handleCommunicationRequest()` emits `connect` after the communication stream is created; this remains a candidate for oracle review but was not necessary to reproduce the manager aggregation failure in Phase 1.
- Phase 1 checkpoint commit: `8176812e`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Unit-Test Reproduction and Root-Cause Findings' (Protocol in workflow.md)

## Phase 2: Oracle Review and Fix Attempt

- [ ] Task: Request oracle review of findings and proposed fix
    - [ ] Provide the confirmed spec, failing unit reproduction, affected files, and root-cause findings to `oracle`.
    - [ ] Ask `oracle` to review fix direction for correctness, compatibility, and minimality before implementation.
- [ ] Task: Implement the reviewed fix attempt
    - [ ] Fix Manager registration ordering if confirmed by tests/review so state and handlers are installed before initial inventory can be missed.
    - [ ] Adjust CPM connector readiness semantics only if confirmed necessary, ensuring inventory sends wait for a usable communication/control stream.
    - [ ] Normalize bulk instance inventory payloads only if confirmed necessary, preserving backward compatibility with existing payload shapes.
    - [ ] Keep changes narrow and avoid public REST path or response-shape changes other than returning populated aggregation data.
- [ ] Task: Validate the fix against focused tests
    - [ ] Re-run the unit/package tests added in Phase 1 and confirm they pass.
    - [ ] Run any adjacent package tests needed for changed Manager/Host behavior.
    - [ ] Run `npm run build:packages` if TypeScript/package contracts changed in this phase.
- [ ] Task: Record implementation notes
    - [ ] Note which shared packages were reviewed and whether shared code was reused, adapted, deferred, or not applicable.
    - [ ] Note any validation failures and their classification according to `conductor/workflow.md`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Oracle Review and Fix Attempt' (Protocol in workflow.md)

## Phase 3: Repro Cleanup and Clean BDD Regression Fixture

- [ ] Task: Remove or replace ad-hoc repro assets from the local repro branch as appropriate
    - [ ] Review existing `repro/manager-aggregation` files and current BDD repro files for duplication, fragility, and solution alignment.
    - [ ] Remove repro-only files that should not remain once a clean regression fixture exists.
    - [ ] Preserve only durable fixtures that are needed for regression coverage.
- [ ] Task: Reimplement a clean BDD fixture based on the proposed solution
    - [ ] Create or revise BDD scenarios so they exercise the fixed Manager aggregation behavior without relying on brittle Docker bootstrap paths.
    - [ ] Ensure the fixture covers all scoped endpoints: `/list`, `/all_sequences`, and `/instances`.
    - [ ] Avoid same-port/same-manager-id reuse issues by isolating scenario resources or designing shared setup intentionally.
    - [ ] Keep BDD fixture prerequisites clear and aligned with repository BDD conventions.
- [ ] Task: Validate the clean BDD fixture
    - [ ] Run the Manager aggregation BDD scenarios with `BDD_INCLUDE_LONG_RUNNING=1` and source execution as needed.
    - [ ] Confirm direct hub queries and MM-proxied Manager aggregation assertions pass for all scoped endpoints.
    - [ ] Clean generated certs, BDD storage directories, processes, Docker containers/volumes, and other validation artifacts.
- [ ] Task: Update Conductor notes and docs if needed
    - [ ] Record why any Docker repro path was removed, retained, or left out of completion validation.
    - [ ] Document validation commands and any skipped checks with reasons.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Repro Cleanup and Clean BDD Regression Fixture' (Protocol in workflow.md)

## Phase 4: Closure Review and Checkpoint

- [ ] Task: Request closure review
    - [ ] Ask `oracle` to review the final source/test/BDD diff for correctness, maintainability, YAGNI, compatibility, and alignment with the spec.
    - [ ] Resolve any review findings or explicitly record accepted follow-ups.
- [ ] Task: Run final validation
    - [ ] Run focused package tests covering the fix.
    - [ ] Run the clean Manager aggregation BDD fixture.
    - [ ] Run `npm run build:packages`.
    - [ ] Run lint only if changed files or package conventions require it.
- [ ] Task: Final cleanup and diff review
    - [ ] Confirm no generated artifacts remain.
    - [ ] Confirm `git status --short` contains only intended Conductor/source/test changes.
    - [ ] Review final diff against the specification and acceptance criteria.
- [ ] Task: Prepare checkpoint and PR summary
    - [ ] Stage only intended files.
    - [ ] Commit scoped phase/track work according to Conductor commit policy.
    - [ ] Update `plan.md` with checkpoint commit SHA if a phase commit is created.
    - [ ] Prepare or update PR description with the fixed state, validation results, and remaining caveats.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Closure Review and Checkpoint' (Protocol in workflow.md)
