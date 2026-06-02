# Implementation Plan: Improve STH Logging for Sequence and Runtime Errors

## Phase 1: Discovery and BDD Design

- [x] Task: Confirm affected packages, entrypoints, and BDD surfaces
    - [x] Read relevant codemaps for `bdd/`, `packages/sth`, `packages/runner`, `packages/runner-node`, and `packages/adapter-process` when present.
    - [x] Identify existing `HUB-*` features, step definitions, fixtures, and log assertion helpers.
    - [x] Identify existing Node sequence fixtures that can be reused for missing imports, runtime throws, and invalid params.
- [x] Task: Define initial Process + Node BDD scenario matrix
    - [x] Select CI-blocking scenarios for stable behavior.
    - [x] Select review/known-issue scenarios for currently missing observability.
    - [x] Map each scenario to hub, sequence pre-connect, or instance runtime layer.
- [x] Task: Create track issue log scaffold
    - [x] Add `issues.md` under this track directory.
    - [x] Include columns/sections for scenario, reproduction, observed behavior, expected behavior, CI/review status, and follow-up notes.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Discovery and BDD Design' (Protocol in workflow.md)

## Phase 2: Add Initial BDD Coverage

- [x] Task: Write BDD scenarios before or alongside implementation
    - [x] Add new `HUB-*` feature coverage for missing Node imports before runtime connect.
    - [x] Add scenario coverage for runtime errors with stderr tail or crash detail visibility.
    - [x] Add scenario coverage for wrong or malformed parameters passed at startup/instance start.
    - [x] Add at least one hub-level logging scenario where a stable local failure can be reproduced.
- [x] Task: Add or update fixtures and step definitions
    - [x] Create/reuse Node sequence fixture with missing import.
    - [x] Create/reuse Node sequence fixture that throws during runtime.
    - [x] Create/reuse Node sequence fixture that validates and rejects malformed params.
    - [x] Add log assertion helpers that assert stable substrings rather than exact stack traces.
- [x] Task: Tag scenarios according to expected maturity
    - [x] Mark stable expected behavior as normal CI scenarios.
    - [x] Mark observability gaps as review/known-issue/non-CI scenarios.
    - [x] Document every review-tagged surfaced defect in `issues.md`.
- [x] Task: Run narrow BDD validation for the new/changed scenarios
    - [x] Use the narrowest relevant BDD command or tag filter available for Process + Node coverage.
    - [x] Record failures that expose missing logging in `issues.md` instead of forcing full green status when appropriate.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Add Initial BDD Coverage' (Protocol in workflow.md)

## Phase 3: Improve STH Logging Paths

- [x] Task: Trace current error propagation paths
    - [x] Inspect hub startup/config logging around `packages/sth` and related config packages.
    - [x] Inspect process adapter runner lifecycle error handling.
    - [x] Inspect outer runner stderr/exit handling in `packages/runner`.
    - [x] Inspect Node runtime wrapper error handling in `packages/runner-node`.
- [x] Task: Implement contextual sanitized logging for selected initial scenarios
    - [x] Ensure missing import/pre-connect failures surface error message and stderr tail or equivalent crash detail.
    - [x] Ensure runtime exceptions surface instance id, exit code/signal, and useful stderr/log detail.
    - [x] Ensure wrong-parameter failures include sanitized parameter context and expected shape/reason when available.
    - [x] Ensure hub-level selected failures include phase, adapter/runtime context, and root cause.
- [x] Task: Preserve protocol and security expectations
    - [x] Avoid changing runner protocol semantics unless explicitly required for observability.
    - [x] Avoid logging secrets, full environment dumps, tokens, or sensitive config values.
    - [x] Prefer additive logging and error wrapping over broad behavior changes.
- [x] Task: Update `issues.md` with implementation findings
    - [x] Record any newly discovered swallowed errors, generic errors, missing ids, or unsafe log output.
    - [x] Mark each issue as fixed, review-only, deferred, or blocked.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Improve STH Logging Paths' (Protocol in workflow.md)

## Phase 4: Validation, Cleanup, and Documentation

- [x] Task: Run focused validation
    - [x] Run the narrowest relevant BDD Process + Node validation for changed scenarios.
    - [x] Run relevant package tests for packages changed during logging improvements.
    - [x] Run `npm run lint` if TypeScript/package files were changed.
- [x] Task: Reconcile BDD expectations with observed behavior
    - [x] Promote fixed review scenarios to CI assertions where appropriate.
    - [x] Keep remaining known gaps tagged and documented in `issues.md`.
    - [x] Confirm review-tagged scenarios do not block normal CI unintentionally.
- [x] Task: Documentation and Conductor artifact updates
    - [x] Update `issues.md` with final status and skipped validation notes.
    - [x] Update plan task statuses as implementation progresses.
    - [x] Note any deferred Docker, Kubernetes, Python, or Bun parity work.
- [x] Task: Final quality gate review
    - [x] Confirm no known failing tests caused by implemented changes outside intentionally review-tagged cases.
    - [x] Confirm no undocumented runtime selection, adapter behavior, CLI/API contract, or protocol changes.
    - [x] Confirm logs remain sanitized and operationally useful.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Validation, Cleanup, and Documentation' (Protocol in workflow.md)
