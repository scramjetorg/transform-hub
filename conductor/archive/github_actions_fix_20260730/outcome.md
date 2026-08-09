# Outcome: GitHub Actions Fix (Node 22 / npm CI Replacement)

## Summary

Track completed via PR #1078, merged at `b35c6bc41a38559d88c1a0335d4a0541319c19d1`, with post-merge hardening commits `be14b5f6a` (reviewed historical Gitleaks fingerprints) and `c3cd50c5f` (Bun provisioning for package-test workflows).

The track replaced the repository's non-working, Node 18/Yarn legacy GitHub Actions suite with a lean, Node.js 22-only, npm-only CI and release suite: protected fast gates, isolated AVA/build/BDD jobs, trusted GHCR checkpoint modeling, devel validation and release-PR automation, GitHub Packages prerelease validation, protected main npm OIDC publication, and a public-repository security baseline (Gitleaks hooks + workflow-policy CI).

## What Was Done

### Node 22 / npm CI

- Replaced the legacy suite: 15 legacy workflows inventoried, 12 replaced and 3 removed; 8 deliberate replacement workflows retained after final audit.
- Added `.github/actions/setup-workspace` with immutable checkout/setup-node pins, Node 22 verification, trusted-only npm cache opt-in, and clean `npm ci` (10 focused AVA tests).
- Implemented `pr-validate.yml` (PR/merge-queue validation) with ordered fast gates (mergeability, secret/workflow-policy scan, lint, typecheck, dependency/release alignment, runtime invariants, license), then isolated AVA, package-build, and Node/Python/API Docker BDD jobs — read-only permissions, no `pull_request_target`, no untrusted artifact handoff (6 focused tests).
- Implemented `devel-validate.yml` with trusted devel-only build and parallel AVA/BDD fan-out, and managed `devel` → `main` PR creation/update with auto-merge eligibility that cannot bypass branch protection (11 focused devel-promotion/automation tests).
- Post-merge hardening: `c3cd50c5f` provisions Bun (`oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6`, `bun-version: "1"`) in the devel and release-PR package-test workflows so AVA package tests that spawn `bun` (e.g. `runner/test/executor/bun-process-executor.spec.ts`) run correctly; focused workflow tests (9) and `npm run check:security-workflow` pass.

### Security policy and hooks

- Selected Gitleaks, Actionlint, Zizmor, and a deterministic workflow-policy checker; recorded in `conductor/tech-stack.md` before implementation.
- Added checked-in `.githooks/pre-push` (fail-closed outgoing-ref secret scanning), verified Gitleaks v8.21.2 artifact hashes, a reviewed empty allowlist, install/bootstrap commands, and `SECURITY.md` (7 focused tests).
- Added the Node 22/npm `Security / repository policy` required CI check with redacted history scanning (12 focused tests, `npm run test:security-ci`).
- Post-merge hardening: `be14b5f6a` reviewed the historical Gitleaks findings and permitted the reviewed set, closing the migration history scan.

### Checkpoint and release workflows

- Added GHCR checkpoint planning/consumption for `main`, `devel`, and `feat/manager-oss`: immutable `cp-v1-<identity-digest>` identity, digest-only consumption, stale-pointer rejection, bootstrap restricted to the three trusted branches, and cache-only content (`/opt/transform-hub/npm-cache`, no `node_modules`/`.npmrc`/credentials) — documented in `CHECKPOINTS.md`; live GHCR publication remains a documented credential-gated remote operation.
- Added constrained `release-pr-validate.yml` for same-repository `devel` → `main` PRs: clean pinned checkout, full build, serial package tests, deterministic GitHub Packages prerelease planning/publication with exact scoped versions and manifest checksums, and BDD against the exact verified prerelease manifest (2 focused tests plus 8 focused prerelease tests).
- Added the protected `main` npm OIDC publication workflow with production environment isolation, identity/checksum idempotency, non-cancellable concurrency, and publication-gated checkpoint decisions (5 focused tests); documented per-package trusted-publisher setup in `RELEASE_PUBLISHING_OPERATIONS.md` and the full contract in `CI_RELEASE_OPERATIONS.md`.

## Validation

Validation evidence recorded during the track (from `plan.md`):

- `npm run test:workflow-policy` — 22 AVA fixtures passed.
- `npm run check:workflow-policy` and `git diff --check` — passed.
- Security/checkpoint/workflow-policy suite — 79 focused tests passed.
- Typecheck across release packages, release-alignment check, runtime invariants — passed.
- Lint — passed with 38 pre-existing warnings.
- Final phase proof: 28 focused release/checkpoint tests passed, plus typecheck, release alignment, runtime invariants, and lint.

Required memory guard record:

- `SCRAMJET_BDD_MEMORY_GUARD=1 npm run test:bdd-ci-node` — passed. Parent heap threshold 524288 bytes (default) with documented E2E-001 allowance 856064 bytes; child process RSS threshold 209715200 bytes; Docker container working-set threshold 1073741824 bytes; no skips.

Post-merge checks:

- PR #1078 merged at `b35c6bc41a38559d88c1a0335d4a0541319c19d1`.
- Post-merge hardening `be14b5f6a` (reviewed historical Gitleaks fingerprints) and `c3cd50c5f` (Bun provisioning) verified on the current branch (HEAD at `c3cd50c5f`).
- Focused workflow tests `scripts/test/devel-validate-workflow.spec.js` and `scripts/test/release-pr-validate-workflow.spec.js` — 9 tests passed via the supported AVA runner; `npm run check:security-workflow` — passed.

## Deferred Follow-ups

- Remote Actionlint execution and remote Zizmor GitHub Actions security analysis — external prerequisites, not run locally.
- Live GHCR checkpoint publication and protected npm OIDC publication — gated on scoped remote publisher credentials and protected environment configuration.
- Organization required security workflow and repository ruleset enforcement — remote-only.
- Docker Hub image publishing — deferred to a follow-up track (`docker-hub-post-npm-release-images` in `td.md`).

## Important Commits

- `b35c6bc41a38559d88c1a0335d4a0541319c19d1` — merge of PR #1078 (track completion).
- `be14b5f6a` — fix(security): allow reviewed historical findings (post-merge hardening).
- `c3cd50c5f` — fix(ci): provision Bun for package tests (post-merge hardening).
- Phase checkpoints pushed from the track branch: `b962ba3b`, `e9b51d31`, `1dbe374a`, `7ed1c03d`, `b809116c`, `9f773430`; final checkpoint `9f773430`.

## Final State

The track is complete and archived on 2026-08-03. All supporting track records remain preserved under `conductor/archive/github_actions_fix_20260730/`; `plan.md` was intentionally removed at user request, and this outcome document preserves the final completion and validation record.
