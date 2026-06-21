# Implementation Plan: New Documentation Source, Curated Reference, and README Pipeline

## Phase 0: Track Setup, Branch, and Current-State Inventory

- [ ] Task: Create review surface for the track
    - [ ] Inspect current git status, current branch, recent commits, and remote tracking.
    - [ ] Create a dedicated feature branch for the track unless explicitly skipped.
    - [ ] Prepare a draft PR after initial planning artifacts are committed when appropriate.
    - [ ] Keep the PR description updated with phase status, validation, and deferred items.
- [ ] Task: Inventory current documentation generation flows
    - [ ] Read root docs scripts, especially `build:docs`, `build:all-docs`, and `build:readme`.
    - [ ] Inventory package-level `build:docs` scripts and TypeDoc configuration/version usage.
    - [ ] Inventory current root-level generated docs under `docs/` and identify generated vs handwritten content.
    - [ ] Inventory `scripts/mk-readme.js`, package `.mtpl` files, and reusable README parts.
    - [ ] Inventory current CLI command-reference generation and API/client reference sources.
- [ ] Task: Define migration and retirement strategy
    - [ ] Document which old docs outputs are replaced, retained temporarily, or deleted.
    - [ ] Define when broad per-package TypeDoc output is disabled or removed.
    - [ ] Define when the old README template flow is disabled or removed.
    - [ ] Record risks for npm package README publishing and docs site consumption.
- [ ] Task: Validate Phase 0
    - [ ] Run the narrowest relevant validation for Markdown/metadata-only changes.
    - [ ] Record skipped validation and reasons in phase notes.
    - [ ] Confirm no runtime, adapter, API, or CLI behavior changed.
- [ ] Task: Conductor - User Manual Verification 'Phase 0: Track Setup, Branch, and Current-State Inventory' (Protocol in workflow.md)

## Phase 1: Documentation Source Architecture and Export Contract

- [ ] Task: Create canonical docs source skeleton
    - [ ] Add `docs-source/` with folders for intro, transform-hub, manager, sequences, testing, cli, api, deployment, development, reference, readmes, examples, and partials.
    - [ ] Add authoring conventions for frontmatter, slugs/doc IDs, headings, partials, examples, generated-file markers, and link rules.
    - [ ] Define which files are handwritten source and which files are generated artifacts.
- [ ] Task: Define Docusaurus export contract
    - [ ] Define `dist-docs/` output layout for content, reference, readmes, sidebars, and metadata.
    - [ ] Define sidebar/category metadata conventions for prose and generated reference.
    - [ ] Define link rewriting and link rebasing rules for docs site, root README, package READMEs, and npm README contexts.
    - [ ] Define deterministic metadata requirements for `dist-docs/metadata.json`.
- [ ] Task: Define curated reference allowlist format
    - [ ] Create a machine-readable or documented allowlist format for generated reference entrypoints.
    - [ ] Include entrypoint path, package, audience, stability label, output path, inclusion reason, and reviewer expectations.
    - [ ] Mark experimental surfaces explicitly, including `@scramjet/sequence-test` if included.
    - [ ] Ensure non-allowlisted internals cannot be exported accidentally.
- [ ] Task: Automated review after source architecture
    - [ ] Run review focused on information architecture, export contract clarity, and accidental public API exposure risk.
    - [ ] Address in-scope findings or record deferred findings.
- [ ] Task: Validate Phase 1
    - [ ] Run docs metadata/frontmatter validation available at this stage, or record why not yet available.
    - [ ] Confirm source/export contract files are deterministic and linkable.
    - [ ] Confirm no old generation flow has been removed before replacement scope is defined.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Documentation Source Architecture and Export Contract' (Protocol in workflow.md)

## Phase 2: Generator Infrastructure and Old TypeDoc Retirement

- [ ] Task: Design generator command surface
    - [ ] Add or define npm scripts for `docs:clean`, `docs:generate`, `docs:check`, and narrower subcommands.
    - [ ] Ensure scripts use npm and existing monorepo script patterns.
    - [ ] Ensure generated outputs remain outside handwritten `docs-source/`.
- [ ] Task: Implement content export foundation
    - [ ] Generate `dist-docs/content/` from `docs-source/` prose.
    - [ ] Preserve frontmatter, stable slugs/doc IDs, and generated-file headers where appropriate.
    - [ ] Generate initial sidebar metadata for prose content.
- [ ] Task: Implement curated reference generation foundation
    - [ ] Choose or configure the reference generator for allowlisted TypeScript entrypoints.
    - [ ] Generate curated reference under `dist-docs/reference/typescript/`.
    - [ ] Fail or clearly report unresolved allowlisted entrypoints.
    - [ ] Prevent broad package/source-tree reference generation.
- [ ] Task: Retire old broad TypeDoc flow
    - [ ] Remove, disable, or redirect package-level broad TypeDoc scripts that generate root-level `docs/<package>/` clutter.
    - [ ] Update root docs scripts to use the new docs command surface.
    - [ ] Remove stale generated docs artifacts only when confirmed generated and replaceable.
    - [ ] Record any temporarily retained old docs outputs and their removal criteria.
- [ ] Task: Add generator validation
    - [ ] Validate frontmatter and headings.
    - [ ] Validate internal links and link rewrite targets where possible.
    - [ ] Validate reference allowlist entries and generated output drift.
    - [ ] Validate generated sidebars and metadata shape.
- [ ] Task: Validate Phase 2
    - [ ] Run the narrowest docs generation/check commands.
    - [ ] Run lint or format checks only for files changed in this phase where practical.
    - [ ] Confirm old TypeDoc retirement did not break package builds.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Generator Infrastructure and Old TypeDoc Retirement' (Protocol in workflow.md)

## Phase 3: Prose Documentation Content

