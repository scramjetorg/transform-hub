# CI and Release Contract

**Captured:** 2026-07-30  
**Status:** Phase 1 design record; later phases implement and test this contract.

## Required command mapping

| Ordered gate | Command / mechanism | Status |
| --- | --- | --- |
| Mergeability | GitHub required checks plus `pull_request` and `merge_group` workflow events | New workflow/repository configuration; no local command. |
| Lint | `npm run lint` | Existing and supported. |
| Type checking | `npm run typecheck` | Must be added as a root command using the repository's TypeScript solution build inputs; do not substitute the narrow `check:typings-split`. |
| Dependency and release alignment | `npm run release:align:check` | Existing; validates workspace, version, image, dependency, and license alignment. |
| License validation | `npm run release:align:check` | Existing command includes `checkLicenseState`; a `check:licenses` alias may make the check name explicit. |
| Runtime invariants | `npm run check:runtime-invariants` | Existing and supported. |
| AVA pre-build suite | `npm run test:packages-no-concurrent` | Existing CI-safe serial package test path; must run under npm/Node 22. |
| Package build | `npm run build:packages` | Existing package build path. |
| BDD validation | Targeted `npm run test:bdd-ci-node`, `npm run test:bdd-ci-python`, and `npm run test:bdd-ci-api-node` | Existing supported Docker-backed runners, isolated from AVA. |
| Release-PR non-BDD suite | `npm run test:packages-no-concurrent` after `npm run build:packages` | Existing, run from a clean same-repository `devel` → `main` checkout. |
| GitHub Packages prerelease | `npm run publish:prerelease` | New command/script required; it must publish unique versions only to `npm.pkg.github.com`. |
| BDD against prerelease | Release-PR workflow job | New workflow setup required to install exact published package versions and verify their manifest/digests. |
| Secret detection | `npm run check:secrets` plus pre-commit hook | New maintained scanner and integration required. |

`run-bdd-docker.js` defaults its BDD container to `node:22`; the host-side workflows must also use Node 22 and npm. Docker BDD resource defaults remain 1536m, 2 CPUs, and 600 seconds.

## Remote configuration baseline

`main` and `devel` currently require one PR review and resolved conversations, but both have strict required-status-check protection with an empty contexts list. Neither branch therefore enforces CI checks or has merge-queue configuration. Later workflow/repository configuration must make the stable replacement check names required and add `merge_group` coverage when merge queue is enabled.

## Boundaries and gaps

- No unified root typecheck command exists. The implementation must select a TypeScript solution-compatible no-emit command before adding it; a base `tsconfig` alone must not be assumed to cover packages.
- The existing release-alignment checker is the license source of truth, so duplicate license scanners are unnecessary.
- The current package publishing script targets public distribution; it has no GitHub Packages prerelease registry flow.
- No current secret scanner exists. The old scheduled Yarn audit is not a substitute.
- Local commands can validate scripts and workflow-policy fixtures; mergeability, required-check enforcement, protected environments, GHCR access, OIDC publication, and auto-merge require controlled remote validation.

## Selected security baseline

- **Gitleaks** is the secret scanner for redacted local and CI scans. Its checked-in tool manifest will pin release assets and SHA-256 values; its allowlist must be narrowly fingerprint/path scoped, justified, owned, and reviewed for expiry. No scan reports or SARIF files containing findings are uploaded.
- **Actionlint** validates workflow syntax and expression semantics. **Zizmor** audits GitHub Actions security posture. A small deterministic policy checker will enforce track-specific invariants that those tools do not fully cover, including action SHA pins, forbidden `pull_request_target`, permissions, credentials, and untrusted promotions.
- Local developer feedback uses a checked-in `.githooks/pre-push` hook and `npm run hooks:install`, not Husky, Lefthook, or Python `pre-commit`. The hook scans outgoing refs and fails closed if the verified scanner is unavailable; it is never the security boundary.
- CI is the enforcement boundary. The preferred non-bypassable fork-safe design is an organization **required workflow** sourced from a protected public policy repository and run through a pinned security image. It scans an untrusted PR merge ref as data only: no PR scripts, hooks, actions, Dockerfiles, packages, caches, artifacts, images, credentials, or promotion. The workflow uses read-only contents, `persist-credentials: false`, no secrets, packages write, or OIDC.
- `pull_request_target` is explicitly rejected because `spec.md` forbids it. PR-local scanner policy files are scanned as data but never control the current enforcement run; policy comes only from the protected policy repository. If required workflows are unavailable, a dedicated external GitHub App/check service is required rather than a repository-owned check as the sole security boundary.

