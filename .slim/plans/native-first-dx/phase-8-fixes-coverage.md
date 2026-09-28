# Phase 8 — Fixes and coverage

## Goal

Close phase findings and establish final evidence for the native-first contract and retained compatibility.

## Owned paths

- Only defects and tests directly identified by required validation/review in earlier phases

## Tasks

- [ ] Address bounded validation/review findings without expanding product scope.
- [ ] Rerun the Phase 3 complete native Compose journey, Phase 5 route-map walkthroughs, and targeted local/Kubernetes documentation-boundary checks, including Phase 4 live-cluster evidence when its user-provided environment is available.
- [ ] Run final repository validation and record any unavailable environment-dependent evidence precisely.

## Acceptance criteria

- The plan's observable criteria are established or any limitation is explicitly evidenced and accepted before completion.
- No defect fix introduces a new public port, trust bootstrap, or compatibility removal without user direction.
- Every operation/readiness check targets 1–2 seconds and completes within a hard maximum of 5 seconds. Compose evidence is capped at 30 seconds total and live Kubernetes evidence at 120 seconds total. Failures raise direct bounded exceptions; use resource diagnostics, not arbitrary sleeps.

## Verification

- `npm run lint`
- `npm run build:packages`
- `npm run test:packages`
- `npm run test:bdd-ci-verser2`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, `npm run test:bdd-ci-bun`, Phase 4's supported live-Kubernetes proof when a user-provided cluster is available, and documentation checks from Phase 3, plus focused HTTP/CPM compatibility tests first established in Phase 1. Final evidence enforces the 5-second operation/readiness cap and the 30/120-second total budgets.

## Non-goals

- Discretionary new features, broad test rewrites, or deployment actions.
