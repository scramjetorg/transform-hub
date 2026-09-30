# Native-first developer experience

## Status

Executing. Phase 8 is active; its final evidence and reconciliation are still pending. This status is not a claim that validation has passed or that the plan is complete.

## Objective

Make the current Verser2-native workflow the default and clearest way to use STH, MultiManager, and `si`. A new user should use a trusted connection bundle or its generated copy-paste equivalent, connect through MultiManager TLS port `2443`, and create/deploy/run Node, Python, or Bun sequences without legacy CPM/HTTP settings.

## Scope

- Change the default CLI/config onboarding behaviour to native-first while preserving legacy HTTP/CPM paths as named compatibility behaviour.
- Define a trusted, out-of-band connection bundle with a human-readable/copy-paste representation; `si` must import either representation without downloading a CA from an untrusted endpoint.
- Add native configuration output and diagnostics for endpoint, trust, route, identity, target selection, and public/private port roles.
- Add repository-owned Node, Python, and Bun sequence scaffolds and validation that feed the existing sequence pack/deploy/run path.
- Rewrite source documentation for local processes, Docker Compose, and Kubernetes; all must use the same native onboarding contract and explicitly distinguish published, private-network, loopback, and compatibility ports.
- Ship mandatory native installation, local CA-only TLS, production TLS plus optional mTLS, trusted bundle/profile, compatibility/migration, and deployment-recipe guide outcomes with full examples.
- Direct developers through task- and role-oriented journeys from every major entrypoint, with a native first-sequence path, explicit next steps, and labelled compatibility detours.
- Correct stale help, Docker metadata, examples, and generated-documentation drift that obscure the current transport.

## Non-goals

- Remove or deprecate HTTP/v1, CPM, direct-Hub ingress, or existing automation in this plan.
- Redesign Verser2/TLS security, automatically trust or download remote CAs, or weaken identity/route verification.
- Change the approved offline CSR-signing and exact-binding authorization contract described below.
- Add a new package manager, a second sequence deployment protocol, HA/failover design, Kubernetes RBAC automation, or a full production-platform reference architecture.
- Publish STH HTTP, runner, or MultiManager HTTP ports as part of the recommended topology.

## Confirmed decisions

- Delivery mode: current branch.
- Rollout: native-first behaviour changes now, with explicit compatibility configuration retained.
- Bundle distribution: deployments support both a trusted admin-distributed bundle file and a deterministic copy-paste configuration form generated from that trusted bundle. Neither flow obtains a CA from the remote endpoint.
- Documentation coverage: local processes, Docker Compose, and Kubernetes all receive a current-topology guide. Compose is the complete deployed end-to-end proof topology; local and Kubernetes are validated to their documented boundaries.
- Documentation delivery: the six guide outcomes are mandatory. README sections remain concise and link to canonical guides instead of repeating them.
- Installation delivery: publish a next-release guide for a sequence-project repository that installs tools through `package.json` and uses `npx`; container installation is not a canonical path.
- mTLS examples: STH and `si` use separate client identities.
- Guidance delivery: all seven audiences reach a named destination within two documented handoffs. The guided developer journeys phase follows detailed documentation and Phase 0 tests one author and one non-author journey.
- Phase 0 is required.
- The Phase 0 PoC retains `examples/native-onboarding-poc/` as a maintainer-only, maintained-but-transient diagnostic. It is not supported onboarding, a template, user-facing guidance, a sidebar/root-script surface, or a published/linkable example. Phase 1 maintains it when native profile/bundle/routing/diagnostic/CLI contracts change; Phases 2 and 3 explicitly exclude it.
- Cleanup/DX, Hardening, and Fixes/coverage are all required.
- Compatibility stance: HTTP/v1 and CPM remain supported but are excluded from the recommended path and labelled compatibility everywhere changed by this plan.
- STH registration: native STH registration uses a private Manager v2 operation and never depends on a v1 route. In issued-mTLS mode it requires authenticated, claim-bound federation evidence; in the explicitly non-mTLS mode it uses the self-asserted, space-qualified name and active-name collision rule recorded below. The v1 HTTP compatibility shim applies the corresponding Manager-mode checks and is not part of the public native client API.
- 2026-09-29 fixes-phase decision: continue the mTLS private-registration BDD correction first. The non-mTLS native-bootstrap fixture must continue to work after explicit bundle broker/principal selection; it is deferred as a Phase 8 compatibility regression task and must not be replaced by mTLS-only evidence.
- 2026-09-29 route correction: the user approved allowing only the issued STH claim's exact federation Host domain to reach its own Manager ingress as a hop-local pair. Keep the private v2 capability and exact claim checks, cross-space and unknown-route denial, and the separate non-mTLS compatibility follow-up.
- 2026-09-30 non-mTLS admission decision: preserve the committed issued-mTLS private v2 path and add a distinct certificate-free, name-only private v2 mode only when client mTLS and CSR enrollment are disabled. Name-only STHs use `sth.<hub>.<space>.scramjet.internal` with a matching space-qualified federation Host identity; existing issued-mTLS names/claims remain unchanged. Any peer able to reach the non-mTLS listener may claim an available name; reject an already-active Hub name in that space. This is intentionally unauthenticated, not equivalent to mTLS identity, and does not authorize a public REST registration route or a v2-to-v1 fallback.
- 2026-09-30 v1 compatibility clarification: refuse `/api/v1/sth` on an issued-mTLS Manager. On a non-mTLS Manager, keep v1 as an explicit compatibility route calling the same Manager name-validation, active-collision, route-readiness, and registration methods used by private v2; v1 has no federation-session capability and its name is self-asserted. Native STH still sends only private v2 and never retries v1.

