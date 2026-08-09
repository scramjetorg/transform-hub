# Outcome: New Documentation Source, Curated Reference, and README Pipeline

## Summary

Complete documentation platform overhaul — supersedes the archived `api_docs_revamp_20260616` track. Created a prose-first `docs-source/` tree, replaced the old TypeDoc and Markdown-template README pipeline, and produced deterministic `dist-docs/` export for Docusaurus consumption. All 5 phases completed and manually approved.

## Key Deliverables

- **`docs-source/` structure** with folders for intro, transform-hub, manager, sequences, testing, CLI, API, deployment, development, reference, readmes, examples, and partials. Includes authoring conventions.
- **Prose documentation** covering Transform Hub, Manager, sequences, testing, CLI, deployment, development, and API/client usage.
- **Curated reference generation** from an explicit allowlist under `dist-docs/reference/typescript/`. Non-allowlisted internals cannot be exported.
- **README pipeline replacement**: `scripts/mk-readme.js` retired with deprecation fail-fast; generated root `README.md` and `packages/*/README.md` from `docs-source/readmes/` with context-specific link rebasing (repo, dist-docs, npm). README drift detection via `docs:check`.
- **API v2 docs** source-derived from `packages/rest-api2/src/routes.ts` via `parseAPIV2FromSource()`, covering root/space/hub/sequence/instance route nodes.
- **Legacy v1 API separation**: v1 docs under `docs-source/api/legacy/` and `dist-docs/reference/api/legacy/v1/`.
- **CLI reference generation** from `packages/cli/src/lib/commands/*.ts` + root options from `packages/cli/src/bin/index.ts`.
- **Old docs retirement**: old root-level `docs/` generated output removed; package `build:docs` scripts made safe no-op; legacy authored material archived under `docs-source/legacy-docs/`.
- **Full generator pipeline**: `docs:clean`, `docs:generate`, `docs:check`, and subcommands (`:content`, `:reference`, `:readmes`, `:api`). Output root configurable via `package.json`/`SCRAMJET_DOCS_OUTPUT_DIR` (env var takes precedence). Protected output root checks.
- **Complete `dist-docs/` export**: content, reference (TypeScript/CLI/API v2/legacy v1), readmes, sidebars, and `metadata.json`.

## Important Commits

| SHA | Message |
|---|---|
| `17cfd839` | `docs(conductor): Complete new docs phase 0` |
| `1e5b393d` | `docs(conductor): Complete new docs phase 1` |
| `d2c47f7d` | `docs(conductor): Complete new docs phase 2` |
| `37473fb3` | `docs(conductor): Complete new docs phase 3` |
| `93ef1da5` | `docs(conductor): Complete new docs phase 4` |

(Plus manual-verification push SHAs `d094ca95` and `499e1a58`.)

## Validation Summary

| Phase | Validation | Result |
|---|---|---|
| 0 | Allowlist schema validation (6 entries) | Passed |
| 1 | `docs:clean`, `docs:generate`, `docs:generate:content`, `docs:generate:reference`, `docs:check`; protected output root rejection (3 paths); package no-op scripts | Passed |
| 2 | `docs:generate`, `docs:check`, `docs:generate:readmes`, `build:readme` | Passed |
| 3 | `docs:generate`, `docs:check`, `docs:generate:api`, `docs:generate:readmes`; link check (77 files) | Passed |
| 4 | `docs:clean`, `docs:generate`, `docs:check`, `docs:generate:reference`; link check (79 files); legacy `docs/` absence check; TypeDoc-output grep check; `git diff --check`; endpoint override check | Passed |

## Deferred Follow-ups

- **Document API v2 client usage** (Phase 3 task, unstarted) — prose coverage of `createRestAPI2Client()`, fluent clients, and transports.
- **Document custom API definitions and definition-level data** (Phase 3 task, unstarted) — custom `RouteDefinition`/`ResolverDefinition` metadata and manifest building.

Both deferred tasks require editorial content, not generator changes. All other Phase 0–4 tasks complete.

## Final State

All 5 phases completed, each manually verified and approved by the user. Track merged via PR #25 on branch `conductor/new-documentation-20260621`. Old `api_docs_revamp_20260616` track archived and superseded. No runtime, adapter, API, or CLI behavior changed.
