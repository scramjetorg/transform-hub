# Phase 1: Baseline and Test Audit

## Phase Acceptance Criteria

- [ ] Proposed removals are classified as safe, safe-ish, or retained with evidence and preconditions.
- [ ] Redundancy, overlap, and overcautious findings record boundary metadata, confidence, and counterpart/public-contract evidence without becoming deletion tasks.
- [ ] Every BDD sequence-upload caller is classified as catalog-eligible or upload-under-test.
- [ ] Comparable timing captures per-chunk startup, registration, scenario, total, median, and p95 measures.

## Owned Paths

- `packages/**/test/**/*.spec.ts`
- `scripts/test/**/*.spec.js`
- `bdd/features/**`, `bdd/step-definitions/**`, `bdd/lib/**`
- `scripts/run-bdd-waves.js`, `scripts/run-bdd-docker.js`

## Tasks

- [ ] Confirm safe-ish removal preconditions, including zero-spec command behavior and published-surface compatibility.
- [ ] Create and maintain the `## Test Audit Register` below as the sole removal gate; Phase 2 may reference only records with an approved final disposition.
- [ ] Build the catalog-eligibility inventory and timing baseline without changing test semantics.

## Test Audit Register

| ID | Location | Classification | Boundary tuple | Counterpart/public-contract evidence | Confidence | Precondition | Final disposition | Approver |
|---|---|---|---|---|---|---|---|---|
| Pending | Pending discovery | safe / safe-ish / retained / redundant / overlapping / overcautious | exposure, entrypoint, adapter, runtime, protocol | path and behavior | high / medium / low | explicit condition | pending / approved / retained | user or designated approver |

## Verification Commands

- `npm run test:packages:phase-final`
- Relevant supported `npm run test:bdd-ci-*` commands selected by changed paths.

## Non-goals

- No broad removal based on static similarity.
- No test-execution shortcut substitutes for final validation.