## Native onboarding contract

1. MultiManager `2443` is the sole client-facing control endpoint.
2. The deployment owner distributes a trusted bundle containing the endpoint, CA location/content reference, ingress identity, route domain, and optional default Space/Hub target.
3. `si` consumes the bundle or its generated equivalent and verifies TLS, route uniqueness, and ingress identity before it sends requests.
4. STH connects upstream using native Manager/Space concepts; legacy CPM URL/ID fields continue as compatibility aliases.
5. New examples never require public STH `8000`, legacy instance `8001`, MultiManager `11000`, direct ingress `2444`/`2446`, or STH runner `2445`.

## Observable acceptance criteria

- A clean developer can complete the documented local process journey from a trusted bundle through native `si` profile activation, Space/Hub selection, Node sequence deployment, instance start, and one observed result without entering an HTTP URL, CPM ID/URL, broker ID, route domain, or CA path manually.
- The same onboarding contract is documented for local processes, Compose, and Kubernetes, and their port matrix accurately marks only MultiManager `2443` as client-facing for the recommended path.
- A sequence-project repository can use next-release dependencies in `package.json` and `npx` to complete the first native deployment without global or container installation.
- The six required guide outcomes provide complete CA-only TLS and optional mTLS examples, distinguish server TLS, client mTLS, and fingerprint authorization, and state PKI boundaries without exposing private material.
- From root README, docs overview, CLI, STH, or MultiManager documentation, each of the seven confirmed audiences reaches one named primary destination within two explicit handoffs; the first-sequence route requires no HTTP/v1, CPM, or adapter-internals learning.
- Native `si` has no HTTP fallback; it emits actionable, secret-safe and distinguishable failures for invalid CA, missing/duplicate route, wrong ingress identity, and unreachable endpoint.
- Fresh STH configuration uses native Manager/Space terminology and connects upstream without requiring legacy CPM fields; existing explicit CPM configuration retains its prior behaviour.
- Native STH registration uses a private v2 control operation; the public `si` API never exposes or invokes registration, while ordinary legacy STH HTTP registration remains compatible through a v1 shim.
- Repository-owned Node, Python, and Bun scaffolds each package successfully and complete their claimed deploy/run path through the existing protocol.
- HTTP/v1 and CPM docs/help are clearly marked compatibility, retain working examples, and do not appear in the recommended quickstart.
- Generated documentation matches its `docs-source` inputs; focused unit/package/BDD validation and the final build/lint evidence pass.

## Mandatory test-speed constraint

- Every single test, including the Phase 1 native full-path BDD scenario and final validation evidence, must target 1–2 seconds and complete within a hard maximum of 5 seconds.
- A failure must raise a direct, bounded exception with actionable diagnostics; it must not wait through existing 20/30-second timeouts. Existing 20/30-second waits are unacceptable and must be replaced with immediate or short bounded failure diagnostics.
- This is a mandatory acceptance and verification constraint, not an optimization target. Any evidence that violates it does not satisfy the plan.

## Dependencies and assumptions

- Verser2 TLS identity, route validation, and secret-redaction contracts remain mandatory.
- The bundle producer is a deployment administrator with access to the trusted CA and platform identity; distributing its sensitive values is an operational responsibility, not a network bootstrap feature.
- The plan relies on the existing `si sequence deploy` protocol rather than replacing it.
- Kubernetes is validated only by static configuration/network documentation until the user approves a test environment; it is not licensed to add cluster provisioning or live-cluster claims.

## Deferred decision

- **Kubernetes live-cluster evidence** — State: deferred; Kind: constraint. The plan documents Kubernetes configuration and network boundaries but does not claim a live-cluster proof. The user will set up a test environment or approve a transient GitHub Actions cluster first. Revisit before Phase 3 verification or any release claim that Kubernetes was end-to-end tested. Decision history: 2026-09-22, user explicitly deferred live Kubernetes testing.

## Phase 0 rescoping outcome — 2026-09-27

- The disposable native journey met the root/Space identity, trusted local artifact/copy-paste, `2443`-only client-facing topology, no-`si`-traffic-to-`8000`/`11000`, Node deploy/stdin, and `Hello Alice?` criteria. The author route and labels were clear to the user.
- Invalid-CA and missing-route profiles both produced secret-safe generic `CONNECTION` exit 58. Distinct `TRUST` 51 and `ROUTE` 55 diagnostics are not validated and remain a Phase 1 correction.
- Phase 1 retains that planned diagnostic correction while preserving the proven native topology unchanged. No live Kubernetes validation was performed; the existing limitation remains unchanged.
- Evidence command: `npx tsx examples/native-onboarding-poc/run.ts run` — exit 0, `completed-with-findings`; retained-example validation is manual/non-CI only. It requires built `dist/`, Linux `openssl`/`strace`, and fixed free ports. Generated material stays in `/tmp`, must not be deployed, and the example proves current topology only; it manually enters current transport fields/PoC credentials and is not trusted-bundle UX or production mTLS identity separation.

