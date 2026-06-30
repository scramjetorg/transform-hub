# Outcome: Clean verser2 GitHub token override from public surface

## Summary

Chore/cleanup track removing verser2-specific GitHub Packages token authentication requirements and public-facing token guidance. Single phase completed and approved.

## Key Changes

- **Removed root GitHub Packages registry override**: deleted `@signicode` registry/token override from root `.npmrc` (or equivalent npm config).
- **Removed token forwarding from build**: `scripts/build-all.js` no longer injects `NODE_AUTH_TOKEN` for verser2 packages.
- **Removed token fallback from Python install**: `packages/runner-python/scripts/install-deps.sh` no longer uses `GITHUB_PACKAGES_TOKEN` fallback.
- **Updated verser2 package checker**: `scripts/check-verser2-github-packages.js` replaced with unauthenticated public npmjs resolution check.
- **Updated dependencies**: active `@signicode/verser2-*` dependencies refreshed to `0.4.2` resolving from `registry.npmjs.org` (public) rather than GitHub Packages.
- **Cleaned `.env.example`**: removed `GITHUB_PACKAGES_TOKEN` placeholder.
- **Preserved internal recovery notes**: `conductor/known-solutions.md` retains generic private GitHub Packages recovery pattern (no verser2-specific setup).

## Validation Summary

| Check | Result |
|---|---|
| `npm run check:verser2-packages` (no token override) | Passed |
| Script syntax checks (`node -c`, `bash -n`) | Passed |
| `npm install --package-lock-only --ignore-scripts --dry-run` (no token) | Passed |
| `npm run lint` | Passed |
| `npm run build:packages` | Passed (dist workspace install without GitHub Packages auth) |
| Stale-reference scan for token guidance | No remaining public verser2-specific token guidance |

## Deferred / Out of Scope

- Publishing verser2 to npmjs (not changed by this track)
- Upgrading verser2 beyond the current active target
- Removing the reusable GitHub Packages helper (preserved for future private packages)
- Changing runtime, routing, or communication behavior

## Final State

Single phase completed and manually approved. Verser2 packages resolve from public npmjs without requiring token configuration. Internal helper and known-solution recovery notes preserved for future private package needs.
