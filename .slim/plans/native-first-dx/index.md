# Native-first developer experience

## Status

Final plan. This is not authorization to begin implementation until explicitly requested.

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
- Redesign Verser2/TLS security, automatically trust or download remote CAs, or weaken identity/route verification. A bounded principal-bound generic enrollment extension is allowed: it must use versioned CSR claims and strict authorization, while rotation, CRL, HSM, HA, RBAC, and remote approval remain out of scope.
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
- The Phase 0 PoC evidence and history remain preserved. Phase 1 maintains `examples/native-onboarding-poc/` for native profile/bundle/routing/diagnostic/CLI contract changes; Phase 3 promotes and cleans it into the canonical published user example. Phase 2 does not own the example's implementation.
- Cleanup/DX, Hardening, and Fixes/coverage are all required.
- Compatibility stance: HTTP/v1 and CPM remain supported but are excluded from the recommended path and labelled compatibility everywhere changed by this plan.

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
- Repository-owned Node, Python, and Bun scaffolds each package successfully and complete their claimed deploy/run path through the existing protocol.
- HTTP/v1 and CPM docs/help are clearly marked compatibility, retain working examples, and do not appear in the recommended quickstart.
- Generated documentation matches its `docs-source` inputs; focused unit/package/BDD validation and the final build/lint evidence pass.

## Mandatory test-speed constraint

- Every operation/readiness test must target 1–2 seconds and complete within a hard maximum of 5 seconds. Compose end-to-end evidence has a 30-second total budget; live Kubernetes end-to-end evidence has a 120-second total budget.
- Failures must raise direct, bounded exceptions with actionable diagnostics. Use direct resource diagnostics rather than arbitrary sleeps; no existing 20/30-second operation waits may remain.
- This is a mandatory acceptance and verification constraint, not an optimization target. Any evidence that violates it does not satisfy the plan.

## Dependencies and assumptions

- Verser2 TLS identity, route validation, and secret-redaction contracts remain mandatory.
- The bundle producer is a deployment administrator with access to the trusted CA and platform identity; distributing its sensitive values is an operational responsibility, not a network bootstrap feature.
- The plan relies on the existing `si sequence deploy` protocol rather than replacing it.
- Kubernetes live validation is an approved future phase using a user-provided cluster context; no provisioning, HA, or RBAC automation is licensed. Documentation remains bounded by the existing static contract until that phase completes.

## Kubernetes decision

- **Kubernetes live-cluster evidence** — State: approved future phase; Kind: user-provided-environment gate. Phase 4 may use only a user-provided cluster/context and must not provision infrastructure or automate HA/RBAC. It owns live native Kubernetes proof with a 120-second total e2e budget and 5-second operation/readiness caps. Decision history: 2026-09-22 user deferred live testing; 2026-09-27 user approved a new live-Kubernetes phase before Guided DX with those boundaries.

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

## Delivery Mode

- Mode: current branch
- User decision: confirmed before planning

## Phase Commit Policy

- Default: one focused commit after each completed phase's validation, review/remediation, and reconciliation
- Scope: only the phase's owned and changed paths; unrelated pre-existing or concurrent changes stay uncommitted
- Override: an explicit user instruction or applicable repository policy may postpone or disable the default

## Git Execution Policy

- Routine mode: unattended routine execution
- Planning-handoff answer source: user selected “Unattended routine execution (Recommended)” during approved native-first-dx plan handoff on 2026-09-26
- Repo-policy source: missing (built-in default: unattended routine execution)
- Precedence: current-session explicit direction and runtime safety/tool permissions > recorded answer > repo instructions > built-in default

## Git Execution Policy

- Routine mode: confirm each routine transition
- Planning-handoff answer source: user direction on 2026-09-29 to pause after the rebase; treated as confirm each routine transition.
- Repo-policy source: missing (built-in default: unattended routine execution)
- Precedence: current-session explicit direction and runtime safety/tool permissions > recorded answer > repo instructions > built-in default

## Research record

- `draft.md` contains the non-executable research synthesis and source references.
- Oracle advisory shaped the onboarding contract and phase envelope on 2026-09-22. Materialized-plan review findings were resolved by defining native profile selection/no-fallback semantics, baseline bundle safety, Phase 0 stop/rescope criteria, Compose/Kubernetes evidence boundaries, per-runtime proof commands, and narrower phase ownership.
- User/Oracle decision history: Oracle advisory and the 2026-09-22 review established the native contract and initial phase envelope; the user confirmed Phase 0 feedback/rescoping on 2026-09-27 and then confirmed the Phase 1 CLI/config, Phase 3 canonical-example/docs, new live-Kubernetes Phase 4, renumbering, and test-budget amendments recorded in `review.md`.