Remote proof must include a fork canary PR that tries to alter/delete the gate, adds a synthetic secret, and introduces `pull_request_target`; it must remain blocked without leaking the fixture or granting credentials.

## Focused validation decision

A dedicated workflow-contract/security test surface is required. It will run Actionlint, Zizmor, and the deterministic policy checker against workflow fixtures, plus Gitleaks hook/CI fixtures that assert redaction and rejection. These tools and the required verified bootstrap are now documented in `conductor/tech-stack.md` before implementation; remote ruleset, GHCR, protected-environment, OIDC, and auto-merge checks remain explicitly remote-only.

## Provenance and artifact identity contract

Every trusted checkpoint, prerelease, and production release carries canonical `provenance/identity.v1.json` and `provenance/statement.v1.json` documents. Documents use RFC 8785 JSON canonicalization and `sha256:<lowercase hex>` over canonical UTF-8. Identity includes repository/source SHA, raw `package-lock.json` SHA-256, exact Node 22/npm versions, `linux/amd64` platform, and sorted source package name/version/manifest hashes. Statement binds that identity digest to OCI image digests, package tarball SHA-256 plus npm SRI, and named artifact checksums. Execution IDs and timestamps live only in a separate non-identity execution document.

Checkpoint images use immutable `cp-v1-<identity-digest>` discovery tags and may expose only mutable `cp-v1-main`, `cp-v1-devel`, and `cp-v1-feat-manager-oss` branch pointers. Consumers resolve a pointer once and then use `repository@sha256:...`, verifying its labels, embedded documents, source SHA, lock hash, Node/npm versions, and platform. Images may contain only npm cache/lock/toolchain metadata—not `node_modules`, credentials, package promotion artifacts, or fork origin. A branch pointer advances only after all validation and a final remote-HEAD/source-SHA comparison.

The trusted producer uploads a uniquely named provenance artifact with both documents and their checksum files; downstream jobs receive expected document and OCI digests as job outputs, verify them before use, and verify every listed artifact/package checksum. Same-repository release PR prereleases use exact unique versions (`<release>-rc.pr<PR>.run<run>.attempt<attempt>`), exact package manifests and install locks, and no dist-tag/range resolution. BDD installs those bytes cleanly via `npm ci`, verifies tarball hashes/SRI and image digests, and emits its consumed-input record.

Reruns may reuse only an existing immutable checkpoint or package when all identity/output checksums match. Partial or mismatched package/release publication fails closed. Fork PRs may read a public immutable checkpoint only after verification and can never publish/promote a checkpoint, artifact, package, image, pointer, or release output.

## Replacement workflow topology

| Workflow | Events | Stable checks / responsibility |
| --- | --- | --- |
| `pr-validate.yml` | `pull_request` targeting `main`/`devel`; `merge_group` | `CI / fast gates`, `CI / AVA`, `CI / package build`, `CI / BDD` |
| External required policy workflow | organization ruleset on PR/merge queue | `Security / required policy` from the protected policy repository |
| `devel-validate.yml` | protected push to `devel` | `Devel / fast gates`, `Devel / package build`, `Devel / AVA`, `Devel / BDD`, `Devel / checkpoint promotion` |
| `checkpoint-bootstrap.yml` | manual dispatch only | `Checkpoint / bootstrap` with enum-only branch selection (`main`, `devel`, `feat/manager-oss`) |
| `release-pr-validate.yml` | same-repository PR `devel` → `main` only | `Release PR / clean validation`, `Release PR / prerelease publish`, `Release PR / prerelease BDD` |
| `release-pr-automation.yml` | successful trusted `devel` validation | create/update one release PR and enable GitHub auto-merge without merge bypass |
| `main-release.yml` | protected push to `main` | `Release / npm publish`, `Release / checkpoint promotion` |
| `checkpoint-build.yml` | reusable workflow only | shared verified checkpoint build/verification/publish logic |

