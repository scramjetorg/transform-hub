# Phase 6: Validation and Rollout

## Phase Acceptance Criteria

- [ ] Required package, BDD, build, runtime-invariant, and changed-path evidence is recorded.
- [ ] Comparable before/after timing includes per-chunk and aggregate median/p95 measures.
- [ ] Memory-guard commands, thresholds, skips/exceptions, and deferred coverage are recorded when applicable.
- [ ] Deferred audit findings and out-of-scope risks are preserved in the review record.

## Owned Paths

- Changed files from phases 2–5
- `.slim/plans/test-suite-rationalization-and-acceleration/review.md`

## Tasks

- [ ] Run focused verification per phase, then supported final package and BDD paths.
- [ ] Compare timing evidence and investigate regressions before rollout expansion.
- [ ] Complete planned phase review loops and record limitations/deferred work.

## Verification Commands

- `npm run build:packages`
- `npm run test:packages:phase-final`
- `npm run check:runtime-invariants`
- Changed-path supported `npm run test:bdd-ci-*` commands.

## Non-goals

- Do not create `outcomes.md`; plan completion owns it after actual evidence.
- Do not commit, merge, release, or deploy.
