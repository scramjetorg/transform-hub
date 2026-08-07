# CI and release operations

This is the repository-level operating map for the active CI and release
paths. It does not assert that GitHub, npm, GHCR, or organization controls are
configured. Production npm operator actions remain in
[RELEASE_PUBLISHING_OPERATIONS.md](RELEASE_PUBLISHING_OPERATIONS.md); security
enforcement limits remain in [SECURITY.md](SECURITY.md); checkpoint identity and
digest requirements remain in [CHECKPOINTS.md](CHECKPOINTS.md).

## Active workflow and trigger inventory

The final workflow-file audit found exactly these eight active workflow files.
Legacy Node 18/Yarn reusable workflows and the legacy Docker Hub publisher were
removed; `security-check.yml` is retained.

| Workflow | Trigger | Stable check/job names | Purpose |
| --- | --- | --- | --- |
| `pr-validate.yml` | PRs to `main`, `devel`, or `release/**`; merge queue | `CI / fast gates`, `CI / AVA`, `CI / package build`, `CI / BDD Node`, `CI / BDD Python`, `CI / BDD API`, `CI / durable legacy BDD coverage` | Fork-safe, read-only validation. The durable coverage job owns former hub, API-topic, unified JS/Python, and process-adapter coverage. |
| `security-check.yml` | PR, merge queue, pushes to trusted branches, weekly schedule | `Security / repository policy` | Redacted history scanning and repository policy defense in depth. |
| `devel-validate.yml` | Push to `devel` | `Devel / fast gates` | Same-repository devel fast-gates-only validation: lockfile reproducibility, setup-workspace, security workflow policy, lint, typecheck, release alignment, runtime invariants, and license validation. No package build, package tests, Bun setup, or BDD runs. |
| `devel-bdd-image.yml` | Same-repository push to `devel` | `Devel / publish BDD Node image` | Publishes the `Dockerfile.bdd-bun` image to GHCR under the exact devel source-SHA tag with BuildKit provenance/SBOM and a GitHub artifact attestation for the pushed digest. |
| `checkpoint-bootstrap.yml` | Manual trusted-branch selection (`main`, `devel`, or `feat/manager-oss`) | `Checkpoint / trusted publication` | Trusted immutable checkpoint publication and pointer promotion; it fails closed when GHCR publication configuration is absent. |
| `release-pr-automation.yml` | Successful same-repository `Devel validation` push | `Release PR / automation` | Creates or updates the managed `devel` to `main` PR. Merging remains an explicit manual operation after required checks; automation never requests auto-merge or an admin bypass. |
| `release-pr-validate.yml` | PR to `main`; jobs guard same-repository `devel` to `main` | `Release PR / package validation`, `Release PR / prerelease publication`, `Release PR / prerelease BDD` | Exact prerelease identity, package, and BDD validation path. `prerelease-publication` awaits approval on the `github-packages-prerelease` environment; `prerelease-bdd` stays unattended and read-only. |
| `main-release.yml` | Push to `main` | `Release / boundary validation`, `Release / npm publish`, `Release / checkpoint promotion` | Protected production npm release and publication-gated checkpoint decision. |

### Audit outcome and intentional overlap

`pr-validate.yml` owns normal PR and merge-queue validation, including
`release/**` PRs. `release-pr-validate.yml` adds the narrower trusted
`devel`→`main` prerelease/release gate; it does not replace general PR checks.
`security-check.yml` intentionally overlaps all paths because it is
defense-in-depth and must remain independently visible. No deleted workflow has
a remaining caller. Automatic Devel checkpoint promotion is disabled: the former
`devel-checkpoint-promotion.yml` workflow was removed and Devel validation is
fast-gates-only, so a devel push can no longer trigger checkpoint publication or
pointer promotion. Devel checkpoint publication remains available only as an
explicit manual operation through `checkpoint-bootstrap.yml`. Docker Hub image
publication is **deferred to a follow-up track** and is not an active workflow or
release handoff.

## Handoffs, identities, and artifacts

- PR and merge-queue outputs are disposable: no cache, artifact, image, package,
  credential, or promotion capability crosses from untrusted code.
- Release-PR prerelease publication emits a canonical manifest/checksum through
  trusted same-workflow job outputs. The BDD job accepts exact package versions,
  validated npm SRI/SHA-256 metadata where available, a generated install lock,
  and verified image digests only. It does not consume ranges, dist-tags, or
  workflow artifacts. Source/public identities remain `@scramjet/*`; the
  prerelease manifest maps every included source package to its repository-owned
  GitHub Packages identity `@scramjetorg/<unscoped-name>`. Its staged manifests,
  first-party dependency declarations, compiled JavaScript, and declarations are
  rewritten only for that prerelease package graph. Public npm release manifests
  and `@scramjet/*` production publication are unchanged.