## Phase index

1. [Phase 0 — native onboarding PoC](phase-0-native-onboarding-poc.md)
2. [Phase 1 — native bootstrap and configuration](phase-1-native-bootstrap.md)
3. [Phase 2 — sequence authoring](phase-2-sequence-authoring.md)
4. [Phase 3 — documentation and examples](phase-3-documentation.md)
5. [Phase 4 — live Kubernetes proof](phase-4-live-kubernetes.md)
6. [Phase 5 — guided developer journeys](phase-5-guided-developer-journeys.md)
7. [Phase 6 — Cleanup/DX](phase-6-cleanup-dx.md)
8. [Phase 7 — Hardening](phase-7-hardening.md)
9. [Phase 8 — Fixes and coverage](phase-8-fixes-coverage.md)

## Superseded amendment — principal-bound generic enrollment

- User approval: on 2026-09-27 the user approved materializing a bounded generic enrollment extension in the existing native-first plan artifacts only. This is a planning amendment, not authorization to implement product or documentation changes in this handoff.
- Oracle recommendation: the Oracle review recommended principal-bound, versioned generic enrollment rather than CA-only admission, with MultiManager-owned private redemption and separate `sth`/`si` command facades. The recommendation is recorded here without changing the prior phase history.
- Phase 1 owns the versioned generic CSR v2 contract, initial `sth` and `si` principal types, strict MultiManager enrollment authorization over role/peer/route claims (never CA trust alone), private MM-owned redemption lifecycle, enrolled bundle credential references, and a unique broker ID. `si identity enroll generate|redeem` is a distinct facade; it is not an alias for profile activation or ordinary connection setup.
- The extension preserves explicit legacy/v1 compatibility behavior and labels it as compatibility. It never places private keys, CSR private material, passphrases, redemption tokens, or other secret contents in bundles, logs, copy-paste output, or public API responses.
- Phase 3 owns the canonical single-Compose proof: CA/MM server only initially, published `127.0.0.1:2443`, STH CSR generate → local approve → private redeem → start/register, and independently enrolled `si` CSR → approve → redeem → bundle import → typed RPC. The proof must explicitly clean up files, temporary resources, and processes.
- The amendment inherited the mandatory operation/readiness maximum of 5 seconds (target 1–2 seconds) and the 30-second total Compose evidence budget. It is retained as history only and is superseded below; its redemption, grant, listener, and operator-approval model is not current. No rotation, CRL, HSM, HA, RBAC, or remote approval is implied.

### Concrete CSR v2 contract

- v1 is unchanged. Existing v1 issuance, configuration, endpoints, and compatibility policy remain supported and are labelled compatibility; a v1 CA/trust decision never authorizes a v2 enrollment.
- Runtime v2 records are distinct and auditable: `EnrollmentRequest` (version, request ID, principal type, public CSR, and claims), `EnrollmentApproval` (request ID, approver, decision, policy basis, and expiry), `IssuedCertificate` (certificate ID, request ID, public certificate, issuer, and validity), `EnrollmentGrant` (grant ID, request/certificate IDs, principal claims, broker ID, credential references, and redemption expiry), and `IssuedPrincipal` (principal ID, type, claims, certificate ID, broker ID, and issuance status). Private keys and redemption secrets are references held by the owning runtime or private MM store, never record payloads.
- Every v2 request carries `version: csr/v2` and the closed initial principal types `sth` and `si`. Both require `role`, `peer`, and `route` claims. `sth` claims identify the STH peer/host and its Manager/Space route; `si` claims identify the client peer and its selected Space/Hub route. Claims are canonicalized before authorization, are bound to the issued certificate and grant, and cannot be broadened during redemption.
- MultiManager authorization precedence is: explicit deny, exact role+peer+route policy, explicitly configured local-development exemption, then legacy compatibility policy. CA trust establishes transport trust only and is never an enrollment authorization. The local exemption is explicit, bounded to the private/local MM enrollment surface, and cannot bypass claim validation, certificate binding, route checks, or the no-public-redemption rule. Legacy policy applies only to unchanged v1/legacy requests and cannot silently fall back from v2.
- MM configuration names the v2 issuer, allowed principal types/policies, local-exemption switch, private redemption bind/endpoint, grant TTL, and private store. The lifecycle is request → approve/deny → issue certificate and grant → private redeem once → mark grant redeemed and persist the issued principal. Redemption is MM-owned, private-network/loopback-only, bounded by grant expiry and certificate/request binding, and is not the published client endpoint.
- The public trust artifact contains only the CA chain or trust reference, published endpoint, ingress identity, route/target metadata, broker ID, and enrolled credential references/public certificate metadata. It contains no private key, CSR private material, passphrase, redemption token/secret, or private-store content. Logs, copy-paste output, public API responses, and failure diagnostics obey the same boundary.

