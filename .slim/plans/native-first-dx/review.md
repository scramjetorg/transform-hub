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

The superseded decision was: STH receives one certificate authorizing its exact broker plus guest registration set; `si` receives one certificate authorizing one broker. The current decision below narrows this to a binding-scoped federation authorization. The caller generates its local private key and CSR, then invokes Manager CLI `v2 sign` offline. That command validates the CSR and exact registration claims, signs it with the configured authority, persists the public issued record, and lets the caller install the returned certificate. The signing authority is not present at MM.

The public MM `2443` path reads the public issued registry and checks the actual presented raw certificate fingerprint, serial, SAN, and Verser registration against the record and exact authorized set. v2 has no CA key at MM, redemption endpoint/listener, grant, or operator approval file. v1 is unchanged. The v2 namespace is public-issued, append-only/auditable, indexed by certificate ID plus raw fingerprint/serial/SAN/principal/broker/guest set; private keys and signing authority material are excluded. Compose publishes only `2443`, and BDD removes all generated keys/CSRs/certificates, registry records, temporary resources, containers, and processes in both success and failure paths.

The exact test matrix is recorded in `index.md` and Phase 1: v1 regression/no cross-version authorization; CSR v2 schema and exact STH/`si` bindings; offline `Manager v2 sign` validation/sign/persistence and no-MM-key checks; registry checks for raw fingerprint, serial, SAN, Verser registration, exact-set equality, expiry/revocation, and fail-closed mismatches; namespace/secret-boundary checks; CLI/config checks; and single-2443 Compose/BDD sign-install-register/connect/typed-RPC plus no-redemption/grant/listener/operator-file/HTTP-fallback and complete cleanup checks.

## 2026-09-28 — User-confirmed enrollment binding policy

The user confirmed that enrollment is unique per `(realm, space, hub)`, with a distinct certificate and private key for each binding. One STH certificate authorizes only that binding's federation host, broker, and guest route; normal multi-Hub certificates are not supported. Fleet certificates are deferred to plan-completion follow-up outcomes because shared keys add revocation and rotation complexity, and are revisited only when an explicit future fleet requirement is raised. Prior amendment history remains preserved, and no `outcomes.md` is created.

## 2026-09-28 — Oracle federation transport and authorization clarification

The confirmed model requires canonical transport names in all CSR claims, issued records, bundles, and diagnostics: `realm`, `space`, `hub`, `federationHost`, `broker`, and `guestRoute`. Uniqueness is enforced on the `(realm, space, hub)` binding and its certificate/key indexes; collisions fail closed. Rotation is binding-scoped and records explicit supersession; revocation or expiry invalidates the old certificate for both the actual federation callback and Manager registration. Fleet/shared-key and normal multi-Hub certificates remain deferred follow-up outcomes.

The STH certificate authorizes the exact binding tuple `(realm, space, hub, federationHost, broker, guestRoute)`, not merely a broker and guest set. Federation callback authorization must inspect the actual presented certificate and authenticated federation principal, and Manager registration must bind to that authenticated principal rather than a claimed route, broker, or callback identity. `si` has a separate client identity and certificate/key for one broker and must not reuse an STH or another `si` broker identity. These requirements supersede any earlier broker/guest-only assertion while leaving v1 compatibility unchanged.

## 2026-09-28 — Verser2 federation-context dependency

