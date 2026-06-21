# Bugfix: Local @scramjet/* Resolution Falls Back to Public npm

| Field | Value |
|-------|-------|
| Title | Fix local @scramjet/* resolution falling back to public npm |
| Category | bugfix |
| Scope | package.json, npm workspace config |
| Breaking | no |

## Problem Statement

When the repo is built from source, local `@scramjet/*` packages should resolve from the workspace. In some environments, npm or yarn falls back to the public npm registry and installs outdated versions that do not match the current source tree.

## Current Behavior

- A developer runs `yarn install` or `npm install` and sees `@scramjet/api-client` pulled from npm instead of `packages/api-client`.
- Version mismatches between the local source and the published package cause runtime errors that are hard to trace.
- This happens most often when lockfiles are stale or when a package version is bumped locally but not yet published.

## Expected Behavior

- Local `@scramjet/*` packages always resolve from the workspace, never from the public registry.
- If a workspace member is missing, the install fails fast with a clear message instead of silently substituting an external version.

## Proposed Change

1. Ensure every `package.json` that depends on `@scramjet/*` uses workspace ranges (for example, `^1.1.0` where `1.1.0` matches the local version).
2. Add an `.npmrc` or `.yarnrc` entry that forces workspace resolution: `prefer-workspace-packages=true` for yarn, or ensure npm workspaces are correctly configured.
3. Add a CI check that greps lockfiles for `@scramjet` entries pointing to `https://registry.npmjs.org` and fails the build if any are found.

## Backwards Compatibility

No breaking changes. This only affects development builds from source. Published packages on npm are unaffected.

## Testing Plan

- Clean clone test: delete lockfile, run install, and verify every `@scramjet/*` path points into `packages/`.
- CI gate: a script that parses `yarn.lock` or `package-lock.json` and asserts zero external `@scramjet` resolutions.

## References

- Root `package.json` workspaces field
- `packages/*/package.json` dependency declarations
