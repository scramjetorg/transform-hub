# CI and release operations

This is the repository-level operating map for the active CI and release
paths. It does not assert that GitHub, npm, or organization controls are
configured. Production npm operator actions remain in
[RELEASE_PUBLISHING_OPERATIONS.md](RELEASE_PUBLISHING_OPERATIONS.md); security
enforcement limits remain in [SECURITY.md](SECURITY.md).

## Active workflow and trigger inventory

The final workflow-file audit found exactly these seven active workflow files.
Legacy Node 18/Yarn reusable workflows and the legacy Docker Hub publisher were
removed; `security-check.yml` is retained.

| Workflow | Trigger | Stable check/job names | Purpose |
| --- | --- | --- | --- |
| `pr-validate.yml` | Pull requests to `main`, `devel`, or `release/**`; merge queue | CI validation jobs | Fork-safe read-only package, BDD, and admission validation. |
| `security-check.yml` | PR, merge queue, pushes to trusted branches, weekly schedule | `Security / repository policy` | Redacted history scanning and repository policy defense in depth. |
| `devel-validate.yml` | Push to `devel` | `Devel / fast gates` | Same-repository devel fast-gates-only validation: lockfile reproducibility, setup-workspace, security workflow policy, lint, typecheck, release alignment, runtime invariants, and license validation. No package build, package tests, Bun setup, or BDD runs. |
| `release-candidate.yml` | Same-repository `release/**` pull requests to `main` | `Release / candidate validation and draft` | Validates release candidates, builds production dist once, and maintains the immutable draft release bundle. |
| `release-merge.yml` | Push to `main` | `Complete stable release` | Resolves and verifies the merged release PR's draft bundle, reconstructs `devel`, and creates the tag only after binding checks. |
| `release-start.yml` | Manual dispatch on `devel` | `Start stable release` | Aligns the first `2.2.0-devel` baseline into `release/2.2.0` and opens the release PR. |
| `main-release.yml` | Push of `v*.*.*` tag | `Publish stable tag` | Publishes the already-verified GitHub tarballs to npm using protected OIDC; it never rebuilds or repacks. |

### Audit outcome and intentional overlap

The release handoff is deliberately linear: `release-start.yml` creates the
release branch and PR; the guarded `release-candidate.yml` builds dist once and
maintains a draft containing exactly `manifest.json`, `SHA256SUMS`, and 37
tarballs; `release-merge.yml` resolves the merged same-repository PR and verifies
the draft's version, branch, candidate head/tree, and main tree before tagging;
`main-release.yml` validates the draft manifest before making it public, then
downloads every asset into a clean directory, performs full embedded-identity
and checksum verification, and publishes only those tarballs.

### Concurrency semantics

Ordinary pull-request and merge-queue runs may cancel stale predecessors. The
same-repository candidate run serializes work per release PR and replaces the
draft assets for that release version, so an updated release head cannot leave
older assets in place. The merge workflow uses its `main` push concurrency group;
the tag workflow uses its tag-specific concurrency group. Neither release handoff
may be cancelled into a partially published npm operation.

## Handoffs, identities, and artifacts

- Ordinary CI outputs are disposable. No build directory, credential, or mutable
  package artifact is handed between unrelated jobs.
- The sole durable release handoff is the draft GitHub Release. Its asset set is
  exactly `manifest.json`, `SHA256SUMS`, and the 37 recorded package tarballs;
  extra, missing, duplicate, unsafe, or changed assets fail closed.
- The candidate workflow builds production dist once, records the release
  identity and package checksums, and replaces the draft asset set for the
  release PR. The merge workflow validates the draft version, branch, candidate
  PR head/tree, and resulting main tree before creating the stable tag.
- The tag workflow validates that binding before making the draft public, then
  downloads every public asset into a clean directory and verifies checksums and
  embedded package identity before npm publication. It publishes those exact
  tarballs in release-wave order, waiting 10 seconds only between waves.
  Existing npm versions are reused only when name, version, identity digest, and
  final package checksum match exactly; mismatches fail closed.
- Do not upload secrets, scanner findings, `node_modules`, or unrelated files as
  release assets. The manifest is the canonical source/package/toolchain record.

## Setup, ownership, and recovery

All maintained paths use GitHub-hosted Node 22 and npm. Local composite setup
requires caller checkout of an explicit SHA, sets `persist-credentials: false`,
and performs clean `npm ci`; no path uses Yarn. Ordinary PR source jobs pass
`cache-mode: restore-only`; trusted push and release jobs use
`cache-mode: read-write`. All caches contain npm tarballs only. Release
administrators own npm
trusted-publisher registration, the protected `production` environment, and
production recovery. CI security administrators own action pin review,
workflow-policy maintenance, and required-workflow/ruleset administration.
Package maintainers own release-boundary changes and version alignment review.

For failed production publication, approval, OIDC, or checksum
decisions: stop, preserve the run URL/source SHA/identity/package status, correct
the remote control under change management, and retry only after exact immutable
identity verification. Follow the detailed recovery procedures in
[RELEASE_PUBLISHING_OPERATIONS.md](RELEASE_PUBLISHING_OPERATIONS.md) and never
substitute a long-lived token or mutable tag. For suspected credential exposure
or scanner bypass, follow [SECURITY.md](SECURITY.md).

## Remote-only validation and prerequisites

The repository cannot prove GitHub required workflows/rulesets, protected
production-environment approvals, npm trusted publishers/OIDC configuration,
tag protection, registry retention, Actionlint, or Zizmor. Operators must
validate those controls in their respective services before enabling live
publication. The production environment must permit only the trusted tag release
workflow and require approval before OIDC issuance. The `main` ruleset must
require the release candidate and merge checks, and tag protection must prevent
unreviewed tag creation or movement. These remote controls complement the
workflow's explicit tag-to-main SHA and release-bundle binding checks.
