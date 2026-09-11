# Phase 5 — Production Publication and Finalization

## Outcome

`main` installs and runs curated full BDD against admitted tarballs, then publishes only those tarballs; registry verification/finalization follows exact evidence.

## Tasks

- [ ] Create **Production Publish** for protected `main` pushes: prove exact merge/tree admission relationship, resolve one attested candidate release ID and manifest digest, download/verify its assets, and preflight all npm versions before credentials.
- [ ] Create **Tarball Release Validation** reusable workflow call: install every first-party package from the downloaded manifest-listed `.tgz` files, reject workspace/source/registry fallbacks, run the curated full BDD suite, and return signed consumed-input evidence before npm publication credentials are requested.
- [ ] Publish only the same manifest-listed `.tgz` paths directly under npm `latest`, with lifecycle scripts disabled and OIDC restricted to the direct protected production job; reject candidate or temporary npm dist-tag use.
- [ ] Keep dependency-safe waves with controlled parallelism; after each wave, verify registry metadata and downloaded tarball integrity before proceeding.
- [ ] Write an immutable publication journal recording accepted and byte-identical reused packages; hard-stop mismatched existing versions.
- [ ] Make **Production Publish** call **Production Registry Verification** through explicit `needs`/`workflow_call`, passing the candidate release ID, signed manifest digest, and signed publication-journal digest. The verifier has read-only permissions, runs no triggering-run artifact code, and returns signed registry-proof evidence.
- [ ] Define **Release Finalizer** as a separate job in the protected `main` workflow, sourced from the main workflow revision and gated by a dedicated finalization environment. It verifies the main merge/tree relationship, candidate assets/admission/publication/verifier evidence and signer identities, then—and only then—uses narrowly scoped write permission to create the immutable `vX.Y.Z` tag and a draft GitHub Release, copy the verified candidate tarball assets into it without rebuilding, and download/hash-verify every copied asset against the candidate release-set SHA-256/SRI before publishing the release, attaching evidence, and promoting mutable image tags.
- [ ] Implement finalization reservation/retry semantics: a pre-existing final tag or draft release is reusable only when it binds the same main SHA, candidate release ID, signed manifest digest, and release identity; a retry resumes only missing or unverified asset copies, rejects mismatches, and never deletes/recreates immutable tags or silently replaces assets.
- [ ] Reject `workflow_run` as a release promotion mechanism. If it remains for managed PR creation, constrain it to same-repository protected-`devel` events, revalidate head SHA, grant PR-only permissions, and never consume/execute upstream artifacts.
- [ ] Create **Release Publish Recovery** dispatch workflow: before acquiring production publishing authority, fail closed unless its supplied candidate release ID/manifest digest/journal digest resolve to the admitted protected-`main` merge, verified candidate asset hashes, a trusted matching journal signer, and successful main tarball-BDD evidence for the same SHA/manifest. Then run in the protected production environment, reuse valid published packages, resume only missing dependency-wave members, and never rebuild or repack.
- [ ] Test partial publication recovery, propagation delays, identity mismatches, missing/malformed attestation, and wrong-parent/tree rejection.

## Acceptance Criteria

- Main has no package build, pack, package-unit-test, or directory-publish command; it has exactly one curated BDD run against installed manifest-listed tarballs before publication.
- A rerun resumes only byte-identical partial publication.
- Final tag/release cannot be produced without downloaded-registry integrity proof.
- Registry proof and finalization have separate explicit permission boundaries and digest-bound evidence handoffs.
- A final GitHub Release stays draft until post-copy downloaded-asset integrity proof is complete; partial finalization is resumable only for byte-identical state.

## Validation Evidence

- Publisher/verifier unit and integration fixtures, including partial waves and registry-delay simulation.
- Production-environment permission review and an approved staged release rehearsal.
