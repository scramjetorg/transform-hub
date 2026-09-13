# Phase 4 — Candidate and Admission Workflows

## Outcome

New fast PR, trusted candidate, reusable validation, and admission-only workflows enforce the target promotion model.

## Tasks

- [x] Create **PR Fast Validation** for `pull_request` to `devel`: lockfile/security/static gates, affected unit tests, and configured risk-area TypeScript smoke tests only; smoke runs use `tsx` or explicit type-check-omitting Node execution and never execute a package/release build; cancel stale PR runs.
- [x] Create **Build Release Candidate** for protected `devel` pushes: locate the deterministic candidate tag, resolve an existing candidate only by numeric release ID plus release-set/sealed-state digests, or perform the single credentialless build/pack when explicitly absent; staging creates the immutable candidate seal.
- [x] Make **Build Release Candidate** call **Curated Devel Build Validation** through `workflow_call` after staging and before candidate-success attestation, passing only source SHA, numeric release ID, release-set digest, sealed-state digest, candidate tag routing, and image digest. The callable re-downloads the sealed durable assets, persists shard evidence, and candidate-success is persisted only after the required matrix completes successfully.
- [x] Create **Curated Devel Build Validation** reusable workflow call: claim/resume BDD from the numeric candidate release, verify the immutable seal and staged tarballs, persist consumed-input/per-shard evidence as durable release assets, and retain no workflow-artifact authority.
- [x] Create **Release Promotion Admission** for the managed `devel` to `main` PR: runtime resolution of the numeric draft candidate followed by offline source/tree/parent, candidate-success, and version/tag checks only. Admission explicitly requires the matching completed candidate-state record and all required BDD evidence; every durable shard validates its asset name, payload schema, numeric candidate ID, release-set digest, sealed-state digest, and exact canonical matrix set; repository variables and workflow artifacts are not candidate authority.
- [x] Define concurrency groups so superseded PR/candidate test work cancels, while immutable staging, publication, and finalization cannot be cancelled after their protected point.
- [x] Apply pinned actions, least-privilege permissions, no credential persistence, cache trust separation, and fork-safe trigger handling.
- [x] Add policy tests proving no release build/full BDD exists in PR or admission workflows, TypeScript smoke needs no package build, offline verification has no GitHub/remote/build/pack/Docker/publication path, the PR uses explicit-base Biome linting, and no mutable candidate variable/artifact reference is accepted.
- [x] Gate external-fork pull requests: same-organization guards skip executable PR jobs, while the default-main `workflow_dispatch` path requires the `external-pr-code-owner-approval` environment and exact unchanged external head SHA before trusted checkout and restore-only validation.

## Acceptance Criteria

- Ordinary PRs never execute a release build or full BDD.
- A protected `devel` SHA creates one staged candidate and one curated BDD result against its single built output.
- `main` admission is impossible without exact proven candidate evidence.
- CI reruns either resume durable candidate state or fail closed on a conflicting/terminal state; they do not repeat completed build or BDD work.

## Validation Evidence

- Workflow policy tests: `node scripts/run-ava.js scripts/test/phase-4-workflow.spec.js scripts/test/workflow-inventory.spec.js scripts/test/release-pr-smoke.spec.js` (passed).
- PR-equivalent offline Phase 4 tests: `node scripts/run-ava.js scripts/test/phase-4-workflow.spec.js scripts/test/workflow-inventory.spec.js scripts/test/release-contract.spec.js scripts/test/release-phase4.spec.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-bdd-validation.spec.js scripts/test/release-bundle.spec.js scripts/test/release-pr-smoke.spec.js scripts/test/workflow-policy.spec.js` (passed; 50 tests).
- Release contract/candidate validation tests: `node scripts/run-ava.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-bdd-validation.spec.js scripts/test/release-bundle.spec.js` (passed; 19 tests).
- Workflow syntax/diff checks: `node -e "...js-yaml..."` for all four Phase 4 workflows, `node --check scripts/release-candidate-workflow.js`, and `git diff --check` (passed).
- TypeScript smoke: `node node_modules/tsx/dist/cli.mjs scripts/release-risk-smoke.ts bdd` (passed).
- Fail-closed runtime boundary: deterministic `locate` returns `not-found` only for an explicit remote 404; `resolve` requires numeric release ID, release-set digest, and sealed-state digest. Generic adapter errors propagate.
- Durable BDD admission fixtures cover a complete canonical matrix, stale/different-candidate success evidence, duplicate/missing/unexpected shards, payload/schema mismatch, and asset-name mismatch; all are offline tests.
- Strict shard admission focused suite: `node scripts/run-ava.js scripts/test/release-phase4.spec.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/phase-4-workflow.spec.js scripts/test/release-bdd-validation.spec.js` (passed; 15 tests).
- Runtime persistence correction suite: the affected Phase 4 subset passed (13 tests), including exact canonical `bdd-evidence/<shard>.json` paths, payload/path identity, duplicate rejection, and undefined-name rejection.
- PR lint: `RAYON_NUM_THREADS=12 ./node_modules/.bin/biome lint --changed --since=7b1b9eff11dc99c825fc660906a212b285bd3d0e --error-on-warnings --no-errors-on-unmatched` (passed).
- Local-first evidence: the offline workflow module contains planning, bundle/state/seal verification, and admission evaluation only; the runtime module is the sole protected GitHub/ref/staging boundary. Durable candidate-seal, candidate-success, and BDD shard assets are the admission inputs; tags are routing only. No live protected `devel` candidate/admission rehearsal is claimed locally.
- External-fork gate evidence: `.github/CODEOWNERS` assigns `*` to `@scramjetorg/owners`; local metadata/policy fixtures cover open unchanged external heads, same-org rejection, missing approval environment, trusted workflow presence, and all three PR/security workflow guards. Strict zero-execution enforcement additionally depends on the remote Actions setting that disables all fork workflow runs; the manual workflow is usable only after it exists on default `main`.
- Required remote environment: configure `external-pr-code-owner-approval` with required reviewer `@scramjetorg/owners`; disable self-review prevention so any owners-team member may approve their own manually dispatched run while working alone. The environment and reviewer rule must exist remotely before use.
- External-fork gate focused suite: `node scripts/run-ava.js scripts/test/external-pr-metadata.spec.js scripts/test/workflow-policy.spec.js scripts/test/workflow-inventory.spec.js scripts/test/phase-4-workflow.spec.js` (passed; 34 tests); local workflow policy check, source syntax, YAML, and diff checks also passed.