- The `prerelease-publication` job is bound to the `github-packages-prerelease`
  environment and awaits environment approval before publishing anything. The
  environment carries **no secrets**; it holds only the
  `SCRAMJET_RELEASE_PRERELEASE_PUBLISH=true` and
  `SCRAMJET_GH_PACKAGES_PRERELEASE_PUBLISHER=github-packages` configuration
  variables that gate live publication and is restricted to `refs/pull/*/merge`.
  The `prerelease-bdd` job is deliberately **not** bound to the environment: it
  only consumes verified prereleases and must never block on approval.
- Prerelease npm authentication uses the automatic GitHub token only
  (`${{ github.token }}`, equivalent to `GITHUB_TOKEN`), never a PAT or npm
  token secret. The publication job authenticates with its `packages: write`
  scope and the BDD job with its `packages: read` scope, so least privilege is
  preserved by the job permissions rather than by token selection. Both jobs
  route only `@scramjetorg` to `https://npm.pkg.github.com`; unscoped and
  external dependencies retain npm's default registry routing. BDD aliases its
  source `@scramjet/*` imports only after exact mapped-package lock, tarball,
  integrity, and installed-package identity verification.
- A trusted `devel` push publishes `ghcr.io/scramjetorg/transform-hub/bdd-node`
  under `devel-<full-source-sha>`, then creates a GitHub artifact attestation for
  the pushed digest. Release-PR BDD resolves that tag once with its read-only
  automatic token, verifies its attestation against the repository, exact devel
  source SHA/ref, signer workflow, SLSA provenance predicate, and GitHub-hosted
  runner policy, then converts the verified digest to a `@sha256` image reference.
  A tag repointed to an unrelated digest fails before BDD starts. The repository
  variable `SCRAMJET_RELEASE_PRERELEASE_BDD=true` remains the explicit enablement
  gate; no operator-managed image digest/JSON variable exists.
- Production `main` publication creates an immutable release identity containing
  source/package/toolchain information. Existing npm versions may be reused only
  when their published release identity and final package checksum match exactly.
  A partial publication must never be resolved by republishing an immutable npm
  version.
- Checkpoint planning is dry-run, but trusted checkpoint publication and
  promotion are live, digest-first paths that fail closed when required GHCR
  configuration is absent. Consume only immutable `@sha256` image references
  after identity/statement/label verification; a missing or mismatched
  checkpoint uses clean `npm ci`.
  [CHECKPOINTS.md](CHECKPOINTS.md) is authoritative for checkpoint labels,
  pointers, retention, and live guarded GHCR publication and pointer promotion.
- Do not upload release manifests, secrets, scanner findings, `node_modules`, or
  mutable Docker image archives as a handoff. Persist auditable release evidence
  in the GitHub run and trusted registry metadata instead.

## Setup, ownership, and recovery

All maintained paths use GitHub-hosted Node 22 and npm. Local composite setup
requires caller checkout of an explicit SHA, sets `persist-credentials: false`,
and performs clean `npm ci`; no path uses Yarn. Release administrators own npm
trusted-publisher registration, the protected `production` environment, and
production recovery. CI security administrators own action pin review,
workflow-policy maintenance, and required-workflow/ruleset administration.
Package maintainers own release-boundary changes and version alignment review.

For failed production publication, approval, OIDC, checksum, or checkpoint
decisions: stop, preserve the run URL/source SHA/identity/package status, correct
the remote control under change management, and retry only after exact immutable
identity verification. Follow the detailed recovery procedures in
[RELEASE_PUBLISHING_OPERATIONS.md](RELEASE_PUBLISHING_OPERATIONS.md) and never
substitute a long-lived token or mutable tag. For suspected credential exposure
or scanner bypass, follow [SECURITY.md](SECURITY.md).

## Remote-only validation and prerequisites

The repository cannot prove GitHub required workflows/rulesets, protected
environment approvals (including the `github-packages-prerelease` approval on
`Release PR / prerelease publication` and the `production` environment), npm
trusted publishers/OIDC, GHCR scoped publishers,
registry retention, Docker Hub credentials, Actionlint, or Zizmor. Operators
must validate those controls in their respective services before enabling live
publication. Docker Hub image release design, credential scope, and
published-npm-package image construction remain explicitly deferred; do not
restore the removed legacy Docker Hub publisher as a workaround.
