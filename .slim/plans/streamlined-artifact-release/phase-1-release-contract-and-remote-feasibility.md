# Phase 1 — Release Contract and Remote Feasibility

## Outcome

An approved, versioned artifact and trust contract plus confirmed GitHub/npm capabilities; no workflow implementation begins without these decisions.

## Tasks

- [x] Define canonical `release-set.v1` manifest schema: source SHA/tree, lockfile digest, tool versions, release boundary, publication waves, tarball SHA-256/SRI, image digests, and build identity.
- [x] Define build provenance, BDD consumed-input record, admission attestation, publication journal, and registry-verification evidence schemas.
- [x] Candidate draft GitHub Release layout is defined with numeric release ID and canonical release-set digest, includes `package-lock.json`, allowlists `artifacts/*.tgz` assets, allows digest-only images, requires 31-day explicit cleanup, and applies no tag authority.
- [x] Remote capability research/current inspection was completed:
  - [x] GitHub API support established for candidate-release assets, attestations, and access controls; GHCR constrained to digest-pinned images.
  - [x] npm direct-latest publish behavior is supported, with per-package trusted-publisher configuration deferred.
  - [x] `devel`/`main` protection remains insufficient for the contract as currently configured; custom admission check required.
- [x] Exact promotion policy is: merge commit with admitted `devel` as second parent and resulting tree verified before merge; direct pushes to main are rejected by later required admission/publisher checks.
- [x] Recovery policy: npm versions are immutable, only exact tarball reuse is permitted, checksum mismatches hard-stop publication, and rebuild/repack is never allowed.

## Acceptance Criteria

- A signed release-set manifest digest plus candidate release identity, not a mutable tag or check name, uniquely identifies every promotion input.
- Every privileged action has an explicit trust boundary and least-privilege permission set.
- Blocking remote capability decisions are confirmed or have an approved fallback.

## Validation Evidence

- Schema fixtures and adversarial manifest/path cases.
- Recorded remote configuration/capability confirmations.

## Phase 1 Evidence and Limitations

- Local evidence: `scripts/release-contract/` contains the seven versioned JSON schemas,
  canonicalization/digest helpers, exact boundary/wave validation, artifact path/content
  checks, candidate authority checks, and fail-closed trust-policy checks. Focused coverage is
  in `scripts/test/release-contract.spec.js` with a release-set fixture.
- Remote record: `scripts/release-contract/remote-feasibility.json` records the observed
  `scramjetorg/transform-hub` facts: strict checks exist on `devel`/`main` but required checks
  and rulesets are zero, environment admin bypass is enabled, a custom required admission
  check is needed for the two-parent/tree policy, draft-release numeric ID plus signed digest is
  the candidate authority, cleanup must be explicitly scheduled for 31 days, images are
  digest-only, and per-package npm trusted-publisher direct-`latest` remains unverified.
- User-decision evidence: remote rule/npm setup is deferred until before the meeting and is not a
  Phase-1 blocker; privileged workflows remain fail-closed until confirmed.
- Limitation: remote application/configuration is not confirmed. The recorded policy is
  `unconfirmed`, so privileged actions fail closed. Workflow, packing, staging, BDD,
  publication, and deletion implementation remain for later phases.