- [ ] Task: Write Transform Hub and core concept docs
    - [ ] Write intro pages explaining what Transform Hub is and when to use it.
    - [ ] Document Hub, Manager, MultiManager, Sequence, Instance, Adapter, Runner, Topics, Streams, and APIs.
    - [ ] Link core concepts to relevant prose, CLI, API/client, and curated reference pages.
- [ ] Task: Write Transform Hub usage docs
    - [ ] Document getting started with Transform Hub.
    - [ ] Document configuration and environment considerations.
    - [ ] Document build and run workflows for source and built output.
    - [ ] Document process, Docker, and Kubernetes adapter differences at a user/operator level.
- [ ] Task: Write Manager docs
    - [ ] Document Manager purpose and architecture at a user/operator level.
    - [ ] Document running Manager and connecting Hubs.
    - [ ] Document operational visibility and API/client interaction points where current behavior supports it.
- [ ] Task: Write sequence implementation docs
    - [ ] Document sequence structure for supported runtimes.
    - [ ] Document input/output behavior, streams, content types, and lifecycle expectations.
    - [ ] Document topics, metadata, health, logging, events, monitoring, stop, and kill behavior.
    - [ ] Include examples as first-class docs content.
- [ ] Task: Write testing and development docs
    - [ ] Document `@scramjet/sequence-test` purpose, current experimental status if applicable, and usage examples.
    - [ ] Document repository overview for contributors.
    - [ ] Document build, test, lint, and validation commands with memory/tooling constraints.
- [ ] Task: Write CLI and API/client docs
    - [ ] Document CLI usage patterns and link to generated command reference.
    - [ ] Document practical API client usage for current clients.
    - [ ] Document `rest-api2` concepts and limits without claiming incomplete MCP/router capabilities.
- [ ] Task: Automated review after prose content
    - [ ] Run review focused on user clarity, operator usefulness, stale claims, and missing safety caveats.
    - [ ] Address in-scope findings or record deferred findings.
- [ ] Task: Validate Phase 3
    - [ ] Run docs content generation and link/frontmatter checks.
    - [ ] Confirm examples are syntactically plausible or validated where practical.
    - [ ] Record docs areas intentionally left incomplete.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Prose Documentation Content' (Protocol in workflow.md)

## Phase 4: README Pipeline Replacement

- [ ] Task: Design README source model
    - [ ] Define root README source and package README source conventions under `docs-source/readmes/` or approved equivalent.
    - [ ] Map old `.mtpl` package templates to new README source files.
    - [ ] Define reusable partial/include support for README generation.
    - [ ] Define link rebasing for root, package, npm, docs-site, and generated-reference contexts.
- [ ] Task: Implement README generator
    - [ ] Generate root `README.md` from the new docs source pipeline.
    - [ ] Generate package `README.md` files from new package README sources.
    - [ ] Generate README copies or landing pages under `dist-docs/readmes/` where needed.
    - [ ] Keep package READMEs concise and link longer content to docs/reference pages.
- [ ] Task: Retire old README template flow
    - [ ] Remove or disable `scripts/mk-readme.js` after replacement generation is working.
    - [ ] Remove or migrate package `.mtpl` files and old README parts.
    - [ ] Update root npm scripts to use the new README generation path.
    - [ ] Confirm package publishing still includes expected README content.
- [ ] Task: Add README validation
    - [ ] Add README drift checks.
    - [ ] Add tests or fixtures for partials, link rebasing, generated reference links, and package README generation.
    - [ ] Validate generated README links where possible.
- [ ] Task: Validate Phase 4
    - [ ] Run README generation and drift checks.
    - [ ] Run docs generation/check commands affected by README outputs.
    - [ ] Review root and package README outputs for stale claims and excessive detail.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: README Pipeline Replacement' (Protocol in workflow.md)

## Phase 5: CLI, API/Client Reference, and Final Export Integration

- [ ] Task: Integrate CLI reference generation
    - [ ] Generate CLI command reference from the current CLI command model where practical.
    - [ ] Output CLI reference under `dist-docs/reference/cli/` or approved equivalent.
    - [ ] Link prose CLI docs and README outputs to generated CLI reference.
- [ ] Task: Integrate API/client documentation outputs
    - [ ] Generate or export current supported API/client reference artifacts where practical.
    - [ ] Document current `api-client` and `rest-api2` usage surfaces.
    - [ ] Include OpenAPI output only for currently supported route metadata.
    - [ ] Clearly mark deferred MCP/OpenAPI completeness if not supported.
- [ ] Task: Finalize export metadata and sidebars
    - [ ] Generate complete `dist-docs/metadata.json`.
    - [ ] Generate sidebars for prose, reference, CLI, API/client docs, and README copies as applicable.
    - [ ] Confirm external Docusaurus consumption paths are documented.
- [ ] Task: Validate complete docs export
    - [ ] Run `docs:clean`, `docs:generate`, and `docs:check` or approved equivalents.
    - [ ] Run link, frontmatter, reference allowlist, README drift, and metadata checks.
    - [ ] Run package build or narrower checks if docs script/package changes affect builds.
    - [ ] Confirm generation is deterministic by checking for no unexpected drift after regeneration.
- [ ] Task: Automated review before final verification
    - [ ] Run final review focused on docs usability, generator determinism, stale source removal, and Docusaurus handoff readiness.
    - [ ] Address in-scope findings or document deferred follow-ups.
- [ ] Task: Final track documentation update
    - [ ] Update track notes or plan with validation results, skipped checks, and known follow-ups.
    - [ ] Confirm no unrelated runtime, adapter, API, or CLI behavior changed.
    - [ ] Update PR description with final validation and reviewer guidance.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: CLI, API/Client Reference, and Final Export Integration' (Protocol in workflow.md)
