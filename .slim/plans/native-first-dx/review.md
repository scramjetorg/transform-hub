# Plan review record

## 2026-09-22 — Developer guidance phase advisory

The advisory review recommended placing Guided developer journeys after detailed documentation so it routes through stable technical guides. The user confirmed that placement, all seven audiences, all routing criteria, and Phase 0 author/non-author guidance feedback. The phase is bounded to navigation, entrypoints, sidebar generation, and cross-links; it does not modify runtime behaviour or technical guide ownership.

The materialized-plan review found overlapping Phase 2/3/5 ownership. Resolved by assigning executable templates and runtime proof exclusively to Phase 2; detailed technical guides exclusively to Phase 3; and README entrypoints, task gateway, sidebar ordering, and navigation exclusively to Phase 5. Generated outputs are derived in every phase, not standalone authored paths.

## 2026-09-27 — Phase 0 rescoping finding

The Phase 0 PoC proved the native root/Space journey, trusted local onboarding form, `2443`-only client-facing topology, no HTTP fallback traffic, Node deploy/stdin, and `Hello Alice?`; the user reported that the author route and labels are clear. Invalid-CA and missing-route profiles both returned generic `CONNECTION` exit 58 rather than distinct `TRUST` 51 and `ROUTE` 55. Per explicit user direction, Phase 1 retains its diagnostic correction while the proven native topology remains unchanged. The existing no-live-Kubernetes limitation is unchanged.

## 2026-09-27 — Retained diagnostic example amendment

Per user direction, the PoC evidence/history remains preserved while `examples/native-onboarding-poc/` is promoted and cleaned in Phase 3 as the canonical published user example. Phase 0 owns the initial relocation and disposal of generated runtime state and the plan-local copy; Phase 1 maintains it for native profile/bundle/routing/diagnostic/CLI contract changes; Phase 2 does not own it. The example requires built `dist/`, Linux `openssl`/`strace`, and fixed free ports; generated material remains in `/tmp` and must not be deployed. The cleaned publication must use the trusted-bundle contract and separate STH/`si` identities rather than preserving PoC-only credentials.

## 2026-09-27 — Mandatory test-speed constraint

Per the user's amendment, every operation/readiness test targets 1–2 seconds and has a hard 5-second maximum; Compose evidence has a 30-second total budget and live Kubernetes evidence a 120-second total budget. Failures must raise direct, bounded exceptions with actionable diagnostics and use direct resource diagnostics rather than arbitrary sleeps. This is active acceptance and verification criteria.

## 2026-09-27 — User/Oracle scope amendment

The user confirmed Phase 1 native CLI/config scope (`--verser2-api-port`, default no v1/direct listener, loopback local mTLS/v2, semantic `manager.connectionBundle`, explicit legacy `--port`, four-command UX, separate STH/`si` identities, and focused tests/BDD). The user confirmed Phase 3 promotion/cleanup of `examples/native-onboarding-poc/`, the typed two-sequence RPC tutorial, root-version-derived `^2.2.0` drift test, npm/npx-only JavaScript tooling, complete documentation corrections, native Compose MM+STH reference/BDD proof, and AGENTS updates. The user approved a new live-Kubernetes Phase 4 before Guided DX, constrained to a user-provided cluster with no provisioning/HA/RBAC automation and 120-second e2e/5-second operation caps; existing phases are renumbered 5–8. Oracle review history remains preserved; this amendment materializes the user-confirmed scope without changing completed Phase 0/1/2 evidence.

## 2026-09-27 — User-approved principal-bound generic enrollment amendment

The user approved updating only the `.slim/plans/native-first-dx/` artifacts to materialize a bounded generic enrollment extension; no product or documentation implementation/outcomes are authorized by this handoff, and no `outcomes.md` is to be created. Oracle recommended versioned generic CSR v2 principal claims with initial `sth` and `si` types, strict MultiManager authorization over role/peer/route claims rather than CA-only admission, an MM-owned private redemption lifecycle, and a distinct `si identity enroll generate|redeem` facade. The approved materialization also requires enrolled bundle credential references and a unique broker ID, preserves legacy/v1 compatibility policy, and forbids secret material in bundles, logs, copy-paste forms, and public responses.

Phase 3 now owns the canonical single-Compose requirements: CA/MM server only initially, published `127.0.0.1:2443`, STH CSR generate → local approve → private redeem → start/register, and independently enrolled `si` CSR → approve → redeem → bundle import → typed RPC, with explicit file/resource/process cleanup. The bounded extension allows no rotation, CRL, HSM, HA, RBAC, or remote approval. All operation/readiness checks target 1–2 seconds with a hard 5-second maximum, and Compose evidence has a 30-second total budget. Prior plan history and evidence remain unchanged.

The concrete design recorded by this amendment is: v1 remains unchanged; v2 has separate request, approval, issued-certificate, grant, and issued-principal records; `sth` and `si` are the only initial principal types and must carry canonical role/peer/route claims; and MM authorization is deny-first, then exact claim policy, then an explicit bounded local exemption, with legacy policy restricted to legacy/v1. MM owns the issuer, policy, grant TTL/store, private redemption endpoint, one-time redemption, and issued-principal lifecycle. Public trust artifacts and all public/logging/copy-paste surfaces contain trust and credential references only, never secret contents.

## 2026-09-27 — User-approved Oracle offline CSR signing supersession

The user approved superseding the preceding redemption/grant/listener/operator-approval model with Oracle's offline CSR signing model. The preceding amendment remains history only; this handoff authorizes plan-artifact changes only, creates no outcomes, and does not authorize implementation.

The current decision is: STH receives one certificate authorizing its exact broker plus guest registration set; `si` receives one certificate authorizing one broker. The caller generates its local private key and CSR, then invokes Manager CLI `v2 sign` offline. That command validates the CSR and exact registration claims, signs it with the configured authority, persists the public issued record, and lets the caller install the returned certificate. The signing authority is not present at MM.

The public MM `2443` path reads the public issued registry and checks the actual presented raw certificate fingerprint, serial, SAN, and Verser registration against the record and exact authorized set. v2 has no CA key at MM, redemption endpoint/listener, grant, or operator approval file. v1 is unchanged. The v2 namespace is public-issued, append-only/auditable, indexed by certificate ID plus raw fingerprint/serial/SAN/principal/broker/guest set; private keys and signing authority material are excluded. Compose publishes only `2443`, and BDD removes all generated keys/CSRs/certificates, registry records, temporary resources, containers, and processes in both success and failure paths.

The exact test matrix is recorded in `index.md` and Phase 1: v1 regression/no cross-version authorization; CSR v2 schema and exact STH/`si` bindings; offline `Manager v2 sign` validation/sign/persistence and no-MM-key checks; registry checks for raw fingerprint, serial, SAN, Verser registration, exact-set equality, expiry/revocation, and fail-closed mismatches; namespace/secret-boundary checks; CLI/config checks; and single-2443 Compose/BDD sign-install-register/connect/typed-RPC plus no-redemption/grant/listener/operator-file/HTTP-fallback and complete cleanup checks.

## 2026-09-28 — User-confirmed enrollment binding policy

The user confirmed that enrollment is unique per `(realm, space, hub)`, with a distinct certificate and private key for each binding. One STH certificate authorizes only that binding's federation host, broker, and guest route; normal multi-Hub certificates are not supported. Fleet certificates are deferred to plan-completion follow-up outcomes because shared keys add revocation and rotation complexity, and are revisited only when an explicit future fleet requirement is raised. Prior amendment history remains preserved, and no `outcomes.md` is created.
