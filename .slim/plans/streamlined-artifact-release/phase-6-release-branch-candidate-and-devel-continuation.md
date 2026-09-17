# Phase 6 — Release-Branch Candidate and Devel Continuation

## Outcome

Each release begins from an explicit versioned branch and promotion PR, while `devel` advances through the release alignment to the next development version. Candidate assets and admission bind only the immutable promotion-PR `head.sha`; after the `main` merge, `devel` is reconstructed from `main` plus the recorded development continuation without losing admitted exceptional PRs.

## Release-Train Refs

- `D0`: the captured `devel` SHA at release start.
- `R1`: the immutable managed `release/<stable-version>` stable-alignment base through which `devel` advances before its continuation.
- `Rk`: the current managed release-branch promotion-PR head and candidate source; a release-branch fix advances it from `R1` to `R2` and requires a fresh candidate cycle.
- `D1..Dn`: the linear `devel` continuation after `R1`: first the `<next-stable>-devel` bump, then explicitly admitted exceptional commits.
- `M`: the admitted exact merge of `Rk` into `main`; `Rk` is its second parent and `M` has the same tree as `Rk`.

## Tasks

- [x] Create protected manual **Release Start** with explicit stable release-version and `<next-stable>-devel` next-development-version inputs. Validate that both are SemVer, stripping `-devel` yields the declared next stable version, and that next stable is greater than the release version. Capture `D0`, validate the stable version against every release-boundary package, npm, final release/tag identity, and active reservation, and create one resumable release-train record. Reject a second active train until reconciliation and its required checks succeed; retries must match the stored identity exactly.
- [x] Create `release/<stable-version>` from `D0`, apply stable release alignment to form `R1`, then advance `devel` through `R1` and apply the development bump to form `D1`. Record `D0`, `R1`, `D1`, the release branch, promotion PR number/head/base/repository, `mainAtStart` as audit context, and release-train digest. Use compare-and-swap updates and fail closed if a ref moves unexpectedly.
- [x] Define resumable release-start state for every remote mutation: reservation, release ref, stable alignment, devel advancement, and promotion PR. On a closed/unmerged promotion PR, retain the `release/<stable-version>` branch and closed-PR history as the burned-version record; an owner may manually clear the `devel` lock without reusing candidate identity or reservation.
- [x] Move candidate build, candidate staging, curated BDD, and admission authority from protected `devel` pushes to the managed release-branch promotion PR. Require same-repository managed `release/*` ownership, `main` base, matching train record, and immutable `pull_request.head.sha`; fork or arbitrary same-repository PRs never receive write-capable staging/evidence jobs.
- [x] Bind candidate identity, tag, release-set metadata, BDD evidence, admission, and main publication to `Rk`/the promotion-PR `head.sha`, never to GitHub's synthetic merge SHA. At admission, record `mainFirstParentAtAdmission`; main movement after admission or a changed promotion-PR head invalidates the candidate and requires a fresh candidate/BDD/admission cycle.
- [x] Keep `devel` frozen by default from release start until the promotion PR merges to `main`. The required lock check blocks ordinary PRs; an administrator may use GitHub's native PR override only for an exceptional linear or squash commit. There is no approval, label, or exception-recording workflow.
- [x] After `M`, recreate `devel` by locating the sole lock-bearing child of `R1`, reapplying the recorded development version on `M`, then replaying only the lock-invariant single-parent commits after that lock—never a range based at mutable `Rk`. Atomically create a retained backup ref and update `devel` with `--force-with-lease=<expected-devel-tip>` where supported; otherwise model the intermediate state for retry. Verify the ordered replayed commit set, rerun required devel checks, and stop for manual resolution on conflict; retain the active train lock until reconciliation succeeds or a durable manual-recovery decision establishes a safe base.
- [x] Require a changed release-branch SHA to start a new candidate cycle; never reuse prior tarballs, BDD evidence, seals, or admission solely because the version is unchanged.
- [x] Replace fixed `devel -> main` branch assumptions in PR automation, candidate, admission, and publication guards with the release-train record and exact promotion-PR identity.

