# Streamlined Artifact Release

## Delivery Mode
- Mode: branch/worktree
- User decision: confirmed before planning

## Goal

Replace the CI/release topology with a from-scratch artifact-promotion system: fast PR feedback, one protected-`devel` build, candidate GitHub Release asset staging, curated BDD against devel builds and installed main tarballs, admission-only promotion, exact-tarball npm publication, credentialless registry finalization, and resumable exact-tarball recovery.

## Scope

- Define new workflows and release-tool contracts independently of current workflow behavior.
- Build, stage, attest, validate, admit, publish, verify, and finalize one immutable release bundle.
- Remove obsolete release paths after cutover proof and remote protection changes.

## Non-goals

- Incrementally adapting transformed GitHub Packages prereleases as the production qualification path.
- Rebuilding or repacking after candidate admission.
- Introducing long-lived npm credentials.

## Target Trigger Map

| Trigger | Workflow | Result |
| --- | --- | --- |
| `pull_request` to `devel` | PR Fast Validation | Fast source checks only. |
| protected `push` to `devel` | Build Release Candidate | Immutable candidate GitHub Release asset set. |
| `workflow_call` from Build Release Candidate | Curated Devel Build Validation | Full BDD evidence for one built candidate. |
| `pull_request` from `devel` to `main` | Release Promotion Admission | Exact-candidate admission only. |
| protected `push` to `main` | Production Publish | Ordered publication of staged tarballs. |
| `workflow_call` from Production Publish | Tarball Release Validation | Full BDD evidence for installed staged tarballs. |
| `workflow_call` from Production Publish | Production Registry Verification | Credentialless registry proof. |
| protected finalization job in Production Publish | Release Finalizer | Tag, GitHub Release, and mutable image promotion after proof. |
| protected `workflow_dispatch` | Release Publish Recovery | Resume byte-identical missing tarball publication. |

## Phase Order

1. [Phase 1 — Release contract and remote feasibility](phase-1-release-contract-and-remote-feasibility.md)
2. [Phase 2 — Immutable bundle tooling](phase-2-immutable-bundle-tooling.md)
3. [Phase 3 — Curated devel build validation](phase-3-curated-devel-build-validation.md)
4. [Phase 4 — Candidate and admission workflows](phase-4-candidate-and-admission-workflows.md)
5. [Phase 5 — Production publication and finalization](phase-5-production-publication-and-finalization.md)
6. [Phase 6 — Cutover and abandoned-path removal](phase-6-cutover-and-abandoned-path-removal.md)

## Evidence and Decisions

## Accepted Requirements and Decision Interview

- [x] User-confirmed: one authoritative build/pack per protected `devel` candidate; no rebuild on the promotion PR or `main`.
- [x] User-confirmed: PRs run static gates, affected unit tests, and risk-area smoke tests directly against TypeScript using `tsx` or Node with type checking omitted; no package/release build occurs on a PR.
- [x] User-confirmed: `devel` runs the curated full BDD suite once against the single built output.
- [x] User-confirmed: `main` installs the staged candidate tarballs and runs the curated full BDD suite again before npm publication; this is intentional second release validation.
- [x] User-confirmed: interrupted BDD work resumes when its SHA is unchanged; completed evidence is reused.
- [x] User-confirmed: stage production tarballs on a candidate GitHub Release; GHCR is used only for digest-pinned container images.
- [x] User-confirmed: retain candidate release assets for one month.
- [x] User-confirmed: promotion to `main` requires an exact merge commit—admitted `devel` is the second parent and its tree is unchanged.
- [x] User-confirmed: publish directly under npm `latest`; no candidate or temporary npm dist-tags.
- [x] User-confirmed: retain the current trusted-publishing workflow and OIDC-only npm authentication; build/test code receives no npm credential.
- [x] User-confirmed: publish dependency-safe waves; reuse only byte-identical published packages and hard-stop a mismatch.
- [x] User-confirmed: after registry proof, copy candidate tarballs to a draft final `vX.Y.Z` GitHub Release, download/hash-verify them, then publish that release.
- [x] User-confirmed: protected manual recovery resumes exact-tarball publishing—reuse valid packages and publish only missing wave members; it never rebuilds or repacks.
- [x] User-confirmed: rename abandoned executable scripts to `unused-*` while intentionally leaving references in place; run automatic and manual entrypoint checks to expose callers before deletion.
- [x] User-confirmed: obtain an explicit user decision for every legacy workflow and npm script deletion, and perform a complete documentation sweep.

## Review

- Status: PASS — accepted after formal review and full decision interview.
- Review evidence: candidate state claims/reuse; digest-bound workflow handoffs; explicit verifier/finalizer permissions; direct `latest`; draft asset-copy integrity; exact-tarball publish recovery; gated abandoned-path removal.
- Root registry: `.slim/plans/review.md`.

## Open Decisions

- Confirm GitHub candidate-release asset API, immutable manifest/attestation binding, access controls, one-month cleanup, and a fallback storage representation.
- Confirm protected-branch rules can enforce the required `devel` to `main` merge-parent/tree policy.
- Select the TypeScript smoke runner (`tsx` or Node with explicit type-check omission) and define the affected-workspace dependency-closure algorithm.
