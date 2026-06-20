# Outcome: API v2 Final Structure and Fluent Client

## Summary

Completed PR #17, `Finalize API v2 route tree and fluent client`, for the public REST API v2 structure.

The track made `RestAPI2RouteTree` the public v2 contract source of truth and finalized the Root → Space → Hub → Instance terminology, route hierarchy, route-set/router derivation, runtime bindings, OpenAPI verification, fluent clients, and coverage guards.

Final track branch: `conductor/api-v2-final-structure-client-20260620`.

## What Was Done

- Introduced the final public v2 route tree in `@scramjet/rest-api2`.
- Replaced public v2 Manager/Host terminology with Root/Space/Hub/Instance terminology across route contracts, route paths, tests, and docs.
- Removed public `/api/v2/managers/:managerId/...` v2 aliases from the route-tree surface.
- Wired Host, Manager, and MultiManager v2 runtime bindings to tree-derived route sets and resolvers.
- Added route-tree-backed fluent clients: `createRootClient()`, `createSpaceClient()`, `createHubClient()`, `createInstanceClient()`, and `createFluentClientFromRouteTreeNode()`.
- Strengthened runtime binding and fluent-client coverage guards in `@scramjet/api-router` and `@scramjet/rest-api2`.
- Inventoried tree-shaking candidates; user selected no removals.
- Updated public API docs and package READMEs for route tree, fluent clients, generic transport/client usage, and retained compatibility surfaces.
- Generated/refreshed codemaps for affected packages and updated `.slim/codemap.json`.
- Addressed Copilot review findings:
  - omitted opaque route keys from custom fluent client types,
  - honored provided manifests in fluent client factories,
  - added query schema coverage to `GET /api/v2/spaces`.

## Validation

Final validation recorded during the track included:

- `packages/api-router`: `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npm test` — passed, 47 tests.
- `packages/rest-api2`: `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" npm test` — passed, 33 tests after Copilot review fixes.
- Focused Host v2 route tests under memory guard — passed, 42 tests.
- Focused Manager v2 route tests under memory guard — passed, 11 tests.
- Focused MultiManager v2 route tests under memory guard — passed, 8 tests.
- Package build equivalent: `ulimit -v 1835008; NODE_OPTIONS="--max-old-space-size=1024" node scripts/build-all.js -v -w modules --ts-config tsconfig.build.json --no-install --no-distws` — passed.
- Focused `@scramjet/rest-api2` package build after Copilot fixes — passed.
- Focused source ESLint for changed API router/rest-api2/multi-manager source files — passed.
- `git diff --check` — passed.
- Expanded RestAPI2 OpenAPI verification — passed with 56 paths and no public `/api/v2/managers` / `:managerId` v2 paths.
- Public v2 terminology grep checks in `packages/` and `docs/` — passed.
- Codemap state check: `codemap.mjs changes --root ./` — no changes detected after codemap refresh.

## Deferred Follow-ups

- Standardize operation IDs across runtime binding metadata and manifest/OpenAPI/fluent clients.
- Derive fluent-client resolver prefixes directly from the route tree instead of hardcoding resolver path fragments in the builder.
- Convert generated OpenAPI paths from Express-style `:param` syntax to OpenAPI `{param}` syntax if/when output-format compatibility permits.
- Future migration tracks can decide whether to remove retained low-level or compatibility surfaces inventoried in Phase 6.

## Important Commits

- `bbf2f71c` — combined Phase 2/3 route tree and public terminology implementation.
- `c66707fd` — moved v2 health summaries into Manager/MultiManager owner methods.
- `41641a76` — strengthened v2 coverage guards.
- `fe873b73` — finalized Phase 7 documentation/OpenAPI/integration checkpoint.
- `e2b5f613` and `be20b49f` — refreshed repository codemaps.
- `1e8b1537` — addressed Copilot fluent-client review findings.

## Final State

The track is complete and archived. PR #17 is ready to merge into `feat/manager-oss` after this archive checkpoint is pushed.
