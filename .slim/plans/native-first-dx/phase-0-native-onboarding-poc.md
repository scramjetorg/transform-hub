# Phase 0 — Native onboarding PoC

## Goal

Prove and obtain user feedback on the native onboarding contract before permanent product work.

## Owned paths

- `.slim/plans/native-first-dx/poc.md`
- `examples/native-onboarding-poc/run.ts` and its maintainer-only `README.md`
- Disposable plan-local scripts/config and generated runtime state only

## Tasks

- [x] Create an isolated local identity/config directory with one MultiManager, one embedded Manager/Space, one process-adapter STH, and an existing minimal Node fixture.
- [x] Produce one trusted local connection artifact and its copy-paste equivalent; do not obtain trust material through `2443`.
- [x] Connect `si` natively to `https://127.0.0.1:2443`, verify the route/identity, deploy the fixture, start it, and observe one expected result.
- [x] Capture listener/publication and request-path evidence that only `2443` is client-facing and native `si` did not reach `8000` or `11000`.
- [x] Exercise wrong-CA and wrong-route failures; record the observed generic, secret-safe result. Distinct diagnostics remain a Phase 1 finding.
- [x] Ask the user to identify the public endpoint, trust source, selected Space/Hub, and failing boundary. Record the response and recommendation in `poc.md`.
- [x] Have the user follow one sequence-author route and one operator or compatibility route through a disposable journey map. Record unclear labels, failed handoffs, and the preferred next step in `poc.md`.
- [x] Mark every criterion met or not met with supporting evidence and obtain explicit direction through `plan-update` before MVP work.
- [x] Dispose of all plan-local scripts/configuration before closing the phase; retain only `poc.md`.
- [x] Run `plan-update` before beginning Phase 1 to keep, narrow, or rescope MVP work using the observed outcome.
- [x] Relocate the diagnostic runner to `examples/native-onboarding-poc/`, add its maintainer-only README, and retain the explicit repository asset.
- [x] Dispose of generated runtime state and the plan-local copy; retain no generated material in the repository.
- [x] Record that Phase 0 validation of the retained example was manual and non-CI; Phase 3 owns its cleanup and promotion into the supported canonical example.

## Acceptance criteria

- The user-confirmed criteria are recorded as met/not met in `poc.md`; at least one outcome is direct user feedback.
- The author and non-author guidance routes are recorded as met/not met with direct user feedback before the `plan-update` rescoping step.
- Phase 0 evidence is recorded in `poc.md`; distinct `TRUST`/`ROUTE` diagnostics are explicitly not met and remain in Phase 1 scope.
- “Client-facing” means reachable from the `si` client network namespace or published outside the private deployment network. Loopback-only listeners may remain; request-path evidence separately proves `si` did not call `8000` or `11000`.
- No permanent product, test, or documentation artifact is changed.
- The retained diagnostic example is the explicit exception: it is maintained-but-transient, maintainer-only, and proves current topology only. It requires built `dist/`, Linux `openssl`/`strace`, and fixed free ports; generated material remains in `/tmp` and is never deployed.

## Verification

- PoC command transcript, listener/network evidence, no-fallback request evidence, and negative TLS/route observations.

## Non-goals

- Product commands/defaults, permanent templates, production hardening, HTTP removal, and Kubernetes deployment work.
- Phase 1 maintenance of the retained example beyond its initial relocation/README is out of Phase 0 ownership.
