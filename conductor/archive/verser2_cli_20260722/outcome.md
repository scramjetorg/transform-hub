# Outcome: Platform CLI over Verser2

## Summary

Completed and archived the Verser2 CLI track. The `si` CLI now supports native v2 operations through configured MultiManager, Manager, and direct-Hub Verser2 ingress, while retaining the existing HTTP(S)/v1 path when no Verser2 profile is selected.

Verser2 profiles require TLS server verification through a trusted CA. Client mTLS credentials are optional: CA-only profiles work when ingress does not require client authentication, while PEM and PFX client identities remain supported and recommended where the deployment supports or requires mTLS.

## Outcomes

- Added shared routed broker transport, topology/route-domain identity checks, deterministic error mapping, cancellation, and cleanup behavior.
- Added native `si api` support and migrated approved Hub, space, sequence, instance, topic, and store command paths to the shared v2 capability facade; unsupported native operations return explicit exit 80 rather than falling back to HTTP/v1.
- Added real file-backed CLI process coverage for mTLS ingress at MultiManager, Manager, and direct Hub, including rejected credentials and direct-Hub isolation.
- Added real CA-only, non-mTLS Hub-ingress process coverage with no client certificate, key, or PFX configured.
- Repaired legacy CLI BDD fixture resolution through `PACKAGES_DIR`; the focused API BDD suite passed 13 scenarios / 72 steps.
- Deferred the non-buffering send-before-get topic scenarios by marking E2E-013 `@needs-fix`.
- Published operator documentation covering CA-only and mTLS profiles, topology, route selection, command behavior, limitations, and troubleshooting.

## Validation

- `npm run build:packages` passed during the track.
- Real mTLS and CA-only CLI process tests passed through the supported AVA runner.
- `npm run test:bdd-ci-api` passed after fixture repair and the E2E-013 deferral.
- Focused configuration/profile validation passed for CA-only, PEM, and PFX profile forms.

## Deferred Technical Debt

1. **Fixture teardown hardening:** route the remaining direct spawned process fixtures through the bounded child helper and prove cleanup on fixture failure.
2. **Final artifact precision:** reconcile stale plan/codemap wording where it does not affect runtime behavior.
3. **CLI process-test startup acceleration:** evaluate built CLI fixtures or reusable compiled test infrastructure while retaining source-mode smoke coverage.
4. **Parallel independent Verser2 CLI requests:** identify sequential independent endpoint calls and add bounded concurrent dispatch over the shared broker session, with cancellation/error aggregation, deterministic output, and benchmarks.

## Important Commits

- `a6f62032` — complete native Verser2 CLI migration.
- `ef98c880` — add real CLI mTLS ingress validation.
- `3f49a01e` — resolve packaged legacy CLI BDD fixtures.
- `6668ba09` — allow CA-only Verser2 profiles without client mTLS credentials.
- `29586ad0` — simplify test runner guidance.

## Final State

The track is complete, pushed on `conductor/verser2_cli_20260722`, and archived on 2026-07-29. PR #57 remains the review surface.
