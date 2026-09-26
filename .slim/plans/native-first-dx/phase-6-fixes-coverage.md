# Phase 6 — Fixes and coverage

## Goal

Close phase findings and establish final evidence for the native-first contract and retained compatibility.

## Owned paths

- Only defects and tests directly identified by required validation/review in earlier phases

## Tasks

- [ ] Address bounded validation/review findings without expanding product scope.
- [ ] Rerun the Phase 3 complete native Compose journey and targeted local/Kubernetes documentation-boundary checks. Kubernetes remains explicitly non-live-cluster-verified unless the deferred test-environment decision is reactivated.
- [ ] Run final repository validation and record any unavailable environment-dependent evidence precisely.

## Acceptance criteria

- The plan's observable criteria are established or any limitation is explicitly evidenced and accepted before completion.
- No defect fix introduces a new public port, trust bootstrap, or compatibility removal without user direction.

## Verification

- `npm run lint`
- `npm run build:packages`
- `npm run test:packages`
- `npm run test:bdd-ci-verser2`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, `npm run test:bdd-ci-bun`, and documentation checks from Phase 3, plus focused HTTP/CPM compatibility tests first established in Phase 1.

## Non-goals

- Discretionary new features, broad test rewrites, or deployment actions.
