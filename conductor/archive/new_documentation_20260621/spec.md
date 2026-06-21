# Specification: New Documentation Source, Curated Reference, and README Pipeline

## Overview

Create a new documentation foundation for Scramjet Transform Hub that supersedes the archived `api_docs_revamp_20260616` track. The new direction is prose-first documentation for users and operators, supported by curated implementer reference generated only from explicitly selected entrypoints.

The documentation should become the source material for a separate Docusaurus site while this repository remains responsible for producing deterministic documentation inputs and generated README/reference artifacts.

Unlike the archived API/docs revamp, this track should not generate noisy reference documentation for all source paths. Source-level detail should remain in JSDoc where it belongs. Generated reference should be limited to entrypoints that are useful for users, operators, and implementers.

This track also replaces the current documentation generation stack:

- remove or retire the old broad per-package TypeDoc flow early in the track;
- replace the old Markdown template README pipeline;
- generate root README, package READMEs, and curated reference outputs from the new documentation source structure.

## Track Type

Feature / documentation platform / developer experience.

## Supersedes

- `conductor/tracks/api_docs_revamp_20260616`

The archived track remains historical context only. Router/API work already completed in the repository can be documented, but the old combined router/MCP/OpenAPI/docs revamp should not drive this track.

## Primary Audience

The primary audience is users and operators:

- application developers writing and running Transform Sequences;
- CLI users interacting with Transform Hub and Manager;
- platform engineers operating Transform Hub locally, in Docker, or in Kubernetes.

A secondary audience is repository implementers who need curated reference entrypoints and developer-oriented guidance for safe contribution.

## Goals

- Create a canonical documentation source structure suitable for Docusaurus consumption.
- Write prose documentation explaining how to use Transform Hub and Manager.
- Document how to implement, package, test, and run sequences.
- Document sequence testing with `@scramjet/sequence-test`.
- Document build, run, validation, and development workflows.
- Document CLI usage and generate/maintain command reference from the CLI command model where practical.
- Document API/client usage pragmatically, including current v1/v2 client surfaces where useful.
- Generate curated TypeScript/API reference only for explicitly allowlisted entrypoints.
- Replace the old TypeDoc and README templating flows with the new docs-source-based pipeline.
- Generate root README, package READMEs, generated reference, sidebars/metadata, and Docusaurus-consumable content deterministically.
- Generate full API v2 documentation from the existing API definitions and route tree.
- Separate v1 API documentation into a legacy documentation area.
- Fully supersede old documentation outputs with the new `dist-docs` export by the end of the track.

## Non-Goals

- Generating source documentation for every package, class, function, or internal path.
- Treating all package internals as public documentation surface.
- Building or hosting the Docusaurus website in this repository.
- Reworking router internals, MCP support, or API runtime behavior as part of the docs track.
- Completing the archived track's full MCP/OpenAPI/router metadata ambitions unless current outputs can be documented or exported safely.
- Changing runtime adapter behavior unrelated to documentation generation.

## Functional Requirements

### 1. Track reconciliation and old stack retirement plan

- Keep `api_docs_revamp_20260616` archived and document that this track supersedes it.
- Identify current docs generation flows, including old TypeDoc package scripts, root `build:docs`, `scripts/mk-readme.js`, `.mtpl` templates, and README parts.
- Define the migration path from old generated docs and README templates to the new docs-source-based pipeline.
- Remove or retire the old broad per-package TypeDoc output early enough to prevent parallel stale documentation flows.
- Remove or retire the old Markdown template README pipeline after the replacement can generate equivalent required outputs.

### 2. Documentation source structure

Create a canonical docs source tree, for example:

```txt
docs-source/
  intro/
  transform-hub/
  manager/
  sequences/
  testing/
  cli/
  api/
  deployment/
  development/
  reference/
  readmes/
  examples/
  _partials/
```

The source tree should contain authoring conventions for:

- frontmatter;
- stable doc IDs/slugs;
- titles and heading hierarchy;
- reusable partials/includes;
- examples;
- links between prose, generated reference, README outputs, and API/client docs.

### 3. Prose documentation content

Create prose-first documentation for at least:

- What Transform Hub is and when to use it.
- Core concepts: Hub, Manager, MultiManager, Sequence, Instance, Adapter, Runner, Topics, Streams, APIs.
- Getting started with Transform Hub.
- Transform Hub configuration.
- Build and run workflows.
- Manager overview, running Manager, and connecting Hubs.
- Writing Node/Bun/Python sequences where currently supported.
- Sequence input/output behavior.
- Topic metadata and topic routing.
- Health, logging, events, monitoring, stop/kill lifecycle behavior.
- Packaging and deploying sequences.
- Testing sequences with `@scramjet/sequence-test`.
- CLI overview and usage patterns.
- Process, Docker, and Kubernetes adapter deployment guidance.
- Repository overview for contributors.
- Build, test, lint, and validation commands.
- Practical API/client usage, including current API client and `rest-api2` concepts where useful.

### 4. Curated reference entrypoints

Define an explicit allowlist for generated reference entrypoints. Each entry should specify:

- package or source entrypoint;
- audience;
- stability label, such as stable, experimental, or internal-but-useful;
- generated output path;
- reason for inclusion;
- owner/reviewer expectations if applicable.

Candidate entrypoint areas include:

- Transform Hub public startup/configuration surfaces;
- Manager public usage/configuration surfaces;
- sequence implementation contracts and runtime context types;
- selected shared types from `packages/types`;
- `@scramjet/sequence-test` public API;
- CLI command reference source;
- API clients, including `packages/api-client` and `packages/rest-api2` where appropriate;
- adapter-facing extension contracts only when intentionally documented as public or implementer-facing.

