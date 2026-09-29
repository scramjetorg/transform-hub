# Phase 1 — Native bootstrap and configuration

## Goal

Make native onboarding the default STH/MM/`si` configuration path while retaining explicit compatibility settings.

## Owned paths

- `packages/config/src/{verser2-profile.ts,verser2-config.ts,**/*bundle*}`, `packages/cli/src/{lib/commands/{api.ts,config.ts},lib/config/**,bin/**}`, `packages/sth/src/bin/hub.ts`
- `packages/host/src/lib/{host.ts,runner-verser2-host-peers.ts}`, `packages/multi-manager/src/{config/**,lib/{multi-manager.ts,verser2-trust-export.ts}}`
- Matching focused package tests plus `bdd/features/e2e/E2E-018-cli-ingress.feature`, `bdd/features/e2e/E2E-019-*.feature`, and their step definitions
- `examples/native-onboarding-poc/run.ts` and its maintainer-only `README.md` when native profile, bundle, routing, diagnostic, or CLI contracts change
- `packages/manager/src/**` and relevant `bdd/features/**` connection fixtures for the managed STH connection contract

## Tasks

- [ ] Define the versioned connection-bundle schema and trusted local/import handling; provide an admin-produced copy-paste representation with equivalent semantics.
- [ ] Make default startup/help/configuration use native Manager/Space terminology and native upstream settings; map explicit legacy CPM settings as compatibility aliases without changing their behaviour.
- [ ] Add effective-configuration output that distinguishes configured, derived, compatibility, and redacted secret values.
- [ ] Add bounded diagnostics for endpoint reachability, CA handling, route uniqueness/readiness, ingress identity, selected target, and port roles.
- [ ] Make default quickstart/profile activation native; retain explicit HTTP/v1 profile selection for compatibility.
- [ ] Add `--verser2-api-port`; default startup has no v1 or direct listener, while local mTLS/v2 is loopback-only. Keep explicit `--port` as the legacy v1 opt-in.
- [ ] Define semantic `manager.connectionBundle` configuration for managed STH and reject ambiguous transport-field mixtures.
- [ ] Keep the supported four-command UX explicit in help and tests; separate remote STH and `si` client identities in mTLS examples and configuration.
- [ ] Add a real native full-path BDD scenario: `si → MultiManager :2443 → embedded Manager → STH`, with request evidence that excludes HTTP fallback.
- [ ] Maintain the example when native profile, bundle, routing, diagnostic, or CLI contracts change; keep Phase 1 focused on contract compatibility while Phase 3 owns its canonical publication.
- [ ] Define `csr/v2` with closed `sth` and `si` principal types and canonical transport names (`realm`, `space`, `hub`, `federationHost`, `broker`, `guestRoute`) plus role/peer/route claims. Issue a unique certificate/key per `(realm, space, hub)`, with one STH certificate authorizing only that binding's federation host, broker, and guest route; reject collisions and do not support normal multi-Hub certificates. An `si` certificate/private key is a separate client identity and authorizes only its one broker binding.
- [ ] Implement local key/CSR generation and offline Manager CLI `v2 sign`: validate the CSR and exact registration claims, sign with the configured authority, persist the public issued record, and let the caller install the certificate. Keep private keys local and keep the signing authority out of MM.
- [ ] Make MM `2443` read the public issued registry and validate the actual presented raw fingerprint, serial, SAN, and authenticated federation callback registration against the persisted record and exact `(realm, space, hub, federationHost, broker, guestRoute)` binding; bind Manager registration to the authenticated federation principal, and fail closed on unknown, colliding, mismatched, expired, rotated, or revoked records.
- [ ] Preserve explicit legacy/v1 compatibility policy and reject secret-bearing bundles, logs, copy-paste forms, public responses, or ambiguous credential references.
- [ ] Define the v2 public-issued record namespace: certificate ID with indexes for raw fingerprint, serial, SAN, principal, `(realm, space, hub)`, federation host, broker, exact guest route, validity, rotation lineage, and revocation/issuance state; make it append-only/auditable, reject binding/index collisions, and exclude private keys and signing authority material. Rotation creates a new binding-scoped credential and revokes or expires the superseded credential; revocation must remove callback and Manager-registration authorization.
- [ ] Do not implement v2 redemption, a redemption endpoint/listener, grants, an enrollment listener, or an operator approval file; `Manager v2 sign` offline validation/signing/persistence is the complete v2 issuance operation. Do not add CA/signing key material to MM.
- [ ] For managed STH enrollment, source `realmId` from MultiManager configuration and `spaceId` from the child Manager ID. Bind the authenticated federation Host and the one STH control route used for Manager registration; keep dynamic `runner.<instanceId>` routes local to the STH. Use the existing MultiManager `routeAuthorizer` only to deny federated forwarding/resolution outside each Manager self-pair and its successfully registered STH control routes. Do not add a Verser route-advertisement authorization dependency or unrelated route-policy hardening in this phase.

## Acceptance criteria

