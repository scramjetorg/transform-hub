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
identity or package checksum differs from the bundle fails closed.

## Release boundary

The production set is `INCLUDED_PACKAGES` in [`scripts/lib/release-boundary.js`](scripts/lib/release-boundary.js), also represented by root `workspaces.release`. Do not infer it from `packages/*` or use a wildcard publisher registration. Each of these **37** packages requires a separate npm trusted-publisher registration:

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
| Package | The individual package being registered |

The protected production workflow is `.github/workflows/main-release.yml`. Do
**not** register a temporary, renamed, reusable, pull-request, or prerelease
workflow. This document does not assert that any npm registration currently
exists.

Use npm trusted publishing/OIDC only: do not create an `NPM_TOKEN`, automation token, publish key, or repository secret as a substitute. Before enabling production publishing, operators must confirm every package is publishable as intended, owned by `@scramjet`, registered as above, and has no conflicting legacy publisher. Record the review in the release change record.

## Required GitHub remote controls

Create a repository environment named exactly `production` and attach it only to
the active `main-release.yml` publish job. Operators must:

1. Restrict deployment to protected production tag pushes (`vX.Y.Z`) from the trusted repository. The workflow must independently prove that the tag commit equals `origin/main` and that the merged same-repository release PR head/tree matches the immutable bundle; do not permit devel, feature branches, pull requests, or forks.
2. Require approval from the designated release-maintainers team before OIDC issuance. Require at least two reviewers where supported and prevent self-review.
3. Disable routine administrator/environment-protection bypass. Emergency bypass is an audited organization incident action, never a workflow input.
4. Keep npm credentials out of the environment; it gates short-lived OIDC and must not become a token vault.

Create or update a non-bypassable `main` ruleset that requires pull requests, current linear merges from `devel`, review with stale-approval dismissal, no force/direct pushes, and the organization-required security workflow. Require the candidate validation check on `release/**` PRs and the merge/release checks before accepting a stable release. Limit workflow, environment, and ruleset administration to CI security/release administrators. These are all external operator actions, not repository claims.

## Toolchain and OIDC contract

The production job must use GitHub-hosted Node **22** and npm **11** (11.19.0), run `npm ci` from the committed `package-lock.json`, and never use Yarn or an unlocked global install. Record exact `node --version` and `npm --version` in release evidence. Existing local setup policy is [`.github/actions/setup-workspace/action.yml`](.github/actions/setup-workspace/action.yml).

Run release alignment before publishing. The package boundary and release-wave topology remain fixed. `check`, `dry-run`, and `apply` require an explicit stable SemVer version; for the 2.2.0 release, run:

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
| `event_name` / `ref` / `ref_protected` | `push` / `refs/tags/vX.Y.Z` / `true` |
| `workflow_ref` | `scramjetorg/transform-hub/.github/workflows/main-release.yml@refs/tags/vX.Y.Z` |
| `sub` with the production environment | `repo:scramjetorg/transform-hub:environment:production` |

With an environment, GitHub uses the environment form of `sub`, not the ref form. Therefore the protected tag, the workflow's tag-to-main SHA check, the merged-PR/tree binding, and the tag-triggered `workflow_ref` are jointly required. npm's registration constrains the provider/repository/workflow; GitHub controls enforce protected production approval.

## Failure and recovery

1. Stop on a failed check, draft asset-list/binding/checksum mismatch, approval denial, OIDC/npm rejection, or package-order failure. Do not bypass controls or use a long-lived token.
2. Preserve the workflow URL, commit SHA, package list, exact Node/npm versions, package/version state, and error. Re-run alignment with the same explicit `--release-version` before retrying.
3. npm versions are immutable. Query every attempted `@scramjet/*@version` and reuse only a package whose published identity and final package checksum match the recorded manifest. Never unpublish/re-publish to force a retry.
4. For a partial release, retain the protected commit and repair only the operator/configuration fault after verifying all published packages. If the package boundary, lockfile, contents, or source SHA differ, create a new reviewed release version.
5. If candidate validation fails, fix the release branch and rerun it so the incomplete draft is replaced. If npm publication fails after the draft is public, rerun the tag workflow using the existing GitHub assets; never rebuild or substitute tarballs. A published version with mismatched identity or checksum fails closed.
6. For OIDC, environment, ruleset, or npm registration issues, disable the production job/environment, correct the remote setting under change control, then retry. Treat unexpected publication or credential exposure as a security incident and follow [SECURITY.md](SECURITY.md).