### Current enrollment binding policy

- Enrollment is unique per `(realm, space, hub)`: each binding receives its own certificate and private key.
- One STH certificate authorizes only that binding's federation host, broker, and guest route. Normal multi-Hub certificates are not supported.
- Fleet certificates are deferred to plan-completion follow-up outcomes because shared keys increase revocation and rotation complexity. Revisit only if an explicit future fleet requirement is approved.

## Current approved amendment — Oracle offline CSR signing

- User decision: on 2026-09-27 the user approved replacing the redemption/grant/listener/operator-approval model above with Oracle's offline CSR signing model. This supersedes only that model; v1 remains unchanged. This is a planning decision, not authorization to implement product or documentation changes in this handoff, and no outcomes artifact is created.
- STH has one issued certificate whose authorization is the exact broker plus guest registration set it is allowed to register. `si` has one issued certificate for one broker. Neither certificate is a general enrollment grant.
- The caller locally generates its private key and CSR. The Manager CLI `v2 sign` command runs offline, validates the CSR and its requested registration claims, signs it with the configured signing authority, persists the public issued record, and returns the signed certificate/public metadata. The caller installs the certificate and retains the private key locally; the signing authority is not placed in MultiManager.
- MultiManager's public `2443` endpoint reads the public issued registry and authorizes connections only after checking the actual presented raw certificate fingerprint, serial, SAN, and Verser registration against the persisted record and its exact broker/guest set. MM has no CA/signing key and performs no v2 signing.
- v2 has no redemption endpoint, private redemption listener, grant, or operator approval file. v2 approval is the offline Manager CLI validation/signing/persistence operation. There is no v2 enrollment listener or secret-bearing redemption artifact.
- The v2 record namespace is public-issued and append-only/auditable, keyed by certificate ID and indexed by raw fingerprint, serial, SAN, principal, broker, and exact authorized guest registrations. Security requires canonical CSR claims, exact-set authorization, certificate binding, raw presented-certificate matching, serial/SAN checks, Verser registration checks, expiry/revocation state, and fail-closed unknown/mismatched records. Private keys and signing authority material never enter the registry, MM, bundles, logs, or public responses.
- The canonical Compose topology publishes only `127.0.0.1:2443`. BDD must remove all issued records, generated keys/CSRs/certificates, registry state, temporary resources, containers, and processes on success and failure.

### Current v2 contract and test matrix

- v1 issuance, configuration, endpoints, and compatibility policy remain unchanged; v1 trust or issuance never authorizes v2.
- Exact matrix: (1) v1 regression proves unchanged issuance/configuration/endpoints and no v1-to-v2 authorization; (2) CSR/schema tests cover `csr/v2`, closed `sth`/`si` principals, canonical role/peer/route claims, exact STH broker+guest set, single-`si` broker binding, and public-issued record serialization; (3) offline `Manager v2 sign` tests cover local key/CSR input, validation failures, signing, persistence, no CA key/MM access, and caller installation metadata; (4) registry/auth tests cover raw fingerprint, serial, SAN, Verser registration, exact-set equality, expiry/revocation, unknown/mismatch rejection, and fail-closed behavior; (5) namespace/security tests cover public-record indexing/auditability and absence of private keys/signing authority from registry, MM, bundles, logs, and responses; (6) CLI/config tests cover `--verser2-api-port`, no default v1/direct listener, loopback mTLS/v2, explicit legacy `--port`, semantic `manager.connectionBundle`, four-command UX, and separate STH/`si` identities; (7) Compose/BDD tests cover only `2443`, STH sign/install/register, `si` sign/install/connect, typed RPC, no redemption/grant/listener/operator-file paths, no HTTP fallback, and complete state cleanup.
