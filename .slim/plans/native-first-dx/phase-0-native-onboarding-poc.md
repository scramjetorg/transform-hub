# Phase 0 — Native onboarding PoC

## Goal

Prove and obtain user feedback on the native onboarding contract before permanent product work.

## Owned paths

- `.slim/plans/native-first-dx/poc.md`
- Disposable plan-local scripts and config only

## Tasks

- [ ] Create an isolated local identity/config directory with one MultiManager, one embedded Manager/Space, one process-adapter STH, and an existing minimal Node fixture.
- [ ] Produce one trusted local connection artifact and its copy-paste equivalent; do not obtain trust material through `2443`.
- [ ] Connect `si` natively to `https://127.0.0.1:2443`, verify the route/identity, deploy the fixture, start it, and observe one expected result.
- [ ] Capture listener/publication and request-path evidence that only `2443` is client-facing and native `si` did not reach `8000` or `11000`.
- [ ] Exercise wrong-CA and wrong-route failures; record distinct, secret-safe messages.
- [ ] Ask the user to identify the public endpoint, trust source, selected Space/Hub, and failing boundary. Record the response and recommendation in `poc.md`.
- [ ] Mark every criterion met or not met with supporting evidence. If any core native-journey, no-fallback, or private-port criterion is not met, obtain explicit user direction through `plan-update` before MVP work.
- [ ] Dispose of all plan-local scripts/configuration before closing the phase; retain only `poc.md`.
- [ ] Run `plan-update` before beginning Phase 1 to keep, narrow, or rescope MVP work using the observed outcome.

## Acceptance criteria

- The user-confirmed criteria are recorded as met/not met in `poc.md`; at least one outcome is direct user feedback.
- “Client-facing” means reachable from the `si` client network namespace or published outside the private deployment network. Loopback-only listeners may remain; request-path evidence separately proves `si` did not call `8000` or `11000`.
- No permanent product, test, or documentation artifact is changed.

## Verification

- PoC command transcript, listener/network evidence, no-fallback request evidence, and negative TLS/route observations.

## Non-goals

- Product commands/defaults, permanent templates, production hardening, HTTP removal, and Kubernetes deployment work.