- A trusted bundle or equivalent generated command creates a working native `si` profile without manually entering legacy or transport-discovery fields.
- Fresh native STH upstream registration succeeds without CPM configuration; an explicit legacy CPM configuration remains compatible.
- Diagnostics are actionable and redact secret material; invalid CA, route, identity, and endpoint states remain distinct.
- A fresh `si` without a bundle fails with native setup guidance rather than silently calling its HTTP default. A successful import selects the native profile deterministically; an incomplete native profile is a profile error with no HTTP fallback; an explicitly selected compatibility profile retains HTTP/v1 behaviour.
- The versioned bundle contains public trust/identity data and credential references only—never private keys, PFX content, or passphrases. Import validates the complete artifact before changing an active profile; generated/imported forms yield the same redacted effective profile and target, and overwrite/selection behaviour is deterministic.
- MVP scope excludes discretionary protocol/security redesign.
- Offline exact-set certificate issuance is the bounded security extension in this phase; v2 redemption, grants, enrollment listeners, operator approval files, and CA/signing keys at MM are excluded. Fleet rotation, CRL automation, HSM, HA, RBAC, and remote approval are also excluded; binding-scoped rotation and revocation semantics remain required. v2 authorization is not CA-only: it requires the actual certificate fields, authenticated federation callback, and Manager registration principal to match the persisted exact set.
- v1 issuance and policy are unchanged and remain compatibility-only when selected. The public trust artifact contains only public trust/identity data and credential references; no private key, CSR private material, passphrase, redemption secret, or private-store content may appear in artifacts, logs, copy-paste output, public responses, or diagnostics.
- Certificate enrollment is binding-scoped: unique certificate/key per `(realm, space, hub)`; one STH certificate covers only that binding's federation host, broker, and guest route, and authorization is verified against the actual authenticated federation callback; normal multi-Hub certificates are excluded. Registration must bind to the authenticated federation principal, not merely a claimed route or broker. `si` has a separate broker identity and certificate/key. Binding and certificate indexes reject collisions; rotation is binding-scoped with explicit supersession, and revocation immediately prevents callback and Manager registration authorization. Fleet certificates are deferred to plan-completion follow-up outcomes because shared keys complicate collision handling, revocation, and rotation, and are revisited only on an explicit future fleet requirement.
- The exact STH route criterion applies to the authenticated Manager registration and normal STH control path. Dynamic per-instance `runner.<instanceId>` routes stay local; rejecting every additional route advertisement by a modified STH is outside this plan and requires a future Verser capability.
- In secure federation mode, MultiManager denies new federated forwarding to unregistered STH and all `runner.*` routes through the existing zero-TTL hop-local route-authorizer allowlist. This does not restrict valid sequence API/RPC paths through the registered STH control route.
- The native full-path BDD scenario targets 1–2 seconds and completes within a hard maximum of 5 seconds per operation/readiness check; its total scenario budget is bounded separately. Failures raise direct, bounded exceptions with actionable diagnostics and use resource diagnostics rather than arbitrary sleeps.

## Verification

- Exact focused matrix: (1) v1 regression tests prove unchanged issuance/configuration/endpoints and no v1-to-v2 authorization; (2) CSR/schema tests cover `csr/v2`, closed `sth`/`si` types, canonical transport names and role/peer/route claims, unique `(realm, space, hub)` STH binding, collision rejection, exact federation callback claims, single-`si` broker binding, and public-issued record serialization; (3) offline `Manager v2 sign` tests cover local key/CSR input, validation failures, signing, persistence, caller installation metadata, rotation lineage, revocation, and no CA/signing key at MM; (4) registry/auth tests cover actual raw fingerprint, serial, SAN, authenticated callback authorization, Manager registration binding, exact-set equality, expiry/rotation/revocation, unknown/collision/mismatch rejection, and fail-closed behavior; (5) namespace/security tests cover public-record indexing/auditability and absence of private keys/signing authority from registry, MM, bundles, logs, and responses; (6) CLI/config tests cover `--verser2-api-port`, default no v1/direct listener, loopback mTLS/v2, explicit legacy `--port`, semantic `manager.connectionBundle`, four-command UX, and separate identities; (7) Compose/BDD tests cover only `2443`, STH sign/install/register with actual callback authorization, `si` sign/install/connect using its separate broker identity, typed RPC, no redemption/grant/listener/operator-file paths, no HTTP fallback, and complete state cleanup. Run named focused workspace tests for `config`, `cli`, `sth`, `host`, `manager`, and `multi-manager`, `npm run build:packages`, `npm run test:bdd-ci-verser2`, and the native full-path BDD scenario. Each operation/readiness check targets 1–2 seconds with a hard 5-second maximum; Compose-style e2e evidence is capped at 30 seconds total.

## Non-goals

- HTTP/CPM removal, CA auto-download, Kubernetes provisioning, HA, and unrelated CLI redesign.
- v2 redemption/grant/listener/operator approval workflows, or placing the CA/signing key at MultiManager.
- Publishing the diagnostic example as onboarding documentation, a template, a sidebar entry, or a root npm script.
