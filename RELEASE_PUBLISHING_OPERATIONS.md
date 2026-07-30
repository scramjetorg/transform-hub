# Production npm release operations

This is an **operator runbook**, not evidence that any external setting below exists. Repository code cannot create npm trusted-publisher registrations, GitHub environments, organization rulesets, or npm package access controls.

This runbook covers production npm publishing. It is separate from GitHub Packages prereleases and dependency checkpoints; see [CHECKPOINTS.md](CHECKPOINTS.md) for checkpoint identity and clean-install fallback rules.

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

The future protected production workflow must be `.github/workflows/main-release.yml`. Do **not** register a temporary, renamed, reusable, pull-request, or prerelease workflow. This document does not assert that this workflow or any npm registration currently exists.

Use npm trusted publishing/OIDC only: do not create an `NPM_TOKEN`, automation token, publish key, or repository secret as a substitute. Before enabling production publishing, operators must confirm every package is publishable as intended, owned by `@scramjet`, registered as above, and has no conflicting legacy publisher. Record the review in the release change record.

## Required GitHub remote controls

Create a repository environment named exactly `production` and attach it only to the future `main-release.yml` publish job. Operators must:

1. Restrict deployment branches/tags to protected `main` only. Do not permit `devel`, feature branches, pull requests, forks, or tags as alternatives.
2. Require approval from the designated release-maintainers team before OIDC issuance. Require at least two reviewers where supported and prevent self-review.
3. Disable routine administrator/environment-protection bypass. Emergency bypass is an audited organization incident action, never a workflow input.
4. Keep npm credentials out of the environment; it gates short-lived OIDC and must not become a token vault.

Create or update a non-bypassable `main` ruleset that requires pull requests, current linear merges from `devel`, review with stale-approval dismissal, no force/direct pushes, and the organization-required security workflow. Require the stable checks `Release PR / package validation` and `Release PR / prerelease BDD`; require the merge queue when enabled. Limit workflow, environment, and ruleset administration to CI security/release administrators. These are all external operator actions, not repository claims.

## Toolchain and OIDC contract

The production job must use GitHub-hosted Node **22** and npm **10**, run `npm ci` from the committed `package-lock.json`, and never use Yarn or an unlocked global install. Record exact `node --version` and `npm --version` in release evidence. Existing local setup policy is [`.github/actions/setup-workspace/action.yml`](.github/actions/setup-workspace/action.yml).

Run `node scripts/release-align.js check` before publishing. Relevant repository sources are [`scripts/lib/release-boundary.js`](scripts/lib/release-boundary.js) for the boundary, [`scripts/release-align.js`](scripts/release-align.js) for alignment/licensing, and [`scripts/build-all.js`](scripts/build-all.js) plus [`scripts/publish-order-dist-packages.js`](scripts/publish-order-dist-packages.js) for existing release build/package ordering.

Only the protected npm publish job may request `id-token: write`; all other jobs must remain read-only. Its token must meet this contract:

| Claim or context | Required value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Audience | `npm:registry.npmjs.org` |
| `repository` / `repository_owner` | `scramjetorg/transform-hub` / `scramjetorg` |
| `event_name` / `ref` / `ref_protected` | `push` / `refs/heads/main` / `true` |
| `workflow_ref` | `scramjetorg/transform-hub/.github/workflows/main-release.yml@refs/heads/main` |
| `sub` with the production environment | `repo:scramjetorg/transform-hub:environment:production` |

With an environment, GitHub uses the environment form of `sub`, not the ref form. Therefore `ref`, `workflow_ref`, and the environment's protected-main branch restriction are jointly required. npm's registration constrains the provider/repository/workflow; GitHub controls enforce protected-main approval.

## Failure and recovery

1. Stop on a failed check, approval denial, OIDC/npm rejection, checksum mismatch, or package-order failure. Do not bypass controls or use a long-lived token.
2. Preserve the workflow URL, commit SHA, package list, exact Node/npm versions, package/version state, and error. Re-run `node scripts/release-align.js check` before retrying.
3. npm versions are immutable. Query every attempted `@scramjet/*@version` and reuse only a package whose published identity and final package checksum match the recorded manifest. Never unpublish/re-publish to force a retry.
4. For a partial release, retain the protected commit and repair only the operator/configuration fault after verifying all published packages. If the package boundary, lockfile, contents, or source SHA differ, create a new reviewed release version.
5. For OIDC, environment, ruleset, or npm registration issues, disable the production job/environment, correct the remote setting under change control, then retry. Treat unexpected publication or credential exposure as a security incident and follow [SECURITY.md](SECURITY.md).

Checkpoint failure is never a reason to bypass release controls: follow the clean-install and immutable-identity requirements in [CHECKPOINTS.md](CHECKPOINTS.md).
