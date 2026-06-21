---
id: reference-export-contract
slug: /reference/export-contract
title: Documentation export contract
---

# Documentation export contract

The documentation generator will export deterministic outputs for repository READMEs and an external Docusaurus site. This repository owns the source and generated handoff artifacts; it does not build or host the Docusaurus site.

## Output layout

The default generated root is `dist-docs/`:

```txt
dist-docs/
  content/
  reference/
    typescript/
    cli/
    api/
      v2/
      legacy/v1/
  readmes/
  sidebars/
  metadata.json
```

## Endpoint configuration

All docs generators must resolve their output root from the same endpoint configuration:

1. `SCRAMJET_DOCS_OUTPUT_DIR` environment variable, when set.
2. Root `package.json` configuration key `scramjet.docs.outputDir`.
3. Fallback default `dist-docs`.

The environment variable takes precedence so CI jobs, local agents, and external docs-site integrations can redirect output without mutating repository files.

The endpoint applies to prose content export, curated TypeScript reference, CLI reference, API docs, README mirrors, sidebars, and `metadata.json`.

## Write modes

- **Export mode** writes only under the resolved output root. This is the default behavior for content, reference, CLI, API, sidebars, metadata, and README mirrors.
- **README write mode** updates repository `README.md` and package `README.md` files from `docs-source/readmes/`. The output root still receives mirrored copies under `dist-docs/readmes/` or the configured equivalent.
- **Check mode** validates generated output drift without mutating repository README files or the export root.

The existing root scripts `build:docs`, `build:all-docs`, and `build:readme` are legacy command surfaces until replaced by `docs:generate`, `docs:check`, and narrower generator subcommands.

## Sidebar and category metadata

- Prose pages use frontmatter `id`, `slug`, and `title` as stable routing metadata.
- Section ordering should be declared by source-side metadata files or generator-owned sidebars, not inferred from filesystem order alone.
- Generated reference sections must include stability labels and source allowlist metadata.
- Legacy v1 API pages must be grouped separately from primary API v2 pages.

## Link rewriting

- Docusaurus content links target source slugs or generated reference slugs.
- Root README links target repository-relative docs or published docs URLs, depending on generator mode.
- Package README links must be rebased relative to each package directory and remain useful on npm.
- Generated reference links must be stable across regeneration.

## Metadata requirements

`dist-docs/metadata.json` must include:

- source revision or deterministic source identifier;
- generator command and version information;
- resolved output root and whether it came from env, package config, or fallback;
- generated output groups;
- curated reference entrypoints and stability labels;
- warnings and deferred documentation areas;
- paths expected by the external Docusaurus repository.
