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
- Correct stale help, Docker metadata, examples, and generated-documentation drift that obscure the current transport.

## Non-goals

- Remove or deprecate HTTP/v1, CPM, direct-Hub ingress, or existing automation in this plan.
- Redesign Verser2/TLS security, automatically trust or download remote CAs, or weaken identity/route verification.
- Add a new package manager, a second sequence deployment protocol, HA/failover design, Kubernetes RBAC automation, or a full production-platform reference architecture.
- Publish STH HTTP, runner, or MultiManager HTTP ports as part of the recommended topology.

## Confirmed decisions

- Delivery mode: current branch.
- Rollout: native-first behaviour changes now, with explicit compatibility configuration retained.
- Bundle distribution: deployments support both a trusted admin-distributed bundle file and a deterministic copy-paste configuration form generated from that trusted bundle. Neither flow obtains a CA from the remote endpoint.
- Documentation coverage: local processes, Docker Compose, and Kubernetes all receive a current-topology guide. Compose is the complete deployed end-to-end proof topology; local and Kubernetes are validated to their documented boundaries.
- Phase 0 is required.
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
- Native `si` has no HTTP fallback; it emits actionable, secret-safe and distinguishable failures for invalid CA, missing/duplicate route, wrong ingress identity, and unreachable endpoint.
- Fresh STH configuration uses native Manager/Space terminology and connects upstream without requiring legacy CPM fields; existing explicit CPM configuration retains its prior behaviour.
- Repository-owned Node, Python, and Bun scaffolds each package successfully and complete their claimed deploy/run path through the existing protocol.
- HTTP/v1 and CPM docs/help are clearly marked compatibility, retain working examples, and do not appear in the recommended quickstart.
- Generated documentation matches its `docs-source` inputs; focused unit/package/BDD validation and the final build/lint evidence pass.

## Dependencies and assumptions

- Verser2 TLS identity, route validation, and secret-redaction contracts remain mandatory.
- The bundle producer is a deployment administrator with access to the trusted CA and platform identity; distributing its sensitive values is an operational responsibility, not a network bootstrap feature.
- The plan relies on the existing `si sequence deploy` protocol rather than replacing it.
- Kubernetes documentation needs a real cluster/configuration boundary identified during implementation; it is not licensed to add cluster provisioning.

## Deferred decision

- **Kubernetes live-cluster evidence** — State: deferred; Kind: constraint. The plan documents Kubernetes configuration and network boundaries but does not claim a live-cluster proof. The user will set up a test environment or approve a transient GitHub Actions cluster first. Revisit before Phase 3 verification or any release claim that Kubernetes was end-to-end tested. Decision history: 2026-09-22, user explicitly deferred live Kubernetes testing.

## Verification budget

| Claim | Evidence owner | Minimum evidence |
|---|---|---|
| Native bootstrap/control path | MVP 1 | focused config/CLI/host/MM tests, `npm run build:packages`, a real `si → MM → STH` BDD scenario, explicit no-HTTP request evidence |
| Three sequence workflows | MVP 2 | scaffold/packing tests and one supported deploy/run proof per runtime |
| Documentation/topology accuracy | MVP 3 | docs source generation/check, help snapshots/assertions, documented Compose proof |
| Compatibility preservation | Cleanup/coverage | focused legacy CLI/config tests and migration assertions |
| Final state | Fixes/coverage | `npm run lint`, `npm run build:packages`, `npm run test:packages`, scoped BDD commands |

Memory-guard coverage is not planned unless the implementation changes runner, BDD harness, or retained-stream behaviour; any later exception must be recorded with its reason.

## Delivery and commits

- Mode: current branch (user confirmed).
- Phase commit policy: one focused commit after each completed phase's validation, review/remediation, and reconciliation. Only that phase's owned, changed paths are staged.

## Research record

- `draft.md` contains the non-executable research synthesis and source references.
- Oracle advisory shaped the onboarding contract and phase envelope on 2026-09-22. Materialized-plan review findings were resolved by defining native profile selection/no-fallback semantics, baseline bundle safety, Phase 0 stop/rescope criteria, Compose/Kubernetes evidence boundaries, per-runtime proof commands, and narrower phase ownership.

## Phase index

1. [Phase 0 — native onboarding PoC](phase-0-native-onboarding-poc.md)
2. [Phase 1 — native bootstrap and configuration](phase-1-native-bootstrap.md)
3. [Phase 2 — sequence authoring](phase-2-sequence-authoring.md)
4. [Phase 3 — documentation and examples](phase-3-documentation.md)
5. [Phase 4 — Cleanup/DX](phase-4-cleanup-dx.md)
6. [Phase 5 — Hardening](phase-5-hardening.md)
7. [Phase 6 — Fixes and coverage](phase-6-fixes-coverage.md)
