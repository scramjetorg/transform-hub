# Phase 4 — Live Kubernetes proof

## Goal

Validate the documented native Kubernetes MM+STH path on a user-provided cluster before Guided DX routes users to it.

## Owned paths

- `docs-source/deployment/**` Kubernetes reference material and focused checks
- `bdd/features/**` and step definitions for the live native Kubernetes proof
- `packages/adapter-kubernetes/**` only for proof-discovered blocking defects, plus focused regression tests
- Phase evidence under `.slim/plans/native-first-dx/` (preserve prior evidence; do not create `outcomes.md`)

## Tasks

- [ ] Run the documented native MM+STH deployment and one sequence operation against a user-provided cluster/context.
- [ ] Prove client-facing `2443`, private/loopback listener roles, native trust/identity routing, and no legacy HTTP fallback.
- [ ] Record prerequisites, bounded failures, and cleanup without provisioning infrastructure.
- [ ] Keep operation/readiness checks within 5 seconds and the complete live-Kubernetes e2e proof within 120 seconds; use direct resource diagnostics, never arbitrary sleeps.

## Acceptance criteria

- The live proof passes on the user-provided cluster or records an actionable bounded failure and environment limitation.
- No cluster provisioning, HA automation, or RBAC automation is added; existing user-provided permissions are prerequisites.
- The result updates the Kubernetes guide's evidence label and gives Phase 5 a stable destination to link.

## Verification

- Focused Kubernetes adapter/config tests, the supported live Kubernetes BDD scenario, and path/link inspection of the updated guide.
- Every operation/readiness assertion has a hard 5-second cap; total live e2e evidence has a 120-second cap.

## Non-goals

- Cluster creation, infrastructure provisioning, HA/failover, RBAC generation, or production-platform design.
