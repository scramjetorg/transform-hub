# Phase 4 — Candidate and Admission Workflows

## Outcome

New fast PR, trusted candidate, reusable validation, and admission-only workflows enforce the target promotion model.

## Tasks

- [x] Create **PR Fast Validation** for `pull_request` to `devel`: lockfile/security/static gates, affected unit tests, and configured risk-area TypeScript smoke tests only; smoke runs use `tsx` or explicit type-check-omitting Node execution and never execute a package/release build; cancel stale PR runs.
- [~] Move **Build Release Candidate** from protected `devel` pushes to the managed release-branch PR. Require same-repository managed `release/*` head ownership, `main` base, durable release-train record, and immutable `pull_request.head.sha`; fork and arbitrary same-repository PRs never receive candidate staging/write authority.
- [~] Make **Build Release Candidate** call **Curated Release Build Validation** through `workflow_call` after staging and before candidate-success attestation, passing the release-branch head SHA, PR identity, train-record digest, numeric release ID, release-set/sealed-state digests, candidate tag routing, and image digest. The callable re-downloads sealed durable assets, persists shard evidence, and candidate-success is persisted only after the required matrix completes successfully.
- [~] Rename and constrain **Curated Release Build Validation** reusable workflow call: claim/resume BDD only from the numeric candidate release bound to the managed PR head, verify immutable seal/staged tarballs, persist consumed-input/per-shard evidence as durable release assets, and retain no workflow-artifact authority.
- [~] Rework **Release Promotion Admission** for the managed release branch to `main` PR: require the recorded branch, PR number, head SHA/repository, base, and train-record digest; at admission, record the current `main` first parent after revalidating the PR. Prove the final candidate head is the final merge's second parent and the resulting tree is unchanged. A moved main base after admission or changed release-branch head requires a fresh candidate/BDD/admission cycle.
- [x] Define concurrency groups so superseded PR/candidate test work cancels, while immutable staging, publication, and finalization cannot be cancelled after their protected point.
- [x] Apply pinned actions, least-privilege permissions, no credential persistence, cache trust separation, and fork-safe trigger handling.
- [~] Update policy tests so ordinary PRs and admission jobs contain no release build/full BDD, while only a managed same-repository release-branch PR with a matching train record may execute candidate staging and curated BDD. Preserve offline verification, explicit-base Biome linting, and no mutable candidate variable/artifact reference.
- [x] Use GitHub's native external-contributor approval policy for executable pull-request jobs. Repository members' fork-based PRs run normally; external contributors must be approved through GitHub before executable jobs run.

## Acceptance Criteria

- Ordinary PRs never execute a release build or full BDD.
- One managed release-branch `pull_request.head.sha` creates one staged candidate and one curated BDD result against its single built output; ordinary, forked, and unrecorded PRs cannot stage a candidate.
- `main` admission is impossible without exact proven candidate evidence.
- CI reruns either resume durable candidate state or fail closed on a conflicting/terminal state; they do not repeat completed build or BDD work.

## Validation Evidence

