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

- [x] Task: Request oracle review of findings and proposed fix
    - [x] Provide the confirmed spec, failing unit reproduction, affected files, and root-cause findings to `oracle`.
    - [x] Ask `oracle` to review fix direction for correctness, compatibility, and minimality before implementation.
- [x] Task: Implement the reviewed fix attempt
    - [x] Fix Manager registration ordering if confirmed by tests/review so state and handlers are installed before initial inventory can be missed.
    - [x] Adjust CPM connector readiness semantics only if confirmed necessary, ensuring inventory sends wait for a usable communication/control stream. (Not changed in Phase 2 per oracle guidance; not required by focused reproduction.)
    - [x] Normalize bulk instance inventory payloads only if confirmed necessary, preserving backward compatibility with existing payload shapes.
    - [x] Keep changes narrow and avoid public REST path or response-shape changes other than returning populated aggregation data.
- [x] Task: Validate the fix against focused tests
    - [x] Re-run the unit/package tests added in Phase 1 and confirm they pass.
    - [x] Run any adjacent package tests needed for changed Manager/Host behavior.
    - [x] Run `npm run build:packages` if TypeScript/package contracts changed in this phase.
- [x] Task: Record implementation notes
    - [x] Note which shared packages were reviewed and whether shared code was reused, adapted, deferred, or not applicable.
    - [x] Note any validation failures and their classification according to `conductor/workflow.md`.

### Phase 2 Notes

- Oracle review recommended:
    - Install Manager-side hub state, controller store entry, and event handlers before `await sth.init()`.
    - Add rollback cleanup for failed `sth.init()` without relying on public `delete()` semantics.
    - Accept both wrapped `{ instance }` and raw `Instance` inventory payloads.
    - Leave `CPMConnector` readiness semantics unchanged until a focused test proves it remains necessary.
- Implemented:
    - Added `ISTHConnectionStore.remove()` / `SthConnectionStore.remove()` as an internal rollback primitive.
    - Added `ISTHInfoRegister.removeHub()` / `STHInfoRegister.removeHub()` for failed-registration rollback.
    - Reordered `Manager.handleSthRegistration()` so hub state and listeners are installed before `sth.init()` for new registration and re-registration.
    - Added Manager-side instance event payload normalization for wrapped and raw payloads.
    - Expanded focused tests for new registration, re-registration, init rollback, raw payloads, wrapped payloads, raw `GONE`, and the `STHController.hostMessageHandler()` bulk raw instance path.
- Validation:
    - Passed: `npm --workspace @scramjet/manager run test:ava -- --match "Manager *"`.
    - Passed: `npm --workspace @scramjet/manager run test:ava -- test/manager-registration.spec.ts`.
    - Passed after self-contained cert fixture correction: `npm --workspace @scramjet/manager run test:ava` (120 tests).
    - Corrected `verser2-trust-export` test with `ensureCaFixture()` so it reuses `packages/verser/test/cert/myCA.pem` when present, otherwise generates a CA fixture in an OS temp directory and compares against that certificate metadata.
    - Passed: `npm run build:packages`.
- Shared package review:
    - Adapted existing `@scramjet/types` manager interfaces to expose the narrow rollback helpers used by Manager internals.
    - No new protocol constants or public REST contracts were added.
- Phase 2 checkpoint commit: `9b0d49b9`.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Oracle Review and Fix Attempt' (Protocol in workflow.md)

## Phase 3: Repro Cleanup and Clean BDD Regression Fixture

- [x] Task: Remove or replace ad-hoc repro assets from the local repro branch as appropriate
    - [x] Review existing `repro/manager-aggregation` files and current BDD repro files for duplication, fragility, and solution alignment.
    - [x] Remove repro-only files that should not remain once a clean regression fixture exists.
    - [x] Preserve only durable fixtures that are needed for regression coverage.
- [x] Task: Reimplement a clean BDD fixture based on the proposed solution
    - [x] Create or revise BDD scenarios so they exercise the fixed Manager aggregation behavior without relying on brittle Docker bootstrap paths.
    - [x] Ensure the fixture covers all scoped endpoints: `/list`, `/all_sequences`, and `/instances`.
    - [x] Avoid same-port/same-manager-id reuse issues by isolating scenario resources or designing shared setup intentionally.
    - [x] Keep BDD fixture prerequisites clear and aligned with repository BDD conventions.
- [x] Task: Validate the clean BDD fixture
    - [x] Run the Manager aggregation BDD scenarios with `BDD_INCLUDE_LONG_RUNNING=1` and source execution as needed.
    - [x] Confirm direct hub queries and MM-proxied Manager aggregation assertions pass for all scoped endpoints.
    - [x] Clean generated certs, BDD storage directories, processes, Docker containers/volumes, and other validation artifacts.
