# Phase 7 — Post-publication OCI Staging and Promotion

## Outcome

After production npm publication and registry proof, OCI images are built from the exact published package versions, verified and attested under immutable staging tags, then promoted only when their evidence matches the finalized release.

## Tasks

- [ ] Define the required OCI image map for STH, MultiManager, SI, and every supported runner runtime. Fix SI to `ghcr.io/scramjetorg/si`; record the approved GHCR repositories, npm package inputs, Dockerfile contexts, and supported architectures for all other roles.
- [ ] Create a protected **OCI Image Staging and Promotion** workflow that can run only after the matching protected-`main` publication journal and credentialless registry proof are verified. It accepts only the final release identity, main SHA, manifest digest, journal digest, and registry-proof digest as inputs.
- [ ] Build each OCI image in a clean context using only exact first-party package versions downloaded from npm and verified against the publication journal. Reject workspace links, source-directory copies, local tarballs, unpinned ranges, and a package version or integrity mismatch.
- [ ] Push each successful image under an immutable staging tag bound to the release identity and main SHA; record repository, tag, digest, package-version input set, build provenance, SBOM, scan result, and smoke-test result in signed OCI-staging evidence.
- [ ] Verify every staging digest by pull and inspect, run role-appropriate container smoke checks, and reject an incomplete, duplicate, or mismatched role set before any mutable tag update.
- [ ] Promote only verified staging digests to approved mutable version and `latest` tags after all required OCI evidence is accepted. Never rebuild, retag a mismatched digest, or republish npm packages during promotion.
- [ ] Extend recovery to resume only missing or unverified OCI staging or promotion work when the final release identity, main SHA, published package versions, publication journal, registry proof, and prior OCI evidence all match exactly.
- [ ] Add policy and integration fixtures for published-version-only installs, source/workspace rejection, digest/tag mismatch, incomplete image sets, smoke-test failure, attestation mismatch, and resumable OCI recovery.

## Acceptance Criteria

- OCI image builds start only after the corresponding npm publication and registry proof are complete, even though this engineering phase follows cutover work.
- Every required image is built from the exact published npm package versions bound by the immutable publication journal; no workspace, source-tree, local-tarball, or version-range dependency can enter an image.
- SI is staged and promoted through `ghcr.io/scramjetorg/si`; STH, MultiManager, and supported runner repository mappings are explicit, reviewed, and bound in the OCI evidence.
- Mutable OCI tags reference only verified immutable staging digests and cannot be advanced when any required role lacks matching evidence.
- OCI recovery resumes byte-identical post-publication work without rebuilding from source or republishing npm packages.

## Dependencies

- Phase 5 production publication, tarball BDD validation, registry proof, final release identity, and publication journal.
- Phase 6 cutover evidence and confirmed active workflow/required-check configuration.
- Approved GHCR repository map and package-to-image input map for STH, MultiManager, SI, and runners.

## Non-goals

- Building OCI images from a protected-`devel` candidate, workspace, source checkout, or unpublished tarball.
- Replacing the exact-tarball npm publication, registry verification, or release-finalizer evidence paths.
- Republishing npm packages as part of OCI retries or promotion.

## Validation Evidence

- Offline workflow-policy and manifest/journal fixture suites covering package-version and digest binding, source/workspace rejection, incomplete role rejection, and recovery.
- Protected staging rehearsal using published package versions, digest pull/inspect, SBOM/provenance verification, and role-appropriate container smoke checks.
- Final tag-promotion rehearsal proving every mutable tag resolves to the signed immutable staging digest for the same finalized release.
