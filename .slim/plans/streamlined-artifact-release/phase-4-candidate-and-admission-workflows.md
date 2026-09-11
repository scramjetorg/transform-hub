# Phase 4 — Candidate and Admission Workflows

## Outcome

New fast PR, trusted candidate, reusable validation, and admission-only workflows enforce the target promotion model.

## Tasks

- [ ] Create **PR Fast Validation** for `pull_request` to `devel`: lockfile/security/static gates, affected unit tests, and configured risk-area TypeScript smoke tests only; smoke runs use `tsx` or explicit type-check-omitting Node execution and never execute a package/release build; cancel stale PR runs.
- [ ] Create **Build Release Candidate** for protected `devel` pushes: acquire/reuse the candidate-state build claim; candidate plan; one build/pack; image digest capture; candidate GitHub Release asset staging; and producer attestation.
- [ ] Make **Build Release Candidate** call **Curated Devel Build Validation** through `workflow_call` after the single build and before candidate-success attestation, passing source SHA, build identity, staged tarball manifest, image digests, and candidate-state key. The callable returns consumed-input and per-shard evidence; the caller persists it and writes the candidate-success attestation only after the required matrix is complete and successful.
- [ ] Create **Curated Devel Build Validation** reusable workflow call: claim/resume built-output BDD, consumed-input record, per-shard evidence, and no authority to admit/promote/publish.
- [ ] Create **Release Promotion Admission** for the managed `devel` to `main` PR: exact candidate resolution, source/tree/parent verification, candidate-success attestation verification, and version/tag availability checks only. Admission explicitly requires the matching completed candidate-state record and all required BDD evidence.
- [ ] Define concurrency groups so superseded PR/candidate test work cancels, while immutable staging, publication, and finalization cannot be cancelled after their protected point.
- [ ] Apply pinned actions, least-privilege permissions, no credential persistence, cache trust separation, and fork-safe trigger handling.
- [ ] Add policy tests proving no release build/full BDD exists in PR or admission workflows, TypeScript smoke needs no package build, and no mutable candidate asset reference is accepted.

## Acceptance Criteria

- Ordinary PRs never execute a release build or full BDD.
- A protected `devel` SHA creates one staged candidate and one curated BDD result against its single built output.
- `main` admission is impossible without exact proven candidate evidence.
- CI reruns either resume durable candidate state or fail closed on a conflicting/terminal state; they do not repeat completed build or BDD work.

## Validation Evidence

- Workflow policy tests, trigger/permission fixtures, and a dry-run candidate artifact handoff.