## Verification budget

| Claim | Evidence owner | Minimum evidence |
|---|---|---|
| Native bootstrap/control path | MVP 1 | focused config/CLI/host/MM tests, `npm run build:packages`, a real `si → MM → STH` BDD scenario, explicit no-HTTP request evidence |
| Three sequence workflows | MVP 2 | scaffold/packing tests and one supported deploy/run proof per runtime |
| Documentation/topology accuracy | MVP 3 | docs source generation/check, help snapshots/assertions, documented Compose proof |
| Developer guidance | Guided journeys | route-map assertions, generated sidebar/README checks, author and non-author walkthroughs |
| Compatibility preservation | Cleanup/coverage | focused legacy CLI/config tests and migration assertions |
| Final state | Fixes/coverage | `npm run lint`, `npm run build:packages`, `npm run test:packages`, scoped BDD commands |

Memory-guard coverage is not planned unless the implementation changes runner, BDD harness, or retained-stream behaviour; any later exception must be recorded with its reason.

## Offline CSR signing and exact-binding security contract

- v1 issuance, configuration, endpoints, and compatibility policy remain unchanged; v1 trust or issuance never authorizes v2.
- The caller generates and retains its private key locally and submits a CSR. The Manager CLI `v2 sign` command runs offline, validates the CSR and requested claims, signs with the configured signing authority, persists the public issued record, and returns the certificate/public metadata. The signing authority is not placed in MultiManager. There is no v2 redemption endpoint, grant, private redemption listener, or operator approval file.
- STH certificates are scoped to one exact `(realm, space, hub, federationHost, broker, guestRoute)` binding. `si` has a separate client identity for its authorized broker binding. MultiManager checks the presented raw certificate fingerprint, serial, SAN, authenticated federation callback registration, and exact persisted binding; unknown or mismatched records fail closed. Private keys and signing authority material never enter the registry, MultiManager, bundles, logs, or public responses.
- One issued `si` identity, certificate/key, and broker ID is reused across concurrent independent sessions. This does not authorize unrelated broker IDs, weaken certificate checks, or impose an arbitrary numeric concurrent-session limit.
- Guest capacity/limits remain unresolved and require user direction; Phase 8 must not silently select or implement a limit.
- The recorded 0.9.2 Compose evidence is pre-rebase evidence only. It is not post-rebase validation and must be renewed against the rebased tree before being claimed as final evidence.

## Phase 8 ownership — Fixes and coverage

Phase 8 owns final fixes/coverage and final evidence/reconciliation for this plan, including renewal of the pre-rebase Compose evidence. It does not own a decision on unresolved Guest capacity. Live Kubernetes proof remains governed by the deferred decision above: do not mark it complete or silently defer it as an outcome; retain its unresolved user-environment gate.

## Delivery Mode

- Mode: current branch
- User decision: confirmed before planning

## Phase Commit Policy

- Default: one focused commit after each completed phase's validation, review/remediation, and reconciliation
- Scope: only the phase's owned and changed paths; unrelated pre-existing or concurrent changes stay uncommitted
- Override: an explicit user instruction or applicable repository policy may postpone or disable the default

## Git Execution Policy

- Routine mode: confirm each routine transition
- Planning-handoff answer source: user direction on 2026-09-29 to pause after the rebase; treated as confirm each routine transition.
- Repo-policy source: missing (built-in default: unattended routine execution)
- Precedence: current-session explicit direction and runtime safety/tool permissions > recorded answer > repo instructions > built-in default

## Research record

- `draft.md` contains the non-executable research synthesis and source references.
- Oracle advisory shaped the onboarding contract and phase envelope on 2026-09-22. Materialized-plan review findings were resolved by defining native profile selection/no-fallback semantics, baseline bundle safety, Phase 0 stop/rescope criteria, Compose/Kubernetes evidence boundaries, per-runtime proof commands, and narrower phase ownership.

## Phase index

1. [Phase 0 — native onboarding PoC](phase-0-native-onboarding-poc.md)
2. [Phase 1 — native bootstrap and configuration](phase-1-native-bootstrap.md)
3. [Phase 2 — sequence authoring](phase-2-sequence-authoring.md)
4. [Phase 3 — documentation and examples](phase-3-documentation.md)
5. [Phase 4 — guided developer journeys](phase-4-guided-developer-journeys.md)
6. [Phase 5 — Cleanup/DX](phase-5-cleanup-dx.md)
7. [Phase 6 — Hardening](phase-6-hardening.md)
8. [Phase 8 — Fixes and coverage](phase-8-fixes-coverage.md)
