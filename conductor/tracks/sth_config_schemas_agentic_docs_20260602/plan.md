# Implementation Plan: STH Config Schemas and Agentic Usage Documentation

## Phase 1: Discovery and Source Alignment

- [ ] Task: Confirm affected documentation and schema entrypoints
    - [ ] Read root `codemap.md` and relevant package codemaps for `packages/sth`, `packages/sth-config`, `packages/types`, and runner startup behavior where present.
    - [ ] Inspect existing config documentation including `docs/read-more/sth-config.md` and related sequence-writing docs.
    - [ ] Inspect `docs/roadmap/001-docs-agentic-usage.md` and existing README structure.
- [ ] Task: Identify canonical config contracts and runtime examples
    - [ ] Locate TypeScript types/interfaces for STH configuration and startup-config behavior.
    - [ ] Locate CLI parsing and startup-config loading behavior in STH entrypoints.
    - [ ] Locate existing sample config files or tests that demonstrate supported shapes.
- [ ] Task: Define schema/documentation boundaries
    - [ ] Confirm which fields can be documented as current behavior and which should remain out of scope.
    - [ ] Record any unsupported or ambiguous behavior to avoid documenting it as stable.
- [ ] Task: Conductor - User Manual Verification 'Discovery and Source Alignment' (Protocol in workflow.md)

## Phase 2: Schema Artifacts

- [ ] Task: Create JSON Schema files under `schemas/`
    - [ ] Add an STH config JSON Schema aligned with current config contracts and examples.
    - [ ] Add a host startup-config JSON Schema aligned with the STH launch-time `sequences` startup behavior and examples.
    - [ ] Use conventional schema filenames such as `schemas/sth-config.schema.json` and `schemas/startup-config.schema.json`.
    - [ ] Include `$schema` and `$id` metadata using draft 2020-12 or draft-07.
    - [ ] Include field descriptions, defaults/examples where known, and avoid unsupported fields.
- [ ] Task: Add schema usage documentation
    - [ ] Document how users and agents can reference schemas from JSON config files.
    - [ ] Explain YAML authoring only where existing behavior supports it, while keeping JSON Schema as the track deliverable.
- [ ] Task: Validate schema syntax
    - [ ] Run the narrowest available schema validation or JSON parsing command.
    - [ ] Confirm schema files have valid JSON syntax and expected `$schema` and `$id` metadata.
    - [ ] If no focused schema validation exists, document the skipped validation reason.
- [ ] Task: Conductor - User Manual Verification 'Schema Artifacts' (Protocol in workflow.md)

## Phase 3: Agentic Usage Documentation

- [ ] Task: Draft `docs/read-more/agentic-usage.md`
    - [ ] Explain headless STH bootstrap with process adapter and startup-config usage.
    - [ ] Document readiness/health polling expectations using current API behavior.
    - [ ] Explain stable `sequenceName` and `instanceName` naming for idempotent agent deployments.
    - [ ] Document send/start/output/event-streaming workflows using REST API or TypeScript client patterns.
- [ ] Task: Add sequence authoring guidance
    - [ ] Provide base instructions for writing a Transform Sequence for agentic workflows.
    - [ ] Include a minimal runnable example or link to a canonical existing example.
    - [ ] Explain packaging/deployment relationship between sequence source, config metadata, and STH startup.
- [ ] Task: Add production startup instructions
    - [ ] Document local built-source startup after `npm ci` and `npm run build:packages` or the narrowest correct build command.
    - [ ] Document npm package installation and startup.
    - [ ] Document GitHub Packages installation and startup.
    - [ ] Include prerequisites and config/startup-config notes for each mode.
- [ ] Task: Conductor - User Manual Verification 'Agentic Usage Documentation' (Protocol in workflow.md)

## Phase 4: Cross-linking and Documentation Consistency

- [ ] Task: Update repository documentation links
    - [ ] Add a concise README link to the agentic usage guide.
    - [ ] Update config docs, including `docs/read-more/sth-config.md` if present, with schema and startup-config references.
- [ ] Task: Review docs for product and terminology consistency
    - [ ] Ensure terms match product guidelines: Transform Sequence, Hub, Adapter, Runner, Runtime Wrapper, CLI, API, AppContext.
    - [ ] Ensure process, Docker, and Kubernetes behavior is distinguished where relevant.
    - [ ] Ensure docs do not describe unsupported runtime or adapter behavior as available.
- [ ] Task: Conductor - User Manual Verification 'Cross-linking and Documentation Consistency' (Protocol in workflow.md)

## Phase 5: Validation, Oracle Review, and Commit

- [ ] Task: Run focused validation
    - [ ] Run JSON/schema syntax validation for files under `schemas/`.
    - [ ] Run docs-relevant lint or the narrowest repository lint/build command if applicable.
    - [ ] Record skipped validation with reasons when no focused command exists.
- [ ] Task: Oracle review
    - [ ] Ask @oracle to review the docs/schema implementation for correctness, maintainability, YAGNI, and alignment with `spec.md` and `plan.md`.
    - [ ] Address review feedback that is in scope or record deferred recommendations.
- [ ] Task: Final review and cleanup
    - [ ] Inspect git diff to confirm only intended docs/schema files changed.
    - [ ] Confirm acceptance criteria from `spec.md` are satisfied.
- [ ] Task: Commit completed implementation
    - [ ] Stage only intended files after validation and in-scope Oracle feedback are complete.
    - [ ] Commit with a concise task-scoped message before the final phase manual verification checkpoint.
- [ ] Task: Conductor - User Manual Verification 'Validation, Oracle Review, and Commit' (Protocol in workflow.md)