- Workflow policy tests: `node scripts/run-ava.js scripts/test/release-workflow-policy.spec.js scripts/test/workflow-inventory.spec.js scripts/test/release-pr-smoke.spec.js` (passed).
- PR-equivalent offline Phase 4 tests: `node scripts/run-ava.js scripts/test/release-workflow-policy.spec.js scripts/test/workflow-inventory.spec.js scripts/test/release-contract.spec.js scripts/test/release-admission.spec.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-bdd-validation.spec.js scripts/test/release-bundle.spec.js scripts/test/release-pr-smoke.spec.js scripts/test/workflow-policy.spec.js` (passed; 50 tests).
- Release contract/candidate validation tests: `node scripts/run-ava.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-bdd-validation.spec.js scripts/test/release-bundle.spec.js` (passed; 19 tests).
- Workflow syntax/diff checks: `node -e "...js-yaml..."` for all four Phase 4 workflows, `node --check scripts/release-candidate-workflow.js`, and `git diff --check` (passed).
- TypeScript smoke: `node node_modules/tsx/dist/cli.mjs scripts/release-risk-smoke.ts bdd` (passed).
- Fail-closed runtime boundary: deterministic `locate` returns `not-found` only for an explicit remote 404; `resolve` requires numeric release ID, release-set digest, and sealed-state digest. Generic adapter errors propagate.
- Durable BDD admission fixtures cover a complete canonical matrix, stale/different-candidate success evidence, duplicate/missing/unexpected shards, payload/schema mismatch, and asset-name mismatch; all are offline tests.
- Strict shard admission focused suite: `node scripts/run-ava.js scripts/test/release-admission.spec.js scripts/test/github-release-candidate.spec.js scripts/test/release-candidate-assets.spec.js scripts/test/release-workflow-policy.spec.js scripts/test/release-bdd-validation.spec.js` (passed; 15 tests).
- Runtime persistence correction suite: the affected Phase 4 subset passed (13 tests), including exact canonical `bdd-evidence/<shard>.json` paths, payload/path identity, duplicate rejection, and undefined-name rejection.
- PR lint: `RAYON_NUM_THREADS=12 ./node_modules/.bin/biome lint --changed --since=7b1b9eff11dc99c825fc660906a212b285bd3d0e --error-on-warnings --no-errors-on-unmatched` (passed).
- Local-first evidence: the offline workflow module contains planning, bundle/state/seal verification, and admission evaluation only; the runtime module is the sole protected GitHub/ref/staging boundary. Durable candidate-seal, candidate-success, and BDD shard assets are the admission inputs; tags are routing only. No live managed release-branch candidate/admission rehearsal is claimed locally.
- External-contributor gate evidence: GitHub Actions is configured with the repository approval policy `all_external_contributors`; `.github/CODEOWNERS` assigns `*` to `@scramjetorg/owners`. Repository PR workflows contain no fork-owner execution guard, so GitHub's native policy—not a custom manual workflow—controls when external code executes.
- External-contributor policy must be configured in GitHub Actions to require approval for all external contributors; it is not representable in a repository workflow file.
- External-contributor focused suite: `node scripts/run-ava.js scripts/test/workflow-policy.spec.js scripts/test/workflow-inventory.spec.js`; local workflow policy check, source syntax, YAML, and diff checks cover the repository-side wiring.
- Candidate preflight dependency/order evidence: `scripts/release-candidate-runtime.js` now loads only Node built-ins and `scripts/lib/candidate-identity.js` before policy evaluation; build/GitHub/assets/BDD/admission modules are lazy operational imports. Focused tests cover blocked `glob` loading, missing-policy ordering, shared identity compatibility, moved-remote rejection, SHA-1 Git tree ID normalization into a SHA-256 identity digest, malformed Git tree output rejection, and preflight-before-build/no-install workflow ordering. No live candidate run was performed.
- Candidate preflight focused suite: `node scripts/run-ava.js scripts/test/release-candidate-runtime.spec.js scripts/test/release-bundle.spec.js scripts/test/github-release-candidate.spec.js scripts/test/release-admission.spec.js scripts/test/release-workflow-policy.spec.js` (previously passed; 22 tests); the affected runtime/workflow subset `node scripts/run-ava.js scripts/test/release-candidate-runtime.spec.js scripts/test/release-workflow-policy.spec.js` passed with 12 tests; JS/YAML syntax and `git diff --check` passed.
- Candidate build dependency correction: the protected build job runs `npm ci` after checkout and before candidate locate/plan/build, while preflight remains install-free; focused workflow ordering coverage was added. No staging or curated BDD dependency behavior changed.
- PR validation and security workflows no longer distinguish a fork repository owner. GitHub's native approval control admits external contributor jobs after approval while allowing repository members' fork-based PRs to run immediately. Devel and main push workflows do not declare an environment gate.
