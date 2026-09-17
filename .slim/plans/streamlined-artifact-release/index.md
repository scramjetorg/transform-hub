# Streamlined Artifact Release

## Delivery Mode
- Mode: branch/worktree
- User decision: confirmed before planning

## Goal

Replace the CI/release topology with a from-scratch artifact-promotion system: fast ordinary-PR feedback, an explicit versioned release branch/promotion PR, candidate GitHub Release asset staging and curated BDD bound to its exact head SHA, admission-only promotion, exact-tarball npm publication, credentialless registry finalization, and resumable exact-tarball recovery.

## Scope

- Define new workflows and release-tool contracts independently of current workflow behavior.
- Build, stage, attest, validate, admit, publish, verify, and finalize one immutable release bundle.
- Remove obsolete release paths after cutover proof and remote protection changes.
- Build and promote post-publication OCI images from exact npm-published package versions.

## Non-goals

- Incrementally adapting transformed GitHub Packages prereleases as the production qualification path.
- Rebuilding or repacking after candidate admission.
- Introducing long-lived npm credentials.

## Target Trigger Map

| Trigger | Workflow | Result / GitHub environment approval |
| --- | --- | --- |
| `pull_request` to `devel` | PR Fast Validation | Fast source checks only; automatic, with no environment approval. |
| protected `workflow_dispatch` | Release Start | Capture one `devel` base, create the managed release branch/PR for an explicit stable version, and advance `devel` to an explicit development version; automatic, with no environment approval. |
| `pull_request` from managed release branch to `main` | Build Release Candidate | Immutable candidate GitHub Release asset set for the exact promotion-PR SHA; never build a candidate from `devel`; automatic, with no environment approval. |
| `workflow_call` from Build Release Candidate | Curated Release Build Validation | Full BDD evidence for one built promotion-PR candidate; automatic, with no environment approval. |
| `pull_request` from managed release branch to `main` | Release Promotion Admission | Exact-candidate admission only; automatic, with no environment approval. |
| protected `push` to `main` | Production Publish | Ordered publication of staged tarballs; the existing GitHub `production` environment is the sole approval and is requested only immediately before npm publication. |
| `workflow_call` from Production Publish | Tarball Release Validation | Full BDD evidence for installed staged tarballs; automatic, with no environment approval. |
| `workflow_call` from Production Publish | Production Registry Verification | Credentialless registry proof; automatic, with no environment approval. |
| finalization job in Production Publish | Release Finalizer | Tag and GitHub Release after proof; automatic, with no environment approval. |
| protected `workflow_dispatch` | Release Publish Recovery | Resume byte-identical missing tarball publication; use the existing GitHub `production` environment only immediately before manual missing-package npm recovery. |
| protected `main` merge | Devel Continuation Reconciliation | Rebase the recorded next-development continuation range on `main` and update `devel` only with a lease-guarded rewrite; automatic, with no environment approval. |
| protected post-publication workflow | OCI Image Staging and Promotion | Build, verify, attest, and promote OCI images from published package versions only; automatic, with no environment approval. |

The existing GitHub `production` environment is the sole environment approval in this plan. It is used only immediately before production npm publication and manual missing-package npm recovery. Branch protections, including PR review and code-owner requirements, guard promotion PRs; they are not environment approvals.

GitHub Packages prerelease publication, when retained for non-production use, is automatic and has
no GitHub environment approval.

## Phase Order

1. [Phase 1 — Release contract and remote feasibility](phase-1-release-contract-and-remote-feasibility.md)
2. [Phase 2 — Immutable bundle tooling](phase-2-immutable-bundle-tooling.md)
3. [Phase 3 — Curated release build validation](phase-3-curated-devel-build-validation.md)
4. [Phase 4 — Candidate and admission workflows](phase-4-candidate-and-admission-workflows.md)
5. [Phase 5 — Production publication and finalization](phase-5-production-publication-and-finalization.md)
6. [Phase 6 — Release-branch candidate and devel continuation](phase-6-release-branch-candidate-and-devel-continuation.md)
7. [Phase 7 — Cutover and abandoned-path removal](phase-7-cutover-and-abandoned-path-removal.md)
8. [Phase 8 — Post-publication OCI staging and promotion](phase-8-post-publication-oci-staging-and-promotion.md)

## Evidence and Decisions

## Accepted Requirements and Decision Interview

