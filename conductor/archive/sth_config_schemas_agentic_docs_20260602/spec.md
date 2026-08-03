# Specification: STH Config Schemas and Agentic Usage Documentation

## Overview

Create machine-readable JSON Schemas and user-facing documentation for Scramjet Transform Hub configuration and startup configuration files. Add base agentic usage documentation derived from `docs/roadmap/001-docs-agentic-usage.md` that explains how to write a Transform Sequence and start STH with it in production mode.

This track is documentation-first and should align with existing TypeScript contracts, runtime examples, and current CLI/startup behavior.

## Functional Requirements

### Configuration Schemas

- Add a top-level `schemas/` directory if it does not already exist.
- Add JSON Schema files for:
  - STH config files, using a conventional name such as `schemas/sth-config.schema.json`.
  - Host startup-config files consumed by STH at launch, using a conventional name such as `schemas/startup-config.schema.json`.
- Target a current, widely supported JSON Schema draft such as draft 2020-12 or draft-07 and include `$schema` and `$id` fields.
- Use a hybrid source of truth:
  - Existing TypeScript config contracts and package responsibilities as the primary reference.
  - Existing runtime examples and docs as practical examples to verify field names, defaults, and supported shapes.
- Include enough field descriptions, defaults, and examples in schemas to support editor completion and validation.
- Do not add YAML schema files in this track; YAML may be documented as a supported config authoring format only where existing behavior supports it.
- Keep CLI per-sequence start/deploy config fragments out of scope unless discovery shows they are the same contract as the host startup-config file.

### Agentic Usage Documentation

- Add a new guide at `docs/read-more/agentic-usage.md` based on `docs/roadmap/001-docs-agentic-usage.md`.
- Explain how an automated agent can:
  - Bootstrap STH headlessly.
  - Use `--runtime-adapter process` and `--startup-config` where applicable.
  - Poll health/readiness endpoints.
  - Use stable `sequenceName` and `instanceName` values for idempotent deployment flows.
  - Send, start, read output, and consume events through API or client workflows.
  - Generate or package a minimal Transform Sequence programmatically.

### Sequence Authoring Guidance

- Add base instructions for writing a Transform Sequence suitable for an agentic workflow.
- Include a minimal runnable sequence example or point to an existing canonical example when duplication would become stale.
- Make the relationship clear between sequence code, sequence package/config metadata, STH startup, deployment, and production execution.

### Production Startup Guidance

Document how to start STH with a sequence in production mode using:

- Local built sources from this repository, after building `dist/`.
- Published npm package installation.
- GitHub Packages installation.

Each path should include prerequisites, install/build commands, startup commands, and notes about using config/startup-config files.

### Documentation Linking

- Update `README.md` with a short link to the new agentic usage guide.
- Update relevant config documentation, including `docs/read-more/sth-config.md` if present, to reference the new `schemas/` artifacts and startup-config guidance.

## Non-Functional Requirements

- Documentation must use clear technical language and name STH concepts consistently: Transform Sequence, Hub, Adapter, Runner, Runtime Wrapper, CLI, API, and AppContext.
- Documentation must distinguish process, Docker, and Kubernetes behavior when relevant.
- Documentation must avoid describing unsupported runtime behavior as available.
- Schemas and docs must remain aligned with current source code behavior and package responsibilities.
- Changes must be documentation/schema-only unless a source-code correction is required to expose existing behavior accurately.

## Acceptance Criteria

- `schemas/` contains JSON Schema files for STH config and startup-config files.
- Schema files have valid JSON syntax and include `$schema` and `$id` metadata.
- New or updated docs explain schema usage and where the schemas live.
- `docs/read-more/agentic-usage.md` exists and covers headless startup, sequence authoring, API/client workflow concepts, readiness checks, and production startup modes.
- README links to the agentic usage guide.
- Config docs link to the relevant schemas and startup-config guidance.
- Commands in docs use npm-oriented repository guidance for local development/build workflows.
- Relevant docs/schema validation or lint checks are run, or skipped with a documented reason if no focused validation exists.

## Out of Scope

- Adding a schema generation toolchain unless needed for correctness.
- Changing runtime adapter behavior, API routes, or sequence lifecycle semantics.
- Adding Docker/Kubernetes production deployment automation beyond documenting existing paths.
- Implementing new CLI flags or config fields.
- Publishing packages to npm or GitHub Packages.
