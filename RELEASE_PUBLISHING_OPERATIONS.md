# Production npm release operations

This is an **operator runbook**, not evidence that any external setting below exists. Repository code cannot create npm trusted-publisher registrations, GitHub environments, organization rulesets, or npm package access controls.

This runbook covers production npm publishing. It is separate from GitHub Packages prereleases; see [CI_RELEASE_OPERATIONS.md](CI_RELEASE_OPERATIONS.md) for the environment-approved, automatic-GitHub-token GitHub Packages prerelease path.

## Current workflow status

`.github/workflows/main-release.yml` is implemented and is the only production
npm publication workflow. It remains fail-closed until operators configure the
required npm trusted-publisher registrations and `production` environment below;
its presence does not prove that those remote controls exist.

The trusted same-repository candidate workflow creates the draft GitHub Release
and its complete bundle before the merge/tag handoff. A candidate failure must
be fixed on the release branch and the incomplete draft replaced; never rebuild
or substitute tarballs during tag publication. If npm publication fails, rerun
the tag job using the already-published GitHub assets. A published version whose
identity or package checksum differs from the bundle fails closed. A rerun of
an old tag workflow uses its original workflow revision; changes merged later
cannot repair that rerun. Use a fresh protected-main recovery dispatch when the
reviewed recovery workflow is needed.

## Release boundary

The production set is `INCLUDED_PACKAGES` in [`scripts/lib/release-boundary.js`](scripts/lib/release-boundary.js), also represented by root `workspaces.release`. Do not infer it from `packages/*` or use a wildcard publisher registration. Each of these **38** packages requires a separate npm trusted-publisher registration:

```text
@scramjet/sth                         @scramjet/cli
@scramjet/manager                     @scramjet/multi-manager
@scramjet/host                        @scramjet/pre-runner
@scramjet/runner                      @scramjet/runner-node
@scramjet/runner-bun                  @scramjet/runner-python
@scramjet/api-client                  @scramjet/client-utils
@scramjet/sequence-test               @scramjet/config
@scramjet/rest-api2                   @scramjet/api-router
@scramjet/api-server                  @scramjet/api-types
@scramjet/runtime-types               @scramjet/sequence-types
@scramjet/types                       @scramjet/symbols
@scramjet/model                       @scramjet/utility
@scramjet/telemetry                   @scramjet/adapters
@scramjet/adapters-common             @scramjet/adapter-docker
@scramjet/adapter-kubernetes          @scramjet/adapter-process
@scramjet/load-check                  @scramjet/monitoring-server
@scramjet/obj-logger                  @scramjet/logger
@scramjet/module-loader               @scramjet/middleware-api-client
@scramjet/multi-manager-api-client
@scramjet/hub-state
```

`@scramjet/verser`, `@scramjet/bpmux`, `@scramjet/frame-stream`, and `scramjet-bdd` are explicitly excluded and must not be registered through this release path.

## Required npm trusted-publisher registrations

For **every individual package** above, an npm package administrator must add a GitHub Actions trusted publisher with these exact values:

| npm setting | Required value |
| --- | --- |
| Provider | GitHub Actions |
| GitHub owner | `scramjetorg` |
| Repository | `transform-hub` |
| Workflow filename | `main-release.yml` |
| Environment | `production` |
| Publishing access | Direct publishing allowed |
| Package | The individual package being registered |

The protected production workflow is `.github/workflows/main-release.yml`. Do
**not** register a temporary, renamed, reusable, pull-request, or prerelease
workflow. This document does not assert that any npm registration currently
exists.

Use npm trusted publishing/OIDC only: do not create an `NPM_TOKEN`, automation token, publish key, or repository secret as a substitute. Before enabling production publishing, operators must confirm every package is publishable as intended, owned by `@scramjet`, registered as above, and has no conflicting legacy publisher. Record the review in the release change record.

## Required GitHub remote controls

Create a repository environment named exactly `production` and attach it only to
the active `main-release.yml` publish job. Operators must:

1. Restrict deployment to protected production tag pushes (`vX.Y.Z`) and the explicit recovery exception: `workflow_dispatch` on protected `main` from the trusted repository. The workflow independently proves the dispatch SHA equals current `origin/main`, the historical tag commit is its ancestor, and the merged same-repository release PR head/tree matches the immutable bundle. Recovery is public-release-only and requires the recorded tag SHA, release ID, PR number, and manifest checksum; do not permit devel, feature branches, pull requests, or forks.
   Ordinary stable-tag pushes remain bound to the tag commit being exactly the current `origin/main` commit; the historical-ancestor exception applies only to recovery dispatches.
2. Require approval from the designated release-maintainers team before OIDC issuance. Require at least two reviewers where supported and prevent self-review.
3. Disable routine administrator/environment-protection bypass. Emergency bypass is an audited organization incident action, never a workflow input.
4. Keep npm credentials out of the environment; it gates short-lived OIDC and must not become a token vault.

Create or update a non-bypassable `main` ruleset that requires pull requests, current linear merges from `devel`, review with stale-approval dismissal, no force/direct pushes, and the organization-required security workflow. Require the candidate validation check on `release/**` PRs and the merge/release checks before accepting a stable release. Limit workflow, environment, and ruleset administration to CI security/release administrators. These are all external operator actions, not repository claims.

