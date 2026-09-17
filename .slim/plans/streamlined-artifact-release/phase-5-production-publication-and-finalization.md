# Phase 5 — Production Publication and Finalization

## Outcome

`main` installs and runs curated full BDD against admitted tarballs, then publishes only those tarballs; registry verification/finalization follows exact evidence.

## Tasks

- [~] Create **Production Publish** for protected `main` pushes: prove exact merge/tree admission relationship, resolve one attested candidate release ID and manifest digest, download/verify its assets, and preflight all npm versions before credentials.
- [~] Create **Tarball Release Validation** reusable workflow call: install every first-party package from the downloaded manifest-listed `.tgz` files, reject workspace/source/registry fallbacks, run the curated full BDD suite, and return signed consumed-input evidence before npm publication credentials are requested.
- [~] Publish only the same manifest-listed `.tgz` paths directly under npm `latest`, with lifecycle scripts disabled and OIDC restricted to the direct protected production job; request the existing GitHub `production` environment approval only immediately before this npm publication; reject candidate or temporary npm dist-tag use.
- [~] Keep dependency-safe waves with controlled serial publication; after npm accepts a package, continue immediately without inline registry polling or a pacing delay. A separate verifier runs at least 30 minutes after publication and verifies registry metadata and downloaded tarball integrity for the complete release set.
- [~] Write an immutable publication journal recording accepted publish results and byte-identical reused packages; hard-stop mismatched existing versions. Registry-byte verification is appended only by the separate verifier.
- [~] Make **Production Publish** call **Production Registry Verification** through explicit `needs`/`workflow_call`, passing the candidate release ID, signed manifest digest, and signed publication-journal digest. The verifier runs with no OIDC or publishing authority, waits at least 30 minutes after publication, verifies the complete release set, and returns digest-bound registry-proof evidence.
- [~] Define **Release Finalizer** as a separate job in the protected `main` workflow, sourced from the main workflow revision and automatic with no GitHub environment approval. It verifies the main merge/tree relationship, candidate assets/admission/publication/verifier evidence and trusted GitHub Actions producer identities, then—and only then—uses narrowly scoped write permission to create the immutable `vX.Y.Z` tag and a draft GitHub Release, copy the verified candidate tarball assets into it without rebuilding, and download/hash-verify every copied asset against the candidate release-set SHA-256/SRI before publishing the release and attaching evidence. Phase 8 owns OCI image staging and mutable tag promotion.
- [~] Implement finalization reservation/retry semantics: a pre-existing final tag or draft release is reusable only when it binds the same main SHA, candidate release ID, signed manifest digest, and release identity; a retry resumes only missing or unverified asset copies, rejects mismatches, and never deletes/recreates immutable tags or silently replaces assets.
- [ ] Reject `workflow_run` as a release promotion mechanism. If it remains for managed release-PR reporting, constrain it to same-repository managed release-branch events, revalidate the recorded PR head SHA, grant PR-only permissions, and never consume/execute upstream artifacts.
- [~] Create **Release Publish Recovery** dispatch workflow: trigger it only after the delayed registry verifier reports missing packages. Before acquiring production publishing authority, fail closed unless its supplied candidate release ID/manifest digest/journal digest resolve to the admitted protected-`main` merge, verified candidate asset hashes, matching GitHub Actions producer identity, and successful main tarball-BDD evidence for the same SHA/manifest. Reject mismatched registry bytes rather than recovering them; for missing packages only, use the existing GitHub `production` environment immediately before manual npm recovery publication, reuse valid published packages, resume only missing dependency-wave members, and never rebuild or repack. No other recovery step uses an environment approval.
- [ ] Test partial publication recovery, propagation delays, identity mismatches, missing/malformed attestation, and wrong-parent/tree rejection.

## Acceptance Criteria

- Main has no package build, pack, package-unit-test, or directory-publish command; it has exactly one curated BDD run against installed manifest-listed tarballs before publication.
- A rerun resumes only byte-identical partial publication.
- Final tag/release cannot be produced without downloaded-registry integrity proof.
- Registry proof and finalization have separate explicit permission boundaries and digest-bound evidence handoffs.
- A final GitHub Release stays draft until post-copy downloaded-asset integrity proof is complete; partial finalization is resumable only for byte-identical state.

## Validation Evidence

- Publisher/verifier unit and integration fixtures, including partial waves and registry-delay simulation.
- Permission review covering the sole `production` environment gate immediately before npm
  publication/recovery, automatic no-environment-approval jobs, branch-protection guardrails, and
  an approved staged release rehearsal.

## Implementation Progress

- 2026-09-16: Local Phase 5 tooling and workflow integration passed `npm run lint`, 63 focused Phase 5 AVA tests, `npm run check:runtime-invariants`, and `git diff --check`.
- 2026-09-17: User replaced the 30-second per-package pacing requirement with immediate continuation after npm acceptance. Publication still records accepted/reused exact tarballs, never polls the registry after publishing, and never republishes an existing version; delayed no-OIDC verification remains the manual-recovery gate.
- 2026-09-17: The one bounded remediation pass made the publisher, verifier, recovery, and finalizer workflows execute their runtime contracts; the publisher and manual missing-package recovery path are gated only by the existing `production` environment immediately before npm publication, while verifier/finalizer and all other release paths have no environment approval. Focused final validation passed: 28 AVA tests via `node scripts/run-ava.js scripts/test/release-tarball-publish.spec.js scripts/test/release-registry-proof.spec.js scripts/test/release-production.spec.js scripts/test/release-production-runtime.spec.js scripts/test/release-finalizer.spec.js scripts/test/production-release-workflows.spec.js scripts/test/main-release-workflow.spec.js`, `npm run lint` (783 files, no warnings/errors), and `git diff --check`.
- 2026-09-17: The focused reviewer re-review found only the former accepted-publish/journal/delay ordering issue. Oracle confirmed it was not defined by the then-current criterion; the user explicitly removed pacing rather than adding interruption-durability semantics. No additional reviewer loop was run under the phase review budget.
- Remaining completion evidence is external: confirmation of the exact admission policy, the existing
  `production` environment configuration for the two narrowly scoped npm publication points,
  confirmation that current workflow changes leave no other environment bindings, candidate asset
  retention/access controls, per-package npm trusted-publisher setup, and an approved staged release
  rehearsal.
- 2026-09-16 remote audit: GitHub has two active rulesets: `Release governance: devel` enforces
  deletion/non-fast-forward protection with an owners-team bypass; `Release governance: main`
  enforces deletion/non-fast-forward protection plus one approving review, code-owner review,
  resolved threads, and the strict `Security / repository policy` check. Neither legacy
  branch-protection endpoint is used. Repository variables
  `SCRAMJET_RELEASE_REMOTE_POLICY_CONFIRMED=true` and
  `SCRAMJET_RELEASE_PRODUCTION_POLICY_CONFIRMED=true` exist. The existing `production` environment
  is the sole target approval gate, and current workflow changes eliminate all other environment
  bindings. The exact admission policy, candidate retention/access controls, and per-package npm
  trusted-publisher setup still need confirmation; GHCR package permissions could not be inspected
  with the current token.
