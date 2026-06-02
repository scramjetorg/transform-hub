# Implementation Plan: STH Config Schemas and Agentic Usage Documentation

## Phase 1: Discovery and Source Alignment

- [x] Task: Confirm affected documentation and schema entrypoints
    - [x] Read root `codemap.md` and relevant package codemaps for `packages/sth`, `packages/sth-config`, `packages/types`, and runner startup behavior where present.
    - [x] Inspect existing config documentation including `docs/read-more/sth-config.md` and related sequence-writing docs.
    - [x] Inspect `docs/roadmap/001-docs-agentic-usage.md` and existing README structure.
- [x] Task: Identify canonical config contracts and runtime examples
    - [x] Locate TypeScript types/interfaces for STH configuration and startup-config behavior.
    - [x] Locate CLI parsing and startup-config loading behavior in STH entrypoints.
    - [x] Locate existing sample config files or tests that demonstrate supported shapes.
- [x] Task: Define schema/documentation boundaries
    - [x] Confirm which fields can be documented as current behavior and which should remain out of scope.
    - [x] Record any unsupported or ambiguous behavior to avoid documenting it as stable.
- [x] Task: Conductor - User Manual Verification 'Discovery and Source Alignment' (Protocol in workflow.md)

## Phase 2: Schema Artifacts

- [x] Task: Create JSON Schema files under `schemas/`
    - [x] Add an STH config JSON Schema aligned with current config contracts and examples.
    - [x] Add a host startup-config JSON Schema aligned with the STH launch-time `sequences` startup behavior and examples.
    - [x] Use conventional schema filenames such as `schemas/sth-config.schema.json` and `schemas/startup-config.schema.json`.
    - [x] Include `$schema` and `$id` metadata using draft 2020-12 or draft-07.
    - [x] Include field descriptions, defaults/examples where known, and avoid unsupported fields.
- [x] Task: Add schema usage documentation
    - [x] Document how users and agents can reference schemas from JSON config files.
    - [x] Explain YAML authoring only where existing behavior supports it, while keeping JSON Schema as the track deliverable.
- [x] Task: Validate schema syntax
    - [x] Run the narrowest available schema validation or JSON parsing command.
    - [x] Confirm schema files have valid JSON syntax and expected `$schema` and `$id` metadata.
    - [x] If no focused schema validation exists, document the skipped validation reason.
- [x] Task: Conductor - User Manual Verification 'Schema Artifacts' (Protocol in workflow.md)

## Phase 3: Agentic Usage Documentation

- [x] Task: Draft `docs/read-more/agentic-usage.md`
    - [x] Explain headless STH bootstrap with process adapter and startup-config usage.
    - [x] Document readiness/health polling expectations using current API behavior.
    - [x] Explain stable `sequenceName` and `instanceName` naming for idempotent agent deployments.
    - [x] Document send/start/output/event-streaming workflows using REST API or TypeScript client patterns.
- [x] Task: Add sequence authoring guidance
    - [x] Provide base instructions for writing a Transform Sequence for agentic workflows.
    - [x] Include a minimal runnable example or link to a canonical existing example.
    - [x] Explain packaging/deployment relationship between sequence source, config metadata, and STH startup.
- [x] Task: Add production startup instructions
    - [x] Document local built-source startup after `npm ci` and `npm run build:packages` or the narrowest correct build command.
    - [x] Document npm package installation and startup.
    - [x] Document GitHub Packages installation and startup.
    - [x] Include prerequisites and config/startup-config notes for each mode.
- [x] Task: Conductor - User Manual Verification 'Agentic Usage Documentation' (Protocol in workflow.md)

## Phase 4: Cross-linking and Documentation Consistency

- [x] Task: Update repository documentation links
    - [x] Add a concise README link to the agentic usage guide.
    - [x] Update config docs, including `docs/read-more/sth-config.md` if present, with schema and startup-config references.
- [x] Task: Review docs for product and terminology consistency
    - [x] Ensure terms match product guidelines: Transform Sequence, Hub, Adapter, Runner, Runtime Wrapper, CLI, API, AppContext.
    - [x] Ensure process, Docker, and Kubernetes behavior is distinguished where relevant.
    - [x] Ensure docs do not describe unsupported runtime or adapter behavior as available.
- [x] Task: Conductor - User Manual Verification 'Cross-linking and Documentation Consistency' (Protocol in workflow.md)

## Phase 5: Validation, Oracle Review, and Commit

- [x] Task: Run focused validation
    - [x] Run JSON/schema syntax validation for files under `schemas/`.
    - [x] Run docs-relevant lint or the narrowest repository lint/build command if applicable.
    - [x] Record skipped validation with reasons when no focused command exists.
- [x] Task: Oracle review
    - [x] Ask @oracle to review the docs/schema implementation for correctness, maintainability, YAGNI, and alignment with `spec.md` and `plan.md`.
    - [x] Address review feedback that is in scope or record deferred recommendations.
- [x] Task: Final review and cleanup
    - [x] Inspect git diff to confirm only intended docs/schema files changed.
    - [x] Confirm acceptance criteria from `spec.md` are satisfied.
- [ ] Task: Commit completed implementation
    - [ ] Stage only intended files after validation and in-scope Oracle feedback are complete.
    - [ ] Commit with a concise task-scoped message before the final phase manual verification checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Validation, Oracle Review, and Commit' (Protocol in workflow.md)
