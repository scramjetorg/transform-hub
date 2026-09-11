# Phase 1 — Release Contract and Remote Feasibility

## Outcome

An approved, versioned artifact and trust contract plus confirmed GitHub/npm capabilities; no workflow implementation begins without these decisions.

## Tasks

- [ ] Define canonical `release-set.v1` manifest schema: source SHA/tree, lockfile digest, tool versions, release boundary, publication waves, tarball SHA-256/SRI, image digests, and build identity.
- [ ] Define build provenance, BDD consumed-input record, admission attestation, publication journal, and registry-verification evidence schemas.
- [ ] Specify candidate GitHub Release asset layout, signed manifest-digest consumption, release/tag naming, extraction safety rules, size/file allowlists, one-month retention, and deletion protection.
- [ ] Confirm remotely:
  - [ ] GitHub candidate-release asset APIs, Actions attestations, asset retention/cleanup, and access controls support the contract; GHCR is limited to digest-pinned container images.
  - [ ] npm OIDC/trusted-publishing behavior supports direct `latest` publication for every required package.
  - [ ] `devel`/`main` branch protections, CODEOWNERS, environments, merge method, and required-check topology enforce exact-tree promotion.
- [ ] Specify the exact candidate-to-main relationship: admitted `devel` SHA/tree, required merge parents, permitted merge method, and direct-push rejection behavior.
- [ ] Define failure, rollback, partial-publication, and recovery semantics; immutable npm versions are never overwritten.

## Acceptance Criteria

- A signed release-set manifest digest plus candidate release identity, not a mutable tag or check name, uniquely identifies every promotion input.
- Every privileged action has an explicit trust boundary and least-privilege permission set.
- Blocking remote capability decisions are confirmed or have an approved fallback.

## Validation Evidence

- Schema fixtures and adversarial manifest/path cases.
- Recorded remote configuration/capability confirmations.