- [x] User-confirmed: one authoritative build/pack per managed release-branch promotion-PR candidate; no rebuild on ordinary PRs or `main`.
- [x] User-confirmed: ordinary PRs run static gates, affected unit tests, and risk-area smoke tests directly against TypeScript using `tsx` or Node with type checking omitted; release-branch promotion PRs are the explicit candidate-build exception.
- [x] User-confirmed: the managed release-branch promotion PR runs the curated full BDD suite once against its single built output.
- [x] User-confirmed: `main` installs the staged candidate tarballs and runs the curated full BDD suite again before npm publication; this is intentional second release validation.
- [x] User-confirmed: interrupted BDD work resumes when its SHA is unchanged; completed evidence is reused.
- [x] User-confirmed: stage production tarballs on a candidate GitHub Release; GHCR is used only for digest-pinned container images.
- [x] User-confirmed: retain candidate release assets for one month.
- [x] User-confirmed: promotion to `main` requires an exact merge commit—the admitted managed release-branch head is the second parent and its tree is unchanged.
- [x] User-confirmed: publish directly under npm `latest`; no candidate or temporary npm dist-tags.
- [x] User-confirmed: retain the current trusted-publishing workflow and OIDC-only npm authentication; build/test code receives no npm credential.
- [x] User-confirmed: publish dependency-safe waves; reuse only byte-identical published packages and hard-stop a mismatch.
- [x] User-confirmed: after registry proof, copy candidate tarballs to a draft final `vX.Y.Z` GitHub Release, download/hash-verify them, then publish that release.
- [x] User-confirmed: protected manual recovery resumes exact-tarball publishing—reuse valid packages and publish only missing wave members; it never rebuilds or repacks.
- [x] User-confirmed: rename abandoned executable scripts to `unused-*` while intentionally leaving references in place; run automatic and manual entrypoint checks to expose callers before deletion.
- [x] User-confirmed: obtain an explicit user decision for every legacy workflow and npm script deletion, and perform a complete documentation sweep.
- [x] User-confirmed: OCI images are built only after npm publication and registry proof, install exact published package versions without workspace/source inputs, and stage before mutable tag promotion; SI is published as `ghcr.io/scramjetorg/si`.
- [x] User-confirmed: after npm accepts a package, production continues immediately without inline registry polling or a pacing delay; npm acceptance is treated as publication success. A separate read-only, no-OIDC registry-verification job waits 30 minutes after publication, verifies all published tarballs, and is the only trigger for manual recovery when packages are not ready; it has no GitHub environment approval. Existing npm versions are never republished and may be reused only when byte-identical.
- [x] User-confirmed: release initiation creates a managed release branch and promotion PR for an explicit stable version while advancing `devel` through that release alignment to the explicit next development version; candidates are built from the promotion PR `head.sha`, never from `devel` or GitHub's synthetic merge SHA.
- [x] User-confirmed: one release train may be active from release start through successful devel reconciliation and its required checks; retries reuse its durable record and a second release start is rejected while reconciliation is pending or requires manual resolution.
- [x] User-confirmed: the next development version uses the explicit SemVer prerelease form `<next-stable>-devel` (for example, `2.1.3-devel`).
- [x] User-confirmed: `devel` is normally frozen from release start through the `main` merge. An administrator may use GitHub's native PR override for an exceptional linear or squash commit; after the merge, replay only the lock-invariant single-parent continuation discovered after the lock-bearing commit, stopping on conflicts and updating `devel` only with a backup ref and lease-guarded history rewrite. There is no separate approval or exception-recording workflow.
- [x] User-confirmed: if a release PR closes without merging, retain its `release/<stable-version>` branch and closed-PR history as the burned-version record; do not reuse its candidate identity or version reservation.
- [x] User-confirmed: use a simple committed `.github/release-train-lock.json` on `devel` as the durable release-train record. It blocks ordinary `devel` PRs while active; release-branch candidate PRs are not gated by it and revalidate it remotely. An owner may force-push `devel` to clear it for manual recovery, after which automation fails closed until an exact active or terminal record is restored.

## Review

- Status: Phase 6 local implementation and validation are complete; protected remote-policy configuration and rehearsal remain pending.
- Review evidence: candidate state claims/reuse; digest-bound workflow handoffs; explicit verifier/finalizer permissions; direct `latest`; draft asset-copy integrity; exact-tarball publish recovery; gated abandoned-path removal; release-branch candidate and devel-continuation revision.
- Root registry: `.slim/plans/review.md`.

## Open Decisions

- Confirm GitHub candidate-release asset API, immutable manifest/attestation binding, access controls, one-month cleanup, and a fallback storage representation.
- Confirm protected-branch rules can authorize only the release-start/reconciliation actor to create managed release refs and perform a lease-guarded `devel` rewrite, while preserving the required release-branch to `main` merge-parent/tree policy.
- Select the TypeScript smoke runner (`tsx` or Node with explicit type-check omission) and define the affected-workspace dependency-closure algorithm.