Reference generation must not export non-allowlisted internals accidentally.

### 5. Generated reference and API/client docs

- Generate curated reference under `dist-docs/reference/` or an approved equivalent export path.
- Avoid root-level `docs/<package>/` TypeDoc clutter.
- Use JSDoc as the source of API descriptions where possible.
- Generate stable slugs/doc IDs and deterministic output.
- Generate or preserve CLI command reference from the actual command model where practical.
- Generate or document current API/client reference from existing route/client metadata where practical.
- If OpenAPI output is included, it should reflect current supported route metadata only and must not imply MCP or incomplete router features are complete.

### 6. README generation pipeline

Replace the old README template flow with a docs-source-based generation pipeline.

The new pipeline must generate:

- root `README.md`;
- package `README.md` files;
- generated reference README or landing pages where appropriate;
- Docusaurus-consumable README copies or equivalents if needed by the docs export contract.

The pipeline should preserve useful old capabilities where still needed:

- reusable parts;
- generated reference links;
- link rebasing for package/npm/root/docs contexts;
- concise package READMEs that link to longer prose/reference docs instead of embedding too much content.

### 7. Export layout and metadata

Produce deterministic exported documentation inputs such as:

```txt
dist-docs/
  content/
  reference/
    typescript/
    cli/
    api/
  readmes/
  sidebars/
  metadata.json
```

The metadata file should describe:

- source revision or deterministic source identifier;
- generated output groups;
- reference entrypoints;
- generation command/version information;
- warnings or deferred documentation areas;
- paths consumed by the external Docusaurus repo.

All generators must support a configurable output/export endpoint. The environment variable must take precedence because CI, local agents, and external docs-site integrations need to redirect output without mutating repository files. A root `package.json` configuration entry should provide the default value.

The generator endpoint configuration should cover content export, curated reference export, README copies, CLI reference, API docs, sidebars, and metadata. The chosen environment variable name and package configuration key must be documented in the docs export contract.

### 8. API documentation

Generate full API v2 documentation from the existing definitions rather than hand-maintaining a parallel route list.

The API v2 documentation should cover:

- the `RestAPI2RouteTree` root/space/hub/sequence/instance structure;
- route groups, resolver relationships, dynamic mount paths, and opaque routes;
- request params, query, headers, bodies, responses, stream semantics, and errors where definitions expose them;
- generated operation IDs and stable docs page IDs;
- API client usage for generic and fluent clients;
- HTTP and verser2 transport usage where supported;
- creating custom API definitions and clients from route definitions;
- adding definition-level documentation or metadata if current definitions need additional data to generate useful docs.

The v1 API must be documented separately under a legacy docs path, for example `dist-docs/reference/api/legacy/v1/` and matching `docs-source/api/legacy/` prose. V1 docs should explain compatibility status and should not be mixed into the primary API v2 documentation structure.

### 9. Validation

Add docs validation suitable for CI and local development:

- frontmatter validation;
- broken link checks;
- heading/title checks;
- reference allowlist validation;
- generated output drift checks;
- README drift checks;
- CLI reference generation checks;
- generated reference checks;
- API/OpenAPI checks only for currently supported exported API artifacts.

## Non-Functional Requirements

- Use npm scripts, not yarn.
- Preserve TypeScript CommonJS/ES2019 constraints unless explicitly changed in a separate approved track.
- Keep generated docs deterministic.
- Avoid broad unrelated formatting churn.
- Keep prose readable for users who do not know the monorepo internals.
- Clearly distinguish stable public APIs from experimental or internal implementer APIs.
- Do not require full Docker/BDD validation unless a phase specifically changes docs that depend on those outputs.
- Keep Docusaurus hosting/building outside this repository.

## Acceptance Criteria

- The archived `api_docs_revamp_20260616` track is no longer treated as active guidance.
- A canonical `docs-source/` structure exists with authoring conventions.
- Prose docs exist for Transform Hub, Manager, sequences, testing, CLI, deployment, development, and API/client usage.
- Old broad TypeDoc output flow is removed, retired, or replaced by curated reference generation.
- Old Markdown README templating is replaced by a docs-source-based README pipeline.
- Root README and package READMEs can be generated from the new pipeline.
- Curated reference entrypoints are defined in an allowlist.
- Generated reference output includes only allowlisted entrypoints.
- Generated docs are exported under a structured `dist-docs/` layout or approved equivalent.
- All docs generators honor a configurable output/export endpoint from root `package.json` config and a higher-priority environment variable override.
- Sidebars and metadata are generated for Docusaurus consumption.
- Validation catches broken links, invalid frontmatter, missing reference entrypoints, generated reference drift, and README drift.
- Full API v2 docs are generated from `rest-api2` definitions and include client usage and custom-definition guidance.
- V1 API docs are separated into a legacy docs area.
- Old docs outputs and legacy docs generator expectations are fully superseded by `dist-docs` by the final phase.
- API/client docs reflect current supported behavior and do not claim incomplete MCP/router/OpenAPI capabilities.

## Out of Scope

- Full source-tree documentation generation.
- Docusaurus website implementation or hosting.
- Runtime adapter behavior changes.
- Router redesign.
- MCP implementation.
- Making experimental packages stable public APIs without explicit labeling.
- Treating low-level source docs as prose docs instead of keeping them as JSDoc.
