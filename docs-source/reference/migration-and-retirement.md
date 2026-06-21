---
id: reference-migration-retirement
slug: /reference/migration-and-retirement
title: Documentation migration and retirement strategy
---

# Documentation migration and retirement strategy

This track supersedes the archived `api_docs_revamp_20260616` track. The archived track remains historical context only; its combined router/MCP/OpenAPI ambitions are not active guidance for this documentation platform.

## Current flows to replace

- Root `build:readme` runs `scripts/mk-readme.js`, which assembles package READMEs from `src/readme.mtpl` templates and `conf/readme-parts/` snippets.
- Root `build:docs` runs every package `build:docs` script through `scripts/run-script.js -w modules build:docs`, then regenerates CLI command Markdown with `dev cmdToMd` into `docs/cli/commands-description.md`.
- Package `build:docs` scripts currently invoke broad TypeDoc generation from `src/index.ts` into root-level `docs/<package>/` outputs.
- `docs/` currently mixes generated TypeDoc output with handwritten API, architecture, guide, read-more, and roadmap content.

## Replacement strategy

1. Establish `docs-source/` as handwritten source and `dist-docs/` as the generated export surface.
2. Add generator commands that copy/process prose content, emit sidebars and metadata, and validate frontmatter, links, headings, and drift.
3. Replace broad TypeDoc with curated reference generation from `docs-source/reference/curated-reference-allowlist.json`.
4. Generate root and package READMEs from `docs-source/readmes/` and shared partials, with link rebasing for each target context.
5. Keep CLI command reference generation from the live command model, but redirect output into `dist-docs/reference/cli/` and link from prose/README pages.
6. Generate API v2 documentation from `packages/rest-api2` definitions and keep v1 API documentation under a separate legacy area.
7. Remove stale generated `docs/` artifacts after their content is migrated, intentionally excluded, or replaced by `dist-docs` outputs.

## Retirement checkpoints

- Disable broad package TypeDoc generation after curated reference generation can fail on missing or accidental non-allowlisted entrypoints.
- Disable the old README template flow after the new README generator can reproduce required root/package README outputs.
- Delete stale generated docs only after confirming they are generated, not source material.
- Preserve or migrate handwritten `docs/` content into prose pages before removing old paths.

## Risks

- Package publishing may rely on current package README files; generated replacement READMEs must be present before publish workflows are changed.
- CLI reference generation depends on a working development CLI command model.
- Existing `docs/` contains a mix of generated and handwritten content, so cleanup must distinguish source from artifacts.
- TypeDoc dependency versions differ in Manager-related packages; curated reference generation should avoid inheriting broad per-package output assumptions.

## Current `docs/` disposition inventory

| Current path | Current role | Disposition | Target / notes | Removal phase |
| --- | --- | --- | --- | --- |
| `docs/adapters/` | Generated TypeDoc | Replace/delete | Curated adapter extension reference only if allowlisted. | Phase 4 |
| `docs/api-client/` | Generated TypeDoc | Replace/delete | `dist-docs/reference/typescript/api-client/` from allowlist. | Phase 4 |
| `docs/api-server/` | Generated TypeDoc | Replace/delete | API server internals excluded unless explicitly allowlisted later. | Phase 4 |
| `docs/cli/commands-description.md` | Generated CLI reference | Redirect | `dist-docs/reference/cli/` from live command model. | Phase 4 |
| `docs/cli/` TypeDoc files | Generated TypeDoc | Replace/delete | CLI prose plus generated command reference; TypeScript internals excluded unless allowlisted. | Phase 4 |
| `docs/client-utils/` | Generated TypeDoc | Replace/delete | Excluded unless API client docs need a curated client-utils reference. | Phase 4 |
| `docs/host/` | Generated TypeDoc | Replace/delete | Host internals excluded unless surfaced in implementer docs. | Phase 4 |
| `docs/load-check/`, `docs/logger/`, `docs/model/`, `docs/obj-logger/`, `docs/utility/` | Generated TypeDoc | Replace/delete | Excluded unless individual shared helpers are allowlisted later. | Phase 4 |
| `docs/middleware-api-client/`, `docs/multi-manager-api-client/` | Generated TypeDoc | Replace/delete | Consider curated client entries if Manager/MultiManager client docs require them. | Phase 4 |
| `docs/module-loader/`, `docs/monitoring-server/` | Generated TypeDoc without `.nojekyll` marker | Replace/delete | Treat as generated artifacts despite missing marker. | Phase 4 |
| `docs/runner/` | Generated TypeDoc | Replace/delete | Runner protocol docs should be prose/curated reference, not broad source docs. | Phase 4 |
| `docs/sth/`, `docs/sth-config/` | Generated TypeDoc | Replace/delete | Curated public startup/config reference where allowlisted. | Phase 4 |
| `docs/sth-constants/` | Stale generated TypeDoc | Delete | Orphan from renamed constants/symbols package. | Phase 1 or Phase 4 after confirmation |
| `docs/symbols/`, `docs/types/` | Generated TypeDoc | Replace/delete | Narrow curated shared contract references only. | Phase 4 |
| `docs/telemetry/`, `docs/verser/` | Generated TypeDoc | Replace/delete | Excluded unless explicitly documented as legacy/internal. | Phase 4 |
| `docs/api.md` | Handwritten API reference | Migrate | Split into v2 API docs and legacy v1 docs under `docs-source/api/`. | Phase 3 |
| `docs/architecture/` | Handwritten architecture | Migrate/retain temporarily | Move relevant runner/runtime architecture into `docs-source/development/` or `docs-source/sequences/`. | Phase 4 |
| `docs/guides/` | Handwritten deployment guides | Migrate | Move Kubernetes/Nomad/operator guidance into `docs-source/deployment/`. | Phase 1/4 |
| `docs/read-more/` | Handwritten how-to docs | Migrate | Move sequence, config, stream/API, and agentic usage docs into user/developer sections. | Phase 1/4 |
| `docs/roadmap/` | Handwritten proposals | Retain temporarily or archive | Keep as historical proposal material unless product docs need active excerpts. | Phase 4 |
