# Implementation Plan: Improve STH Logging for Sequence and Runtime Errors

## Phase 1: Discovery and BDD Design

- [ ] Task: Confirm affected packages, entrypoints, and BDD surfaces
    - [ ] Read relevant codemaps for `bdd/`, `packages/sth`, `packages/runner`, `packages/runner-node`, and `packages/adapter-process` when present.
    - [ ] Identify existing `HUB-*` features, step definitions, fixtures, and log assertion helpers.
    - [ ] Identify existing Node sequence fixtures that can be reused for missing imports, runtime throws, and invalid params.
- [ ] Task: Define initial Process + Node BDD scenario matrix
    - [ ] Select CI-blocking scenarios for stable behavior.
    - [ ] Select review/known-issue scenarios for currently missing observability.
    - [ ] Map each scenario to hub, sequence pre-connect, or instance runtime layer.
- [ ] Task: Create track issue log scaffold
    - [ ] Add `issues.md` under this track directory.
    - [ ] Include columns/sections for scenario, reproduction, observed behavior, expected behavior, CI/review status, and follow-up notes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Discovery and BDD Design' (Protocol in workflow.md)

## Phase 2: Add Initial BDD Coverage

- [ ] Task: Write BDD scenarios before or alongside implementation
    - [ ] Add new `HUB-*` feature coverage for missing Node imports before runtime connect.
    - [ ] Add scenario coverage for runtime errors with stderr tail or crash detail visibility.
    - [ ] Add scenario coverage for wrong or malformed parameters passed at startup/instance start.
    - [ ] Add at least one hub-level logging scenario where a stable local failure can be reproduced.
- [ ] Task: Add or update fixtures and step definitions
    - [ ] Create/reuse Node sequence fixture with missing import.
    - [ ] Create/reuse Node sequence fixture that throws during runtime.
    - [ ] Create/reuse Node sequence fixture that validates and rejects malformed params.
    - [ ] Add log assertion helpers that assert stable substrings rather than exact stack traces.
- [ ] Task: Tag scenarios according to expected maturity
    - [ ] Mark stable expected behavior as normal CI scenarios.
    - [ ] Mark observability gaps as review/known-issue/non-CI scenarios.
    - [ ] Document every review-tagged surfaced defect in `issues.md`.
- [ ] Task: Run narrow BDD validation for the new/changed scenarios
    - [ ] Use the narrowest relevant BDD command or tag filter available for Process + Node coverage.
    - [ ] Record failures that expose missing logging in `issues.md` instead of forcing full green status when appropriate.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Add Initial BDD Coverage' (Protocol in workflow.md)

## Phase 3: Improve STH Logging Paths

- [ ] Task: Trace current error propagation paths
    - [ ] Inspect hub startup/config logging around `packages/sth` and related config packages.
    - [ ] Inspect process adapter runner lifecycle error handling.
    - [ ] Inspect outer runner stderr/exit handling in `packages/runner`.
    - [ ] Inspect Node runtime wrapper error handling in `packages/runner-node`.
- [ ] Task: Implement contextual sanitized logging for selected initial scenarios
    - [ ] Ensure missing import/pre-connect failures surface error message and stderr tail or equivalent crash detail.
    - [ ] Ensure runtime exceptions surface instance id, exit code/signal, and useful stderr/log detail.
    - [ ] Ensure wrong-parameter failures include sanitized parameter context and expected shape/reason when available.
    - [ ] Ensure hub-level selected failures include phase, adapter/runtime context, and root cause.
- [ ] Task: Preserve protocol and security expectations
    - [ ] Avoid changing runner protocol semantics unless explicitly required for observability.
    - [ ] Avoid logging secrets, full environment dumps, tokens, or sensitive config values.
    - [ ] Prefer additive logging and error wrapping over broad behavior changes.
- [ ] Task: Update `issues.md` with implementation findings
    - [ ] Record any newly discovered swallowed errors, generic errors, missing ids, or unsafe log output.
    - [ ] Mark each issue as fixed, review-only, deferred, or blocked.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Improve STH Logging Paths' (Protocol in workflow.md)

## Phase 4: Validation, Cleanup, and Documentation

- [ ] Task: Run focused validation
    - [ ] Run the narrowest relevant BDD Process + Node validation for changed scenarios.
    - [ ] Run relevant package tests for packages changed during logging improvements.
    - [ ] Run `npm run lint` if TypeScript/package files were changed.
- [ ] Task: Reconcile BDD expectations with observed behavior
    - [ ] Promote fixed review scenarios to CI assertions where appropriate.
    - [ ] Keep remaining known gaps tagged and documented in `issues.md`.
    - [ ] Confirm review-tagged scenarios do not block normal CI unintentionally.
- [ ] Task: Documentation and Conductor artifact updates
    - [ ] Update `issues.md` with final status and skipped validation notes.
    - [ ] Update plan task statuses as implementation progresses.
    - [ ] Note any deferred Docker, Kubernetes, Python, or Bun parity work.
- [ ] Task: Final quality gate review
    - [ ] Confirm no known failing tests caused by implemented changes outside intentionally review-tagged cases.
    - [ ] Confirm no undocumented runtime selection, adapter behavior, CLI/API contract, or protocol changes.
    - [ ] Confirm logs remain sanitized and operationally useful.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Validation, Cleanup, and Documentation' (Protocol in workflow.md)