The user requested and approved creating [signicode/verser2#72](https://github.com/signicode/verser2/issues/72), “Preserve verified federation authorization context for local Guest dispatch”. It tracks the required backward-compatible Verser2 Host internal API/implementation extension: retain accepted `authorizeFederation` opaque context on an inbound federation session and supply it to directly attached local Guest dispatch, without wire, header, body, configuration, or client API changes.

The user explicitly chose to pause dependent secure federation enrollment work until this dependency is available. This record authorizes no product, documentation, or outcomes changes; unrelated work is unaffected.

## 2026-09-28 — User-confirmed delivery boundary after Verser2 v0.9.0

The user approved the complete Verser2 `0.9.0` family upgrade and its authenticated inbound federation-session context for this plan. Managed STH claims source `realmId` from explicit MultiManager configuration and `spaceId` from the child Manager ID. The certificate binds the STH federation Host and the one STH control route used for authenticated Manager registration; normal dynamic `runner.<instanceId>` routes remain STH-local and are not certificate claims or MultiManager registrations.

The user explicitly chose not to add a route-advertisement authorization dependency or other discretionary hardening. This plan enforces the exact STH control route at federation and Manager-registration boundaries, but does not claim to reject every unused route a modified certificate holder could advertise; that requires a future Verser capability. Binding-scoped rotation uses a configurable overlap window. No outcomes artifact is created.

## 2026-09-28 — User-confirmed federated forwarding policy

The user directed MultiManager to use the existing Verser2 `0.9.0` `routeAuthorizer` to block forwarding/resolution to extra routes. The policy is deliberately narrow and delivery-focused: allow each child Manager's control self-pair and its route to a successfully registered STH control route; deny unregistered STH, `runner.*`, cross-space, and arbitrary federated route pairs. The callback is a forwarding gate only: it leaves route advertisements unchanged, does not inspect API paths, and does not affect STH-local instance transport.

## 2026-09-28 — User-confirmed local diagnostic capture boundary

The user clarified that public CA fingerprints may appear in the opt-in native Compose diagnostic capture because it is stored only under ignored `bdd/.work/native-compose-diagnostics/` and must not be committed. Private keys, certificates/PEM content, CSRs, passphrases, tokens, credentials, and secret-bearing configuration remain redacted and must never be retained.

## 2026-09-29 — Broker sessions and Guest capacity review

The user clarified that brokers generally should not be limited; Guest limits may be considered later and reviewed. The one-broker-registration-per-certificate constraint in host/Manager CSR enrollment is an `si` identity-binding rule, not a cap on concurrent CLI broker sessions. Preserve that single broker binding and exact authorization without adding an arbitrary broker-session cap. Guest capacity/limit behavior remains unresolved: Phase 8 must assess existing defaults and ask the user before changing them, using the question recorded in that phase. No numeric Guest cap or implementation acceptance is presumed.

## 2026-09-29 — Concurrent `si` identity reuse and Compose proof dependency

The user clarified that `si` must reuse one issued client identity/certificate/key and broker ID across concurrent independent HTTP/2 connections. Brokers generally should not have arbitrary concurrent-session limits; this does not authorize multiple unrelated broker IDs or weaker certificate checks. Guest limits and stream caps are a separate unresolved Phase 8 review/question and remain undecided.

The current Verser2 v0.9.1 Host rejects a second live session with the same peer ID before authentication (`@signicode/verser2-host/dist/index.js:3994-4008`). Therefore the concurrent native Compose output/info proof is blocked until the dependency supports secure duplicate authenticated sessions and a focused overlap proof passes. Do not claim live proof passes or use the 128 broker-ID/one-certificate workaround, which violates the SI single-broker CSR rule. No numeric SI session limit is authorized.

## 2026-09-29 — Verser2 0.9.2 overlap proof and bounded cleanup reconciliation

The direct Verser2 family was updated to `0.9.2`, including the duplicate authenticated-session support tracked by [signicode/verser2#79](https://github.com/signicode/verser2/issues/79). The rebuilt MultiManager and STH artifacts and the native Compose fixture then demonstrated independent overlapping output and info CLI sessions using one issued SI certificate/key and `compose-si.broker`. The proof observed `{ "ready": true, "value": "typed-compose" }` without unrelated broker IDs, a broker-session cap, or weaker certificate authorization.

Evidence-driven fixes were confined to the approved native proof envelope: profile import no longer selects a not-yet-created profile; the generated bundle advertises the issued SI broker ID; v2 selected-instance RPC forwarding no longer strips the provider procedure path; the caller contract declares its empty request and therefore uses the documented POST RPC route; and the fixture observes the expected output value rather than requiring the intentionally open output stream to close.

Formal review first found that cleanup could exceed the 30-second Compose budget. The bounded cleanup remediation was re-reviewed, which found that optional final diagnostics could consume the teardown reserve. Oracle clarified the required shared-deadline ordering: normal work and failure diagnostics stop before the reserve, `compose down --timeout 2` gets the first bounded reserve attempt, and client/resource cleanup use the same original deadline. The remediation passed the exact native proof command: 1 scenario, 18 steps, and 4 hooks; 19.482-second scenario duration; 26.838-second total Cucumber duration; and empty owned-resource cleanup. The planned formal-review budget was exhausted after the focused re-review, so no third formal verdict was requested. The Guest-capacity decision remains open in Phase 8.

## 2026-09-29 — User-directed non-mTLS compatibility follow-up

The normal native-bootstrap BDD fixture exposed a missing explicit `--broker-id` requirement in its older bundle export. The user directed the current work to continue fixing the mTLS private-registration proof and to retain non-mTLS support as a distinct Phase 8 fixes/coverage task. The non-mTLS fixture is neither removed nor treated as covered by the mTLS proof; revisit it after the mTLS proof passes.

## 2026-09-29 — User-approved exact federation-Host route correction

The normal mTLS BDD proof admitted the issued STH certificate and created its opaque federation capability, but the deny-first route policy blocked the STH runner Host's route to its own Manager before the private v2 POST. The user explicitly approved permitting only the issued claim's federation-Host domain → that claim's Manager ingress. The permission must be derived after issued-record validation, remain scoped to its Manager and binding, and leave the private v2 capability/claim checks and unrelated-route denial intact. The separate non-mTLS compatibility task remains deferred until this mTLS proof passes.

## 2026-09-30 — User-confirmed certificate-free name-only mode

After the mTLS private-v2 registration solution passed normal BDD and was committed as `9ccb9bfe2`, the user clarified that non-mTLS STH registration also uses private v2, without client-certificate authentication. Its self-asserted identity name is checked against its Manager/space namespace; an already-active name in that space must be rejected. The actual mTLS route `sth.<hub>.scramjet.internal` has no space, so the user chose a separate `sth.<hub>.<space>.scramjet.internal` grammar and matching federation Host identity for certificate-free STHs, leaving issued-mTLS names/claims intact. The user expressly accepts name claims from any peer that can reach the non-mTLS listener; this is not spoof-resistant identity. The approved implementation may not silently downgrade mTLS configurations, expose public REST registration, or retry v1 from a native STH. Non-mTLS proof remains pending.

The user later clarified the compatibility exception after an advisory found that v1 registration could bypass the active-name collision rule: a Manager with mTLS admission must refuse `/api/v1/sth`, while a non-mTLS Manager must keep v1 and apply the same self-asserted qualified-name/collision/route-readiness method as private v2. The v1 shim does not acquire a federation capability; its name remains unauthenticated. Native STH does not fall back to v1.