## Toolchain and OIDC contract

The production job must use GitHub-hosted Node **22** and npm **11** (11.19.0), run `npm ci` from the committed `package-lock.json`, and never use Yarn or an unlocked global install. Record exact `node --version` and `npm --version` in release evidence. Existing local setup policy is [`.github/actions/setup-workspace/action.yml`](.github/actions/setup-workspace/action.yml).

For candidate preparation, run release alignment before opening the release PR. These alignment commands are not part of public-asset recovery and must not be used to rebuild or replace an already-published release bundle. The package boundary and release-wave topology remain fixed. `check`, `dry-run`, and `apply` require an explicit stable SemVer version; for the 2.2.0 candidate-preparation example, run:

```bash
npm run release:align:check -- --release-version=2.2.0
npm run release:align:dry-run -- --release-version=2.2.0
npm run release:align:apply -- --release-version=2.2.0
```

`check`, `dry-run`, and `apply` treat the excluded BDD workspace as a dependency-only alignment target: all of its dependency sections update included-package ranges while its package identity and excluded/external dependencies remain unchanged. They also validate and update the Python runner build metadata. `apply-licenses` is version-independent and is run without `--release-version`: `npm run release:align:apply-licenses`. Relevant repository sources are [`scripts/lib/release-boundary.js`](scripts/lib/release-boundary.js) for the boundary, [`scripts/release-align.js`](scripts/release-align.js) for alignment/licensing, and [`scripts/build-all.js`](scripts/build-all.js) plus [`scripts/publish-order-dist-packages.js`](scripts/publish-order-dist-packages.js) for existing release build/package ordering.

Only the protected npm publish job may request `id-token: write`; all other jobs must remain read-only. Its token must meet this contract:

| Claim or context | Required value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Audience | `npm:registry.npmjs.org` |
| `repository` / `repository_owner` | `scramjetorg/transform-hub` / `scramjetorg` |
| Normal tag push `event_name` / `ref` / `ref_protected` | `push` / `refs/tags/vX.Y.Z` / `true` |
| Normal tag push `workflow_ref` | `scramjetorg/transform-hub/.github/workflows/main-release.yml@refs/tags/vX.Y.Z` |
| Recovery `event_name` / `ref` / `ref_protected` | `workflow_dispatch` / `refs/heads/main` / `true` |
| Recovery `workflow_ref` | `scramjetorg/transform-hub/.github/workflows/main-release.yml@refs/heads/main` |
| `sub` with the production environment | `repo:scramjetorg/transform-hub:environment:production` |

With an environment, GitHub uses the environment form of `sub`, not the ref form. Therefore the protected tag or protected-main recovery admission, the workflow's current-main/tag ancestry checks, merged-PR/tree binding, and mode-specific `workflow_ref` are jointly required. npm's registration constrains the provider/repository/workflow; GitHub controls enforce protected production approval. Operators must separately allow protected `main` in production environment eligibility for recovery; this repository does not prove that remote setting.

## Failure and recovery

1. Stop on a failed check, draft asset-list/binding/checksum mismatch, approval denial, OIDC/npm rejection, or package-order failure. Do not bypass controls or use a long-lived token.
2. Preserve the workflow URL, commit SHA, package list, exact Node/npm versions, package/version state, and error. Re-run alignment only when repairing a candidate before publication. Public-asset recovery requires no alignment, build, repack, or bootstrap repetition.
3. npm versions are immutable. Query every attempted `@scramjet/*@version` and reuse only a package whose published identity and final package checksum match the recorded manifest. Never unpublish/re-publish to force a retry.
4. For a partial release, retain the protected commit and repair only the operator/configuration fault after verifying all published packages. If the package boundary, lockfile, contents, or source SHA differ, create a new reviewed release version.
5. If candidate validation fails, fix the release branch and rerun it so the incomplete draft is replaced. For recovery after the release PR has merged, start a **new** run of the existing `main-release.yml` workflow on protected `main` (`workflow_dispatch`) with these exact inputs: `stable_tag`, `expected_tag_sha`, `release_id`, `release_pr`, and `expected_bundle_checksum`. Record the checksum from the immutable manifest's `outerChecksum` field (not a SHA of the manifest file). The workflow requires the dispatch SHA to equal current remote `main`, verifies the historical tag is its ancestor, and verifies the original public assets before npm. A rerun after `main` advances fails closed; start a new dispatch with the reviewed current workflow. Never alter/move the stable tag, redraft/recreate the release, or rebuild/substitute assets. Public release finalization is a no-op; npm versions are reused only on exact identity and package-checksum matches.
6. For OIDC, environment, ruleset, or npm registration issues, disable the production job/environment, correct the remote setting under change control, then retry. Treat unexpected publication or credential exposure as a security incident and follow [SECURITY.md](SECURITY.md).

The separate `@scramjet/hub-state@0.0.0` stub with the `bootstrap` dist-tag is
not a stable release, must not use the `latest` dist-tag, and must not occupy
stable version `2.3.0`. The bootstrap has been handled separately; do not repeat
it as part of this recovery.
