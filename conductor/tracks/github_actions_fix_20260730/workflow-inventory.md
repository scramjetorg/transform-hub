# Legacy GitHub Actions Inventory

**Captured:** 2026-07-30  
**Scope:** every legacy workflow in `.github/workflows` (15 YAML files).

## Disposition matrix

| Workflow | Trigger / role | Disposition | Reason |
| --- | --- | --- | --- |
| `_main_sth-build-test-node-18.yml` | PR orchestrator; calls all build/test workflows | Replace | Node 18, mixed npm/Yarn, no least-privilege permissions or concurrency. |
| `analyze-code.yml` | Reusable lint | Replace | Node 18 and no permissions boundary. |
| `build-sth.yml` | Reusable package build and archive | Replace | Yarn, Node 18, unsigned artifact handoff. |
| `build-docker-sth.yml` | Reusable STH image build | Replace | Yarn, Node 18, tarball-image handoff. |
| `build-docker-runner-node.yml` | Reusable Node runner image build | Replace | Yarn, Node 18, tarball-image handoff. |
| `build-docker-runner-python.yml` | Reusable Python runner image build | Replace | Node 18 and tarball-image handoff. |
| `build-docker-prerunner.yml` | Reusable prerunner image build | Replace | Node 18 and tarball-image handoff. |
| `preinstall-deps.yml` | Orphaned reusable dependency install | Remove | No callers; caches `node_modules` keyed by `yarn.lock`. |
| `test-unit.yml` | Reusable package/AVA test | Replace | Yarn, Node 18, unverified artifact input. |
| `test-sequence-appcontext.yml` | Reusable AppContext test | Replace | Node 18 and no permissions boundary. |
| `test-bdd-process.yml` | Reusable process BDD test | Replace | Yarn, Node 18, unverified artifact input. |
| `test-bdd-docker.yml` | Reusable Docker BDD test | Replace | Yarn, Node 18, unverified image artifacts. |
| `release-test.yml` | Manual release smoke test | Remove | Node 18/Yarn, hard-coded runner paths, superseded by release-PR validation. |
| `publish-release.yml` | Manual Docker Hub/npm publication | Replace | Node 18, Docker Hub, long-lived npm/Docker tokens, no OIDC or scoped permissions. |
| `security-check.yml` | Scheduled Yarn audit | Remove | Not secret scanning; Node 18/Yarn, no required CI enforcement. |

No workflow is retained as-is. All replacement workflows must use Node 22 and npm.

## Trust and compatibility findings

- No legacy workflow declares `permissions:` or `concurrency:`.
- All use mutable action tags (principally `actions/*@v3`), not reviewed immutable revisions.
- No workflow uses `pull_request_target` (preserve this prohibition).
- No workflow has a `merge_group` trigger or fork-specific promotion barrier.
- There is no GHCR checkpoint implementation. Legacy builds exchange package/image tarballs without a digest contract; `preinstall-deps.yml` additionally treats `node_modules` as a cache artifact.
- `publish-release.yml` exposes the old trust boundary: `DOCKER_HUB_TOKEN` and `NPM_TOKEN` are used for a manual path; its replacement must use protected npm OIDC and restrict `id-token: write` to that job.
- No existing workflow performs maintained secret scanning; the scheduled `yarn audit` is insufficient and must not be retained as the security control.

## Replacement constraints

The replacement suite must provide immutable action pins, least privilege, non-persistent checkout credentials, per-ref cancellation for PR/devel paths, non-cancellable production publication, verified GHCR digest handoffs, and no promotion from forks. The detailed topology and exact command mapping are established by the remaining Phase 1 tasks.
