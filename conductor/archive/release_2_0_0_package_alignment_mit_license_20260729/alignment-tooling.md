# Release-Alignment Tooling Decision

## Decision

Replace the release-specific mutation path composed from
`add-to-packages-json.js`, `bump-dependencies-versions.sh`, and
`bump_docker_images.sh` with one Node-based command and a versioned,
machine-readable release boundary. The new command will have `check`,
`dry-run`, and `apply` modes and will be the only supported 2.0.0 alignment
path. Generic maintenance scripts may remain for unrelated historical use but
must not be invoked by the release command or release CI.

The implementation will keep all release-specific policy in one shared module:

- target version: `2.0.0`;
- a static allowlist of the included first-party package names from
  `inventory.md`;
- explicit exclusions: `@scramjet/verser`, `@scramjet/bpmux`,
  `@scramjet/frame-stream`, `@scramjet/runner-python`, and `scramjet-bdd`;
- permitted static image references in
  `packages/config/src/sth/image-config.ts`;
- root release metadata (`package.json` and lockfile) required by
  `.github/workflows/publish-release.yml`.

The command must only rewrite an internal dependency when **both** its
consumer and target are included. It must cover `dependencies`,
`devDependencies`, `peerDependencies`, and `optionalDependencies`; preserve
the existing range prefix where valid; and never rewrite `@signicode/*` or
other external dependencies. Excluded package manifests and their internal
ranges are invariants, not candidates for migration.

## Lockfile resolution boundary

The initial lockfile regeneration correctly exposed a resolver conflict:
`bdd/` and legacy `packages/verser/` retain `^1.1.0` dependencies by design,
but npm cannot satisfy those ranges from the now-local 2.0.0 workspaces and
tries to fetch unavailable historical registry versions. The approved
release-only resolution model is therefore:

1. make the npm-facing root `workspaces.packages` list explicit and contain
   only the release-boundary package directories;
2. retain the existing broad repository `modules` group for non-release
   scripts, but add a matching `release` group for release pack/build scripts;
3. make `prepack:pub`, `pack:pub`, and release publishing consume the release
   group/boundary only; and
4. teach `release-align check` and its fixtures to verify the workspace list,
   lockfile boundary, and release packing/publishing invariants.

This does not edit an excluded manifest or its dependency policy. It changes
only the npm release/install surface so a reproducible 2.0.0 lockfile can
resolve the included graph. A separate release lockfile or npm overrides was
rejected because it would either leave the primary root lock unresolved or
silently change excluded packages' effective dependencies.

## Why centralize

The old shell and JSON scripts each independently enumerate package files and
modify overlapping version/image state. They do not encode the release
boundary, skip private/upstream workspaces, or safely validate a rerun. The
shell dependency script uses a shared `temp.json`, while the Docker script
also targets generated and absent files. A single Node command can parse JSON
without text substitutions, compute a complete change plan before writing,
report drift deterministically, and use the same boundary for tests and CI.

## Required preservation and CI behavior

- The current `.github/workflows/release-test.yml` and
  `.github/workflows/publish-release.yml` exist but are legacy Yarn/Node-18
  release surfaces. The design record corrects the initial research claim that
  no workflows existed.
- `publish-release.yml` presently checks only root version and later calls the
  unscoped publish-order script. Phase 2 must add the alignment check to the
  preflight and update release tooling to npm-compatible commands. Publishing
  boundary hardening remains subject to the same included-package allowlist.
- `image-config.ts` is the source-of-truth static image configuration.
  Generated `dist` JavaScript and dynamic commit-tag Dockerfiles are not
  direct alignment-tool targets.
- After `apply`, regenerate `package-lock.json` using npm's lockfile-only
  workflow and verify excluded lockfile package entries remain unchanged.

## Test proof

Add AVA coverage under `scripts/test/` through `scripts/run-ava.js`, using
temporary fixture workspaces. Cover included package version/range alignment,
Manager-to-MultiManager 0.35.1 migration, image tags, dry-run purity,
idempotence, check-mode drift failures, and all exclusion/external-dependency
invariants. The tests will be invoked with the repository-supported runner,
not direct `npx ava`.
