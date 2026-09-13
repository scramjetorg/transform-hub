# Phase 4 — Candidate and Admission Workflows

## Outcome

New fast PR, trusted candidate, reusable validation, and admission-only workflows enforce the target promotion model.

## Tasks

- [x] Create **PR Fast Validation** for `pull_request` to `devel`: lockfile/security/static gates, affected unit tests, and configured risk-area TypeScript smoke tests only; smoke runs use `tsx` or explicit type-check-omitting Node execution and never execute a package/release build; cancel stale PR runs.
- [x] Create **Build Release Candidate** for protected `devel` pushes: acquire/reuse the candidate-state build claim; candidate plan; one build/pack; image digest capture; candidate GitHub Release asset staging; and producer attestation.
- [x] Make **Build Release Candidate** call **Curated Devel Build Validation** through `workflow_call` after the single build and before candidate-success attestation, passing source SHA, build identity, staged tarball manifest, image digests, and candidate-state key. The callable returns consumed-input and per-shard evidence; the caller persists it and writes the candidate-success attestation only after the required matrix is complete and successful.
- [x] Create **Curated Devel Build Validation** reusable workflow call: claim/resume built-output BDD, consumed-input record, per-shard evidence, and no authority to admit/promote/publish.
- [x] Create **Release Promotion Admission** for the managed `devel` to `main` PR: exact candidate resolution, source/tree/parent verification, candidate-success attestation verification, and version/tag availability checks only. Admission explicitly requires the matching completed candidate-state record and all required BDD evidence.
- [x] Define concurrency groups so superseded PR/candidate test work cancels, while immutable staging, publication, and finalization cannot be cancelled after their protected point.
- [x] Apply pinned actions, least-privilege permissions, no credential persistence, cache trust separation, and fork-safe trigger handling.
- [x] Add policy tests proving no release build/full BDD exists in PR or admission workflows, TypeScript smoke needs no package build, and no mutable candidate asset reference is accepted.

## Acceptance Criteria

- Ordinary PRs never execute a release build or full BDD.
- A protected `devel` SHA creates one staged candidate and one curated BDD result against its single built output.
- `main` admission is impossible without exact proven candidate evidence.
- CI reruns either resume durable candidate state or fail closed on a conflicting/terminal state; they do not repeat completed build or BDD work.

## Validation Evidence

- Workflow policy tests: `node scripts/run-ava.js scripts/test/phase-4-workflow.spec.js scripts/test/workflow-inventory.spec.js scripts/test/release-pr-smoke.spec.js` (passed).
- Release contract/candidate validation tests: `node scripts/run-ava.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-bdd-validation.spec.js scripts/test/release-bundle.spec.js` (passed; 19 tests).
- Workflow syntax/diff checks: `node -e "...js-yaml..."` for all four Phase 4 workflows, `node --check scripts/release-candidate-workflow.js`, and `git diff --check` (passed).
- TypeScript smoke: `node node_modules/tsx/dist/cli.mjs scripts/release-risk-smoke.ts bdd` (passed).
- Fail-closed rerun/preflight check: `RELEASE_REMOTE_POLICY_CONFIRMED=false node scripts/release-candidate-workflow.js preflight ... --require-policy-confirmation` (rejected before build/stage as required).
- Remote limitation: protected GitHub repository variables, required checks, branch protections, candidate release artifacts, and the real GHCR digest are not available locally; a live protected `devel` candidate/admission rehearsal was not claimed.
