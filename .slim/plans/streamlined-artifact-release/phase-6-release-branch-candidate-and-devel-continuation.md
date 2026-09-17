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

- [ ] Create protected manual **Release Start** with explicit stable release-version and `<next-stable>-devel` next-development-version inputs. Validate that both are SemVer, stripping `-devel` yields the declared next stable version, and that next stable is greater than the release version. Capture `D0`, validate the stable version against every release-boundary package, npm, final release/tag identity, and active reservation, and create one resumable release-train record. Reject a second active train until reconciliation and its required checks succeed; retries must match the stored identity exactly.
- [ ] Create `release/<stable-version>` from `D0`, apply stable release alignment to form `R1`, then advance `devel` through `R1` and apply the development bump to form `D1`. Record `D0`, `R1`, `D1`, the release branch, promotion PR number/head/base/repository, `mainAtStart` as audit context, and release-train digest. Use compare-and-swap updates and fail closed if a ref moves unexpectedly.
- [ ] Define resumable release-start state for every remote mutation: reservation, release ref, stable alignment, devel advancement, and promotion PR. On a closed/unmerged promotion PR, retain an aborted record and burn the stable version; unfreeze `devel` without reusing candidate identity or reservation.
- [ ] Move candidate build, candidate staging, curated BDD, and admission authority from protected `devel` pushes to the managed release-branch promotion PR. Require same-repository managed `release/*` ownership, `main` base, matching train record, and immutable `pull_request.head.sha`; fork or arbitrary same-repository PRs never receive write-capable staging/evidence jobs.
- [ ] Bind candidate identity, tag, release-set metadata, BDD evidence, admission, and main publication to `Rk`/the promotion-PR `head.sha`, never to GitHub's synthetic merge SHA. At admission, record `mainFirstParentAtAdmission`; main movement after admission or a changed promotion-PR head invalidates the candidate and requires a fresh candidate/BDD/admission cycle.
- [ ] Keep `devel` frozen by default from release start until the promotion PR merges to `main`. Exceptional PRs may be admitted only with ordinary validation, an auditable release-exception decision, and linear or squash history; append ordered commit IDs and decision references to `D1..Dn`.
- [ ] After `M`, recreate `devel` by replaying the recorded ordered linear continuation list based at `R1`—never a range based at mutable `Rk`—on `M`. Atomically create a retained backup ref and update `devel` with `--force-with-lease=<expected-devel-tip>` where supported; otherwise model the intermediate state for retry. Verify the ordered replayed commit set, rerun required devel checks, and stop for manual resolution on conflict; retain the active train lock until reconciliation succeeds or a durable manual-recovery decision establishes a safe base.
- [ ] Require a changed release-branch SHA to start a new candidate cycle; never reuse prior tarballs, BDD evidence, seals, or admission solely because the version is unchanged.
- [ ] Replace fixed `devel -> main` branch assumptions in PR automation, candidate, admission, and publication guards with the release-train record and exact promotion-PR identity.

## Acceptance Criteria

- A candidate cannot be built, sealed, or admitted from `devel`; every candidate identifies one managed release branch, promotion PR, immutable `Rk` source SHA, and train record.
- Release start rejects an already-published/reserved stable version and invalid/regressive development version; it never derives either from the current `devel` manifest. One active train remains authoritative through successful devel reconciliation and an aborted stable version is burned.
- `devel` carries the recorded `<next-stable>-devel` version while a release branch is being validated; ordinary changes are frozen and exceptional linear/squash changes are bounded, auditable, and replayed after the `main` merge or stopped on conflict.
- Reconciliation never alters candidate evidence or `main`, never discards commits outside the recorded continuation list based at `R1`, uses a lease-guarded rewrite with a retained backup ref, and reruns required devel validation.
- A release-branch fix invalidates the preceding candidate and requires a fresh candidate, curated BDD evidence, and admission.

## Dependencies

- Existing immutable candidate, tarball, BDD, admission, and production publication contracts from Phases 2–5.
- Approved remote policy granting only the narrowly scoped release-start authority needed for reservation/ref/PR creation and the devel-continuation authority needed for a lease-guarded `devel` update; neither authority may rewrite `main`.

## Non-goals

- Inferring stable or next-development versions from package manifests, supporting parallel active trains, or reusing a burned stable version.
- Automatically resolving rebase conflicts, accepting merge-commit exceptions, bypassing ordinary validation for exceptional PRs, or rewriting `main`.
- Reusing candidate assets after a promotion-PR SHA changes.

## Validation Evidence

- Offline release-train fixtures for duplicate/burned version rejection, one-active-train enforcement through reconciliation, invalid/regressive development-version rejection, partial-start retry identity, exact `pull_request.head.sha`/PR/base/repository/train-record binding, admission-time main-parent capture, moved-main invalidation, an `R2` release-branch fix with candidate/admission binding to `R2` and replay base remaining `R1`, linear exception-range replay, conflict stop, backup/ref-update interruption retry, backup-ref creation, force-with-lease protection, and untrusted-PR staging rejection.
- Protected workflow rehearsal showing release-start, candidate/BDD/admission on the promotion PR, `main` publication, and successful devel continuation reconciliation.
