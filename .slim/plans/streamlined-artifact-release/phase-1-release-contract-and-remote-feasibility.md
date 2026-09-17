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
  - [x] Two active GitHub rulesets were confirmed: `Release governance: devel` enforces
    deletion/non-fast-forward protection with an owners-team bypass, while `Release governance:
    main` additionally requires one approving review, code-owner review, resolved threads, and the
    strict `Security / repository policy` check. Neither legacy branch-protection endpoint is used;
    the exact admission policy still requires confirmation.
- [x] Exact promotion policy is: merge commit with admitted `devel` as second parent and resulting tree verified before merge; direct pushes to main are rejected by later required admission/publisher checks.
- [x] Recovery policy: npm versions are immutable, only exact tarball reuse is permitted, checksum mismatches hard-stop publication, and rebuild/repack is never allowed.

## Reset-Initialize Contract

- `reset-initialize` is a protected/manual command, not a generic ignore-state flag. It accepts stable version, next `<stable>-devel` version, exact expected `devel` SHA, and `confirm-reset` equal to stable.
- It is limited to failed same-release partial initialization: after rejecting an active different train, a final tag/GitHub Release, a merged promotion PR, ambiguous promotion PRs, a changed `devel` SHA, or a confirmation mismatch, it may clear the failed same-release partial marker/lock state and force-reset only the named `release/<stable>` and `devel` refs under leases.
- It then runs ordinary stable/development alignment and creates or reuses the promotion PR and normal active lock. It never writes `main`, publishes npm, merges PRs, bypasses branch protection, or uses a GitHub environment. The existing `production` environment remains the only npm approval.

## Acceptance Criteria

- A signed release-set manifest digest plus candidate release identity, not a mutable tag or check name, uniquely identifies every promotion input.
- Every privileged action has an explicit trust boundary and least-privilege permission set.
- The existing GitHub `production` environment is the sole environment approval: it is used only immediately before production npm publication and manual missing-package npm recovery. Release Start, devel reconciliation, candidate staging/BDD/admission, GitHub Packages prereleases, registry proof, and release finalization are automatic and use no GitHub environment approval; branch protections are their promotion guardrail, not an environment approval.
- Blocking remote capability decisions are confirmed or have an approved fallback.
- The reset-initialize command has a protected/manual trust boundary, explicit inputs, lease-guarded named-ref scope, and no authority over `main`, npm publication, PR merges, branch-protection bypass, or GitHub environments.

## Validation Evidence

- Schema fixtures and adversarial manifest/path cases.
- Recorded remote configuration/capability confirmations.

## Phase 1 Evidence and Limitations

- Local evidence: `scripts/release-contract/` contains the seven versioned JSON schemas,
  canonicalization/digest helpers, exact boundary/wave validation, artifact path/content
  checks, candidate authority checks, and fail-closed trust-policy checks. Focused coverage is
  in `scripts/test/release-contract.spec.js` with a release-set fixture.
- Remote record: `scripts/release-contract/remote-feasibility.json` records the observed
  `scramjetorg/transform-hub` facts: the two active rulesets are `Release governance: devel`
  (deletion/non-fast-forward only, owners-team bypass) and `Release governance: main`
  (deletion/non-fast-forward, one approving review, code-owner review, resolved threads, and
  strict `Security / repository policy`); neither legacy branch-protection endpoint is used.
  Repository variables `SCRAMJET_RELEASE_REMOTE_POLICY_CONFIRMED=true` and
  `SCRAMJET_RELEASE_PRODUCTION_POLICY_CONFIRMED=true` exist. The existing `production` environment
  is the sole target approval gate, and current workflow changes eliminate all other environment
  bindings. The exact admission policy, candidate retention/access controls, and per-package npm
  trusted-publisher setup still require confirmation; draft-release numeric ID plus signed digest
  remains the candidate authority, cleanup must be explicitly scheduled for 31 days, and images are
  digest-only.
- User-decision evidence: remote rules and production-policy confirmation variables are present,
  while the exact admission policy, candidate retention/access controls, and per-package npm
  trusted-publisher setup remain unconfirmed; privileged workflows remain fail-closed until those
  limitations are resolved.
- Approval-policy evidence: the only permitted GitHub environment approval is the existing
  `production` environment, immediately before production npm publication or manual missing-package
  npm recovery; all other release jobs are automatic and rely on branch protections where
  promotion control is required.
- Limitation: the exact admission policy, candidate retention/access controls, and per-package npm
  trusted-publisher setup are not confirmed. Privileged actions remain fail-closed for those
  unresolved trust decisions; workflow, packing, staging, BDD, publication, and deletion
  implementation remain for later phases.
