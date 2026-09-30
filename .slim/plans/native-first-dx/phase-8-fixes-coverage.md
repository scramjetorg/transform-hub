# Phase 8 — Fixes and coverage

## Goal

Close phase findings and establish final evidence for the native-first contract and retained compatibility.

## Owned paths

- Only defects and tests directly identified by required validation/review in earlier phases

## Tasks

- [x] Address bounded validation/review findings without expanding product scope. The 2026-09-29 native Compose fixes preserved one SI identity and the existing 30-second Compose budget; focused Host coverage and the captured Compose proof passed.
- [x] Restore and validate a separate non-mTLS native-bootstrap fixture after explicit bundle `--broker-id`/principal selection. The 2026-09-30 user-approved certificate-free name-only *private v2* path accepts an available space-qualified `sth.<hub>.<space>.scramjet.internal` name from any reachable peer; it rejects an active same-name collision. Issued-mTLS names and checks remain separate. The ordinary BDD scenario observes private v2 acceptance, routed SI usability after a duplicate rejection, public SI registration 404 with unchanged inventory, and zero legacy-URL requests.
- [x] Keep explicit v1 compatibility on non-mTLS Managers only, using the same name/collision/route-readiness checks as private v2; refuse v1 STH registration when the Manager's mTLS admission mode is enabled. Focused Manager tests cover v1 qualified-name acceptance, active/pending collision refusal, mTLS v1 refusal, and standalone legacy same-ID re-registration; native Host tests enforce v2-only registration with no retry.
- [x] Apply the user-approved exact issued STH federation-Host → own Manager-ingress route permission, with fail-closed cross-space/unknown-route tests and the ordinary mTLS BDD private-v2 registration proof. The route-pair decision does not replace certificate, capability, or claim/body authorization.
- [x] Review existing Guest capacity/concurrency defaults and behavior, then ask before changing any limit. No explicit Guest session/stream maximum is configured; waiting-stream settings are minima, while `upstreamPool.maxOpenStreams` bounds a different STH upstream pool. The user was asked the required question on 2026-09-30 and questioned why a change was being considered; no limit change was requested or made. The choice to add a new cap remains open for future explicit direction, not an implementation acceptance requirement.
- [x] Reuse one issued `si` client identity/certificate/key and broker ID for concurrent independent HTTP/2 connections to that single broker binding, with exact authorization; do not add an arbitrary numeric limit on concurrent broker sessions. The one-registration-per-certificate rule is identity binding, not a session-cap requirement. Verser2 `0.9.2` and the focused 2026-09-29 Compose overlap proof passed without unrelated broker IDs or weaker certificate checks.
- [ ] Rerun the Phase 3 complete native Compose journey, Phase 5 route-map walkthroughs, and targeted local/Kubernetes documentation-boundary checks, including Phase 4 live-cluster evidence when its user-provided environment is available. The Compose journey itself was renewed on 2026-09-30; the other checks and environment-gated evidence remain open.
- [ ] Run final repository validation and record any unavailable environment-dependent evidence precisely.

## Acceptance criteria

- The plan's observable criteria are established or any limitation is explicitly evidenced and accepted before completion.
- Existing Guest capacity defaults are assessed and reported; any proposed Guest limit change is gated on the user's answer to the Phase 8 question, with no numeric cap presumed or applied before that decision.
- Broker concurrent CLI sessions are not arbitrarily capped; each `si` certificate remains authorized for exactly one broker binding. This was demonstrated by the 2026-09-29 Compose overlap proof on Verser2 `0.9.2`.
- No defect fix introduces a new public port, trust bootstrap, or compatibility removal without user direction.
- The non-mTLS native-bootstrap name-only path is independently validated, not replaced by mTLS-only evidence. Its name is a self-asserted routing label rather than authenticated identity; active name collisions fail closed and mTLS admission is not downgraded.
- Every operation/readiness check targets 1–2 seconds and completes within a hard maximum of 5 seconds. Compose evidence is capped at 30 seconds total and live Kubernetes evidence at 120 seconds total. Failures raise direct bounded exceptions; use resource diagnostics, not arbitrary sleeps.

## Verification

- `npm run lint`
- `npm run build:packages`
- `npm run test:packages`
- `npm run test:bdd-ci-verser2`, `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, `npm run test:bdd-ci-bun`, Phase 4's supported live-Kubernetes proof when a user-provided cluster is available, and documentation checks from Phase 3, plus focused HTTP/CPM compatibility tests first established in Phase 1. Final evidence enforces the 5-second operation/readiness cap and the 30/120-second total budgets.

## Non-goals

- Discretionary new features, broad test rewrites, or deployment actions.

## Execution evidence — 2026-09-29

- `npm run test:ava --workspace packages/multi-manager -- test/lib/federated-control-route-policy.spec.ts` passed 5 tests and `npm run build:packages` passed after the exact issued federation-Host policy change. `NO_HOST=true node scripts/run-bdd.js -- features/e2e/E2E-019-control-plane-admission.feature --tags "@native-bootstrap" --exit --format pretty` passed 1 scenario, 19 steps and 4 hooks after correcting the BDD public-404 assertion to the CLI's documented exit 70 plus `API returned 404`. This verifies the normal mTLS journey, not the deferred non-mTLS compatibility fixture.
- `SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE=native-compose-upstream-pool-async-output SCRAMJET_MM_COMPOSE_IMAGE=scramjetorg/multimanager:native-compose-current npm run test:bdd-native-compose` passed: 1 scenario, 18 steps, and 4 hooks. It observed the typed RPC result and removed all owned containers, networks, volumes, temporary state, and native client containers.
- The native scenario ran in 19.482 seconds; the total Cucumber run was 26.838 seconds, within the required 30-second Compose budget. Individual readiness/operation limits remain bounded at five seconds, with a reserved bounded teardown window.
- The preceding Compose result is historical 2026-09-29 evidence. Later mode changes require the renewed 2026-09-30 result below before making a final claim.

## Execution evidence — 2026-09-30

- After the dual-mode and same-name race fixes, `npm run lint` passed (774 files), `npm run build:packages` passed (35 TypeScript configs and 37 prepacked packages), `npm run test:packages` passed (37 workspace scripts), and `npm run test:bdd-ci-verser2` passed (19 scenarios, 348 steps, 4 hooks). Focused issued-mTLS and certificate-free native-bootstrap runs each passed (1 scenario, 19 steps, 4 hooks), including the self-asserted-name collision and public registration isolation checks. A focused advisory check found the expired-reservation route-wait overwrite fixed; the deterministic Manager test covers its exact interleaving.
- With the unrelated global BDD suite Host disabled only for `test:bdd-native-compose`, `SCRAMJET_BDD_NATIVE_COMPOSE_CAPTURE=native-compose-dual-mode-final SCRAMJET_MM_COMPOSE_IMAGE=scramjetorg/multimanager:native-compose-current npm run test:bdd-native-compose` passed: 1 scenario, 18 steps, 4 hooks, typed RPC `{ ready: true, value: "typed-compose" }`, and no leaked repository processes. The scenario took 12.325 seconds, within the 30-second Compose budget. The MultiManager image was rebuilt from the current source before this run.
- Remaining Phase 8 work: run the Node/Python/Bun and route-map/documentation checks; retain the live-Kubernetes user-environment gate. Guest defaults were reviewed and left unchanged after the user's question. Existing untracked BDD storage directories are not part of the proof and must remain excluded from commits until their cleanup is separately approved; both ordinary bootstrap fixtures now place future Manager storage in scenario-owned temporary paths.
