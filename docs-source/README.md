---
id: docs-source-overview
slug: /development/docs-source
title: Documentation source overview
---

# Documentation source overview

`docs-source/` is the canonical handwritten documentation source for Scramjet Transform Hub. It is intended to feed generated repository READMEs, curated reference outputs, and a separate Docusaurus documentation site.

## Source and generated boundaries

- Handwritten source lives in `docs-source/`.
- Generated documentation export lives in `dist-docs/`.
- Generated READMEs are written to repository README locations and mirrored under `dist-docs/readmes/` when the generator is implemented.
- Curated TypeScript/API/CLI reference is generated only from allowlisted entrypoints in `docs-source/reference/curated-reference-allowlist.json`.
- Broad per-package source documentation is not part of the new documentation model.

## Authoring conventions

- Every prose page must start with YAML frontmatter containing at least `id`, `slug`, and `title`.
- `id` values must be stable, lowercase, and dash-separated.
- `slug` values must be stable and should describe user-facing information architecture rather than source paths.
- Use one `#` heading per page, matching the frontmatter title unless there is a clear reason to differ.
- Prefer task-oriented sections and link to reference pages for exhaustive API details.
- Reusable snippets belong in `_partials/` and should not be routed as standalone pages.
- Examples belong in `examples/` and should be linked from prose pages.
- Generated files must contain a generated-file marker and must not be edited by hand.

## Generator globs

- Routed prose pages: `intro/**/*.md`, `transform-hub/**/*.md`, `manager/**/*.md`, `sequences/**/*.md`, `testing/**/*.md`, `cli/**/*.md`, `api/**/*.md`, `deployment/**/*.md`, and `development/**/*.md`.
- Reference policy/configuration: `reference/**/*.md`, `reference/**/*.json`, and `reference/**/*.schema.json` are consumed by generators or copied as reference content according to their frontmatter/schema type.
- Partials: `_partials/**` is include-only content and must not be routed as standalone pages.
- README sources: `readmes/**` is consumed by the README generator and may have README-specific metadata instead of routed-page frontmatter.
- Examples: `examples/**` is copied or validated as example content and is not routed unless a specific page frontmatter opts in.

## Link rules

- Use relative links between handwritten source pages.
- Link to generated reference by stable output path, not by package internals.
- Avoid linking to `docs/` TypeDoc output from new pages; that tree is being retired.
- README generation must rebase links for repository root, package, npm, and docs-site contexts.
