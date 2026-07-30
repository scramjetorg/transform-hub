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
| `devel-validate.yml` | Push to `devel` | `Devel / package build`, `Devel / AVA`, `Devel / BDD Node`, `Devel / BDD Python`, `Devel / BDD API` | Same-repository devel validation. |
| `devel-checkpoint-promotion.yml` | Successful `Devel validation` workflow run on same-repository `devel` | `Devel / checkpoint promotion` | Isolated, non-cancellable dry-run checkpoint promotion decision. |
| `checkpoint-bootstrap.yml` | Trusted branch push or manual trusted-branch selection | `Checkpoint / bootstrap` | Dry-run provenance/checkpoint plan only. |
| `release-pr-automation.yml` | Successful same-repository `Devel validation` push | `Release PR / automation` | Creates or updates the managed `devel` to `main` PR and requests auto-merge. |
| `release-pr-validate.yml` | PR to `main`; jobs guard same-repository `devel` to `main` | `Release PR / package validation`, `Release PR / prerelease publication`, `Release PR / prerelease BDD` | Exact prerelease identity, package, and BDD validation path. |
| `main-release.yml` | Push to `main` | `Release / boundary validation`, `Release / npm publish`, `Release / checkpoint promotion` | Protected production npm release and publication-gated checkpoint decision. |

### Audit outcome and intentional overlap

`pr-validate.yml` owns normal PR and merge-queue validation, including
`release/**` PRs. `release-pr-validate.yml` adds the narrower trusted
`devel`→`main` prerelease/release gate; it does not replace general PR checks.
`security-check.yml` intentionally overlaps all paths because it is
defense-in-depth and must remain independently visible. No deleted workflow has
a remaining caller. Docker Hub image publication is **deferred to a follow-up
track** and is not an active workflow or release handoff.

## Handoffs, identities, and artifacts

- PR and merge-queue outputs are disposable: no cache, artifact, image, package,
  credential, or promotion capability crosses from untrusted code.
- Release-PR prerelease publication emits a canonical manifest/checksum through
  trusted same-workflow job outputs. The BDD job accepts exact package versions,
  validated npm SRI/SHA-256 metadata where available, a generated install lock,
  and verified image digests only. It does not consume ranges, dist-tags, or
  workflow artifacts.
- Production `main` publication creates an immutable release identity containing
  source/package/toolchain information. Existing npm versions may be reused only
  when their published release identity and final package checksum match exactly.
  A partial publication must never be resolved by republishing an immutable npm
  version.
- Checkpoint bootstrap and promotion are digest-first and dry-run by default.
  Consume only immutable `@sha256` image references after identity/statement
  verification; a missing or mismatched checkpoint uses clean `npm ci`.
  [CHECKPOINTS.md](CHECKPOINTS.md) is authoritative for checkpoint labels,
  pointers, retention, and eventual GHCR publication.
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
environment approvals, npm trusted publishers/OIDC, GHCR scoped publishers,
registry retention, Docker Hub credentials, Actionlint, or Zizmor. Operators
must validate those controls in their respective services before enabling live
publication. Docker Hub image release design, credential scope, and
published-npm-package image construction remain explicitly deferred; do not
restore the removed legacy Docker Hub publisher as a workaround.