## Acceptance Criteria

- A candidate cannot be built, sealed, or admitted from `devel`; every candidate identifies one managed release branch, promotion PR, immutable `Rk` source SHA, and train record.
- Release start rejects an already-published/reserved stable version and invalid/regressive development version; it never derives either from the current `devel` manifest. One active train remains authoritative through successful devel reconciliation and an aborted stable version is burned.
- `devel` carries the recorded `<next-stable>-devel` version while a release branch is being validated; ordinary changes are frozen and exceptional linear/squash changes are bounded, auditable, and replayed after the `main` merge or stopped on conflict.
- Reconciliation never alters candidate evidence or `main`, never discards commits outside the recorded continuation list based at `R1`, uses a lease-guarded rewrite with a retained backup ref, and reruns required devel validation.
- A release-branch fix invalidates the preceding candidate and requires a fresh candidate, curated BDD evidence, and admission.

## Dependencies

- Existing immutable candidate, tarball, BDD, admission, and production publication contracts from Phases 2–5.
- Approved remote policy granting only the narrowly scoped release-start authority needed for reservation/ref/PR creation and the devel-continuation authority needed for a lease-guarded `devel` update; neither authority may rewrite `main`.

## Release-Train Record

- The durable record is a committed `.github/release-train-lock.json` on `devel`; its presence and active status blocks ordinary `devel` PRs, while release-branch candidate workflows re-read it remotely rather than requiring it in `Rk`.
- The record is created once in the sole lock-bearing `L1` commit after `R1`; it contains the explicit versions, `D0`, `R1`, release branch, promotion PR identity, and `mainAtStart`. The lock file must remain byte-identical through any administrator-overridden continuation commits.
- An owner may force-push `devel` to remove the lock for emergency recovery. Subsequent automated candidate, admission, and reconciliation operations fail closed until an exact active or terminal lock is restored.

## Non-goals

- Inferring stable or next-development versions from package manifests, supporting parallel active trains, or reusing a burned stable version.
- Automatically resolving rebase conflicts, accepting merge-commit exceptions, bypassing ordinary validation for exceptional PRs, or rewriting `main`.
- Reusing candidate assets after a promotion-PR SHA changes.

## Validation Evidence

- Offline release-train fixtures for duplicate/burned version rejection, one-active-train enforcement through reconciliation, invalid/regressive development-version rejection, partial-start retry identity, exact `pull_request.head.sha`/PR/base/repository/train-record binding, admission-time main-parent capture, moved-main invalidation, an `R2` release-branch fix with candidate/admission binding to `R2` and replay base remaining `R1`, linear exception-range replay, conflict stop, backup/ref-update interruption retry, backup-ref creation, force-with-lease protection, and untrusted-PR staging rejection.
- Protected workflow rehearsal showing release-start, candidate/BDD/admission on the promotion PR, `main` publication, and successful devel continuation reconciliation.

## Implementation Progress and Limitation

- 2026-09-17: Local implementation added the committed `devel` lock, version alignment, protected Release Start/reconciliation/abort workflows, managed release-branch candidate and admission binding, second-parent main resolution, and lock-backed ordinary-PR freeze.
- Local evidence passed: 184 focused AVA tests covering the Phase 6 boundary; `npm run lint` (787 files, no warnings/errors); `npm run check:runtime-invariants` (8/8); and `git diff --check`.
- The protected remote rehearsal remains pending. It requires configured release-start/reconciliation authority, required `devel` lock check, protected environments, a valid unused stable version, and confirmation that the remote policy accepts the lease-guarded devel update.
- Ordinary PRs remain fail-closed while the lock exists. An administrator may use GitHub's native PR override; reconciliation accepts only the resulting single-parent, lock-invariant commit sequence. Merge commits, lock changes, or a cleared lock fail closed.
