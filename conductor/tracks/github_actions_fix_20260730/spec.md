# GitHub Actions Replacement Specification

## Overview

Replace the repository's non-working GitHub Actions implementation with a lean,
Node.js 22-only CI and release suite. The suite must make repeatable test and
release paths fast by reusing safe, branch-specific dependency checkpoints while
preserving clean, reproducible installation and trusted publication boundaries.

## Functional Requirements

1. Inventory every existing `.github/workflows` workflow and explicitly decide
   whether it is replaced, retained, or removed; no legacy workflow may remain
   accidentally active.
2. Use currently supported GitHub Actions and Node.js 22 for every replacement
   workflow. CI must use npm rather than Yarn.
3. Provide a trusted GHCR checkpoint workflow for `main`, `devel`, and initially
   `feat/manager-oss`. A checkpoint must be immutable for its source revision,
   lockfile, Node/npm version, and platform; consumers must use a verified digest
   rather than a mutable branch tag.
4. Checkpoint content must accelerate a clean/reproducible dependency reinstall
   without treating `node_modules` as a portable or trusted build artifact. A
   branch pointer may advance only when it still represents the validated source
   revision.
5. Run pull-request validation from a fresh branch checkout prepared from the
   applicable checkpoint. Execute gates in this order: mergeability, lint,
   type checking, dependency/release alignment, runtime invariants, and license
   validation; AVA pre-build tests; package build; then BDD validation.
6. Run pull-request checks for merge-queue validation where repository settings
   require it. Fork-originating pull requests must receive no publish credentials
   and must not supply a cache, image, or artifact promoted by a trusted path.
7. On `devel`, reset each ephemeral runner workspace from its last valid
   checkpoint, build packages, run AVA and BDD in parallel in isolated jobs, and
   pin a new `devel` checkpoint only after the required validation succeeds.
8. Create or update the `devel` to `main` release pull request automatically and
   enable GitHub auto-merge. GitHub branch protection, required checks, and
   required reviews remain the authority for merging.
9. For a same-repository `devel` to `main` release pull request, use a clean
   checkout and run the full package build and non-BDD test suite. Publish a
   unique GitHub Packages prerelease, then build/install BDD dependencies from
   those exact prerelease packages and run BDD against them.
10. After a protected merge to `main`, publish release packages to npm through
    npm trusted publishing (OIDC) in a protected GitHub-hosted environment, then
    pin the validated `main` checkpoint. Publish only the repository's supported
    release boundary and preserve the existing dependency/image alignment rules.
11. Define a stable artifact contract for package and image inputs, including
    checksums or digests, version/dist-tag rules, and rerun/idempotency behavior.
12. Add public-repository security controls that detect credentials and other
    secrets before commit and in CI. Local Git hooks must make the safe path easy,
    while CI remains the non-bypassable enforcement point.

## Security and Operational Constraints

- Use least-privilege workflow permissions. `packages: write` is limited to the
  trusted GitHub Packages prerelease path; `id-token: write` is limited to the
  protected npm publication path.
- Do not use `pull_request_target` for untrusted code. Do not promote artifacts,
  caches, or images from fork pull requests into release or checkpoint paths.
- Pin third-party workflow actions to reviewed immutable revisions and establish
  a documented update process that keeps action revisions current. Do not expose
  credentials in workflow output, artifacts, caches, PR comments, or images.
- Use a maintained secret-scanning tool in pre-commit hooks and CI, with a narrow,
  reviewed false-positive process. Scan the relevant tracked history or change set
  during migration so currently committed secrets are not silently grandfathered.
- Treat Git hooks as developer feedback rather than a security boundary: protected
  CI checks must enforce secret scanning and workflow security policy before merge.
- Keep production publication non-cancellable and make per-ref CI concurrency
  cancel stale pull-request and `devel` runs without racing checkpoint pointers.
- Separate AVA and Docker-backed BDD work into jobs that maintain the repository's
  supported runners and memory constraints.
- The implementation must map every gate to an existing or newly added explicit
  npm/script command, including the currently unspecified typecheck and license
  commands.

## Acceptance Criteria

- The final workflow inventory identifies the disposition of every prior workflow
  and validates that only the intended replacement workflows can trigger.
- All replacement paths use Node.js 22 and npm; none run Yarn or Node.js 18.
- Checkpoint workflows create and consume immutable GHCR image digests for the
  three initial branch targets, with safe rebuild and pointer-update behavior.
- Pull requests execute the ordered fast gates, AVA, build, and BDD paths, with
  branch/ref concurrency and no privileged credentials for forks.
- A successful `devel` run performs parallel AVA/BDD validation and advances only
  the matching validated checkpoint.
- A `devel` to `main` release PR is created or updated automatically, uses GitHub
  auto-merge, publishes unique GitHub Packages prereleases, and proves those
  packages through BDD before merge eligibility.
- A protected `main` merge publishes through npm OIDC without a long-lived npm
  token and advances the matching immutable main checkpoint only on success.
- Secret scanning runs from the repository's configured Git hooks and as a required
  CI check; tests prove that representative secret patterns fail without leaking
  sensitive values into logs.
- Replacement workflows use reviewed immutable action revisions, minimal tokens,
  non-persistent checkout credentials, and no secrets in cache/image/artifact
  outputs.
- The resulting workflow suite documents its triggers, permissions, artifact
  handoffs, rerun behavior, and required repository/environment configuration.

## Out of Scope

- Adding new product test suites or checks beyond the named gates; additional
  checks may be added in a later track.
- Changing application/runtime behavior unrelated to CI, packaging, or release
  automation.
- Automating feature-branch pull-request creation or merging; this track only
  automates the `devel` to `main` release pull request and relies on GitHub
  auto-merge after repository protections are satisfied.
- Building a general security program beyond repository hooks, workflow hardening,
  and secret detection required for this public-repository CI migration.
