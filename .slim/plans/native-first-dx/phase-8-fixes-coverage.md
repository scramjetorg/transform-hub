# Phase 8 — Fixes and coverage

## Goal

Close phase findings and establish final evidence for the native-first contract and retained compatibility.

## Owned paths

- Only defects and tests directly identified by required validation/review in earlier phases

## Tasks

- [x] Address bounded validation/review findings without expanding product scope. The 2026-09-29 native Compose fixes preserved one SI identity and the existing 30-second Compose budget; focused Host coverage and the captured Compose proof passed.
- [ ] Review existing Guest capacity/concurrency defaults and behavior; before changing any Guest limit, ask the user: “Should Guests have an explicit concurrent-session or stream limit, and if so what scope/default/configurability and proof do you want?” Do not infer a numeric cap or treat this unresolved choice as implementation acceptance.
- [x] Reuse one issued `si` client identity/certificate/key and broker ID for concurrent independent HTTP/2 connections to that single broker binding, with exact authorization; do not add an arbitrary numeric limit on concurrent broker sessions. The one-registration-per-certificate rule is identity binding, not a session-cap requirement. Verser2 `0.9.2` and the focused 2026-09-29 Compose overlap proof passed without unrelated broker IDs or weaker certificate checks.
- [ ] Rerun the Phase 3 complete native Compose journey, Phase 5 route-map walkthroughs, and targeted local/Kubernetes documentation-boundary checks, including Phase 4 live-cluster evidence when its user-provided environment is available.
- [ ] Run final repository validation and record any unavailable environment-dependent evidence precisely.

## Acceptance criteria

- The plan's observable criteria are established or any limitation is explicitly evidenced and accepted before completion.
- Existing Guest capacity defaults are assessed and reported; any proposed Guest limit change is gated on the user's answer to the Phase 8 question, with no numeric cap presumed or applied before that decision.
- Broker concurrent CLI sessions are not arbitrarily capped; each `si` certificate remains authorized for exactly one broker binding. This was demonstrated by the 2026-09-29 Compose overlap proof on Verser2 `0.9.2`.
- No defect fix introduces a new public port, trust bootstrap, or compatibility removal without user direction.
- Every operation/readiness check targets 1–2 seconds and completes within a hard maximum of 5 seconds. Compose evidence is capped at 30 seconds total and live Kubernetes evidence at 120 seconds total. Failures raise direct bounded exceptions; use resource diagnostics, not arbitrary sleeps.

## Verification

- `npm run lint`
- `npm run build:packages`
- `npm run test:packages`
- `npm run test:bdd-ci-verser2`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, `npm run test:bdd-ci-bun`, Phase 4's supported live-Kubernetes proof when a user-provided cluster is available, and documentation checks from Phase 3, plus focused HTTP/CPM compatibility tests first established in Phase 1. Final evidence enforces the 5-second operation/readiness cap and the 30/120-second total budgets.

## Non-goals

- Discretionary new features, broad test rewrites, or deployment actions.

## Execution evidence — 2026-09-29

- `SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE=native-compose-upstream-pool-async-output SCRAMJET_MM_COMPOSE_IMAGE=scramjetorg/multimanager:native-compose-current npm run test:bdd-native-compose` passed: 1 scenario, 18 steps, and 4 hooks. It observed the typed RPC result and removed all owned containers, networks, volumes, temporary state, and native client containers.
- The native scenario ran in 19.482 seconds; the total Cucumber run was 26.838 seconds, within the required 30-second Compose budget. Individual readiness/operation limits remain bounded at five seconds, with a reserved bounded teardown window.
- Remaining Phase 8 work is unchanged: assess existing Guest capacity defaults, ask the user the required Guest-limit question before any change, then complete the remaining final repository and environment-dependent evidence.