- [x] Task: Update Conductor notes and docs if needed
    - [x] Record why any Docker repro path was removed, retained, or left out of completion validation.
    - [x] Document validation commands and any skipped checks with reasons.

### Phase 3 Notes

- Removed brittle Docker repro assets from `repro/manager-aggregation` and moved durable hello sequence/startup fixtures under `bdd/fixtures/manager-aggregation`.
- Reworked `MANAGER-002` from three expected-failure repro scenarios into one isolated regression scenario using free ports, unique Manager/MM ids, temp identity dirs, and direct hub sanity checks.
- BDD validation commands run:
    - `BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"`
    - repeated with `SCRAMJET_TEST_LOG=1` for failure diagnosis.
- Validation classification and fixes discovered during BDD cleanup:
    - Initial compile/import failures were fixture issues and fixed: TypeScript `satisfies` unsupported under this toolchain; generated verser cert fixtures are required by unrelated imported BDD steps before targeted scenarios run.
    - Oracle review for the newly proven CPM readiness issue recommended preserving existing `connect` semantics and introducing a separate `communicationReady` event fired after `communicationStream` exists; implemented this narrow host-side change so inventory snapshots are sent only when the communication stream can accept them.
    - Real BDD also exposed a MultiManager verser2 Host federation issue; fixed `createVerser2HostOptions()` to provide a stable `hostId` derived from `localBroker.peerId`.
    - Real BDD exposed that `/log` stream failures could roll back otherwise usable STH registration; made the Manager log stream request best-effort while keeping `/platform` as the critical communication path.
    - Proxy assertions now poll the requested Manager endpoint to account for asynchronous inventory delivery after registration.
    - Generated BDD/verser fixtures are ignored rather than deleted after every run: cert artifacts are covered by existing `*.crt`, `*.csr`, `*.ext`, `*.key`, `*.pem`, `*.srl` rules; `bdd/mgr-agg-*/` is now ignored; `bdd/step-definitions/verser2/isolated-routing.ts` generates its localhost cert fixture once when missing.
- Validation passed:
    - `npm --workspace @scramjet/multi-manager test -- test/lib/verser2-host-config.spec.ts`.
    - `npm --workspace @scramjet/manager run test:ava -- test/manager-registration.spec.ts`.
    - `BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"`.
    - `npm run build:packages`.
- Phase 3 checkpoint commit: `9b512443`.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Repro Cleanup and Clean BDD Regression Fixture' (Protocol in workflow.md)

## Phase 4: Closure Review and Checkpoint

- [x] Task: Request closure review
    - [x] Ask `oracle` to review the final source/test/BDD diff for correctness, maintainability, YAGNI, compatibility, and alignment with the spec.
    - [x] Resolve any review findings or explicitly record accepted follow-ups.
- [x] Task: Run final validation
    - [x] Run focused package tests covering the fix.
    - [x] Run the clean Manager aggregation BDD fixture.
    - [x] Run `npm run build:packages`.
    - [x] Run lint only if changed files or package conventions require it. (Not run: final changed files were covered by TypeScript build and targeted tests; no new lint-only patterns were introduced.)
- [x] Task: Final cleanup and diff review
    - [x] Confirm generated artifacts are either ignored intentional fixtures or not present in `git status --short`.
    - [x] Confirm `git status --short` contains only intended Conductor/source/test changes.
    - [x] Review final diff against the specification and acceptance criteria.
- [~] Task: Prepare checkpoint and PR summary
    - [x] Stage only intended files.
    - [x] Commit scoped phase/track work according to Conductor commit policy.
    - [ ] Update `plan.md` with checkpoint commit SHA if a phase commit is created.
    - [x] Prepare or update PR description with the fixed state, validation results, and remaining caveats.

### Phase 4 Notes

- Closure `oracle` review found no blocking issues.
- Addressed the only actionable review suggestion by tracking spawned BDD hub processes immediately after spawn, before API readiness checks, so teardown can clean them if readiness fails.
- Final validation passed:
    - `npm --workspace @scramjet/manager run test:ava -- test/manager-registration.spec.ts`.
    - `npm --workspace @scramjet/multi-manager test -- test/lib/verser2-host-config.spec.ts`.
    - `BDD_INCLUDE_LONG_RUNNING=1 SCRAMJET_SPAWN_TS=1 npm --prefix bdd run test:bdd -- -t "@manager-aggregation-repro"`.
    - `npm run build:packages`.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Closure Review and Checkpoint' (Protocol in workflow.md)