PR and merge-group checks run from fresh checkouts. A verified checkpoint may only seed an npm cache for a fresh `npm ci`; an identity/lock/toolchain/platform mismatch falls back to a clean install. Untrusted PR artifacts are disposable inside their run and cannot enter any checkpoint, prerelease, or release path. The required gates are mergeability, external security policy, ordered fast gates (lint, typecheck, release alignment, runtime invariants, license validation), AVA, package build, and isolated Docker-backed BDD.

Per-ref concurrency is `pr-<number>` and `merge-group-<head-sha>` with cancellation enabled; `devel-validation` is cancellable, while its serialized `checkpoint-pointer-devel` is not. Release-PR validation is cancellable per PR, but its publication group is serialized/non-cancellable. `main-production-release`, every checkpoint-pointer group, and bootstrap per branch are non-cancellable; each promotion rechecks the current trusted source SHA after acquiring its pointer lock.

### Event and ref eligibility

- PR validation covers `pull_request` to `main` and `devel`, and `merge_group` whenever merge queue is enabled. Forks are read-only and never receive publish/OIDC credentials or promoted handoffs.
- Devel validation runs only on protected pushes to `devel`; it performs isolated AVA/BDD fan-out and may advance only the matching current-SHA `devel` pointer.
- Release-PR validation and prerelease publication require `base.ref == main`, `head.ref == devel`, and `head.repo.full_name == github.repository`.
- Main publication runs only on a protected push to `main` and is non-cancellable after publication starts.
- Bootstrap accepts only `main`, `devel`, or `feat/manager-oss`; it resolves the remote branch head itself and accepts no arbitrary ref, image, source SHA, or repository override.

### Managed release-PR auto-merge

After a successful trusted `devel-validate` run for the current `devel` SHA, `release-pr-automation.yml` may create or update exactly the same-repository `devel` → `main` PR. A narrowly scoped GitHub App or token is limited to PR creation/update and enabling auto-merge; it has no merge-bypass permission. The workflow does not execute branch code. Auto-merge remains conditional on GitHub branch protection: required `Release PR / ...` and external security checks, review requirements, and resolved conversations must pass before GitHub merges. Missing auto-merge/repository settings or unmet protections are reported safely and do not change the target branch.

### Security operations policy

All third-party Actions, including security tools, are pinned to reviewed full commit SHAs with a comment naming the reviewed upstream release. Automated dependency-update PRs propose pin changes; designated CI-security owners review the upstream release, action source, permissions, and update the pin/fixture expectations together. `actions/checkout` always uses `persist-credentials: false`; PR/merge-group jobs use explicit read-only permissions, no secret interpolation, and no OIDC or package write permission.

Gitleaks runs redacted and writes no finding reports, caches, artifacts, PR comments, image layers, or logs containing candidate secrets. Actionlint/Zizmor/policy failures emit only sanitized paths/rule IDs. Caches contain only verified dependency cache content, are keyed by immutable identity, and are never restored/saved from a fork or promoted into trusted paths. Artifact/image consumers require expected checksums/digests before use.

False positives are allowed only through a narrowly scoped, reviewed policy-repository exception keyed by fingerprint/path or exact policy rule. Each exception records a rationale, owner/issue reference, and expiry/review date; no whole-rule, entropy-class, or broad-file-type suppressions are permitted. This repository's workflows, hooks, scanner configuration, and manifests receive CODEOWNERS protection as defense in depth, while the protected external required workflow remains the authoritative enforcement policy.

| Path | Contents | PRs | Packages | OIDC |
| --- | ---: | ---: | ---: | ---: |
| PR/merge-group CI | read | read | read only if required for public inputs | none |
| External security policy | read | none | none | none |
| Devel validation | read | none | read | none |
| GitHub Packages prerelease publisher | read | none | write | none |
| Release-PR automation | read | write | none | none |
| Main npm publication | read | none | none | write |
