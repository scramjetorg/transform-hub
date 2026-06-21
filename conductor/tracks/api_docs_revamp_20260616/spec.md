# Specification: API and Docs Revamp

> Archived 2026-06-21. This specification is retained for historical context.
> It has been superseded by a narrower implementer documentation and curated
> reference direction: prose Docusaurus source plus selected implementer-facing
> reference entrypoints, rather than broad generated source documentation and a
> combined API/router/docs revamp.

## Overview

Create a documentation and API foundation for Scramjet Transform Hub that lets this repository generate structured documentation inputs for a separate Docusaurus repository while also making API routes metadata-driven. The track includes a docs export contract, a canonical written-docs source tree, generated TypeScript/API reference artifacts, a replacement README generation pipeline, and integration of a decorator-based API router with MCP, OpenAPI generation, and generated API client support.

This repo will not host the Docusaurus website. It will produce stable files that the external Docusaurus repo can consume.

## Track Type

Feature / foundational refactor.

## Goals

- Establish a deterministic docs export pipeline for a separate Docusaurus site.
- Move handwritten documentation into a canonical docs source structure.
- Generate structured reference and API documentation artifacts under an export directory.
- Replace the existing `.mtpl` README generation with a maintainable docs-source-based pipeline.
- Integrate the decorator API router from `../drumwave-integration` into this repo.
- Include MCP support in the router integration.
- Extend the router so route metadata can generate OpenAPI schemas and API clients.
- Enforce strict metadata completeness for migrated REST, stream, and MCP routes.

## Functional Requirements

### 1. Transient planning and export contract

- Create transient research/planning documentation for the revamp.
- Define the generated docs contract consumed by the external Docusaurus repo.
- Define stable output locations, frontmatter conventions, slugs/doc IDs, sidebar metadata, generated-file headers, and link rewriting rules.
- Define router migration, OpenAPI generation, MCP handling, and API client generation expectations.

### 2. Router integration

- Add a router package or equivalent module, preferably `packages/api-router/`.
- Port the decorator-based router core from `../drumwave-integration`.
- Include MCP endpoint support as part of the target router design.
- Adapt the router to the existing `packages/api-server` / `APIExpose` model.
- Support REST routes, streaming routes, payload extraction, static routes where needed, and MCP endpoints.
- Add schema/docs metadata to route declarations.
- Generate OpenAPI documents from route metadata.
- Generate API clients from route metadata.
- Begin replacing duplicated hard-coded route strings with metadata-derived definitions or generated clients.

### 3. API metadata and schemas

- Migrated routes must include complete metadata.
- Metadata should cover summaries, descriptions, tags, path params, query params, request bodies, responses, errors, streaming semantics, and MCP semantics where applicable.
- Missing required metadata for migrated routes should fail generation rather than only warn.
- Non-OpenAPI-native behavior, such as streams or MCP behavior, must be represented through companion documentation and/or OpenAPI vendor extensions.

### 4. Reference and API docs generation

- Modernize and centralize TypeDoc generation.
- Move generated TypeScript reference output away from root-level `docs/<package>/` clutter.
- Generate Docusaurus-compatible Markdown/reference files under a structured export directory.
- Generate OpenAPI JSON artifacts and API Markdown/MDX artifacts from router metadata.
- Generate sidebar/category metadata for the external Docusaurus repo.

### 5. Written docs source

- Create a canonical docs source structure, such as `docs-source/`.
- Move or migrate existing handwritten docs from `docs/read-more`, `docs/guides`, `docs/architecture`, `ENV_VARS.md`, `CHANGELOG.md`, and other relevant sources.
- Add examples as first-class docs content.
- Normalize headings and frontmatter.
- Replace fragile relative links with stable doc IDs/slugs.
- Define whether roadmap docs are public docs, internal archive, or excluded.

### 6. README generation

- Replace the current `scripts/mk-readme.js` / `.mtpl` flow.
- Generate local and published READMEs from the docs source pipeline.
- Preserve useful existing capabilities: reusable parts, docs includes, generated reference links, and link rebasing.
- Generate root README, package READMEs, and Docusaurus-consumable README copies.
- Keep package READMEs concise and link longer technical content to generated reference/API docs.

### 7. Final export and validation

- Produce a final docs export layout such as:

```txt
dist-docs/
  content/
  reference/
    typescript/
  api/
    openapi/
    markdown/
  readmes/
  sidebars/
  metadata.json
```

- Add generation and validation scripts.
- Ensure docs generation is deterministic and suitable for CI.
- Validate links, frontmatter, OpenAPI schemas, route metadata coverage, and README drift.

## Non-Functional Requirements

- Preserve compatibility with the repo's TypeScript CommonJS / ES2019 constraints unless explicitly changed in the plan.
- Prefer npm scripts and existing monorepo script patterns.
- Keep the Docusaurus repo separate; this repo only exports inputs.
- Avoid breaking current API behavior during incremental router migration.
- Keep generated artifacts deterministic.
- Use narrow validation commands where possible.
- Maintain package-level test coverage for changed behavior.

## Acceptance Criteria

- A Conductor plan exists with phases for planning, router integration, reference/API docs, written docs source, README generation, and final verification.
- The docs export contract is documented.
- Router integration includes MCP as an in-scope capability.
- OpenAPI generation and API client generation are part of the router phase.
- Written docs have a canonical source structure rather than being scattered only across current `docs/` locations.
- TypeScript reference and API docs are generated into structured export paths rather than cluttering root docs.
- Package/root READMEs can be generated from the new pipeline.
- Final validation includes deterministic generation, link checks, OpenAPI validation, metadata completeness, and README drift checks.

## Out of Scope

- Building or hosting the separate Docusaurus website in this repository.
- Completing every API route migration in a single unreviewable change if incremental migration is safer.
- Replacing the whole HTTP server stack unless required by the approved router migration design.
- Changing runtime adapter behavior unrelated to API/docs generation.
- Treating incomplete route metadata as acceptable for migrated routes.
