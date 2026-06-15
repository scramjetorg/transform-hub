# Specification: Unified Zod Config and Commander Replacement

## Overview

Create a new Conductor track to replace fragmented configuration and CLI option handling across Scramjet Transform Hub with a unified Zod-based configuration system. The new system will provide a shared, typed configuration foundation for package defaults, config file loading, environment overlays, CLI option parsing, validation, merge precedence, masking, adapter option augmentation, and future generated documentation/schema artifacts.

The track also removes direct `commander` usage from package code and removes public API coupling to `commander.Command`, replacing it with Scramjet-owned abstractions. If a CLI parser is still required internally, it must be hidden behind the new configuration package and must not leak into package public APIs or adapter interfaces.

This track should not implement concrete verser2 Host endpoint/TLS configuration fields. It must design extension points that allow the existing `verser2_rollout_20260613` track to add those fields later without reworking the config foundation.

## Track Type

Feature / architecture migration.

## Goals

- Introduce a new shared configuration package, preferably `@scramjet/config` unless discovery finds a naming conflict.
- Use Zod as the canonical schema, validation, and type inference layer.
- Provide a single source of truth for typed config declarations, defaults, CLI option metadata, environment variable metadata, config file loading, masking, validation, and merge behavior.
- Preserve backwards compatibility for existing config schemas, CLI flags, and environment variables through aliases or compatibility mapping where required.
- Replace direct `commander` imports and public `commander.Command` references in package code.
- Replace adapter option augmentation based on `commander.Command` with a Scramjet-owned option registry or equivalent abstraction.
- Preserve dynamic adapter-specific option registration for process, Docker, and Kubernetes adapters.
- Add a static guard or runtime invariant check that prevents new direct `commander` imports outside the explicitly allowed migration/internal config package boundary.
- Prefer `cac` as the candidate lightweight parser behind the config package abstraction unless discovery finds a clear blocker.

## Non-Goals

- Do not implement concrete verser2 Host endpoint/TLS config fields in this track.
- Do not resume or modify verser2 transport behavior directly.
- Do not rewrite all `@scramjet/cli` subcommands unless required to eliminate direct Commander usage in scope or explicitly approved later.
- Do not remove old config services until replacement parity is proven.
- Do not break existing documented CLI flags, config files, or environment variables without explicit migration notes and compatibility aliases.
- Do not change runner protocol behavior.
- Do not treat `@scramjet/sequence-test` as the default replacement for existing package tests.

## Functional Requirements

### Unified Config Package

- Add a new package, preferably `packages/config` published as `@scramjet/config`.
- The package must expose APIs for defining configuration with Zod-backed schemas and option metadata.
- The package must support nested config paths and typed access to validated config values.
- The package must support defaults, environment variable overlays, CLI overlays, config file loading, package.json config section loading if selected during design, explicit runtime overrides, formatted validation errors, and public-safe masked output.
- The package must define one explicit precedence model and apply it consistently:

```text
defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides
```

- Merge semantics must preserve valid falsy values including `false`, `0`, and `""`.
- Merge semantics must be nullish/defined-aware and must not use `||` fallback behavior.
- Array merge behavior must be explicitly defined.
- Unknown-key behavior must reject by default for product config and allow only where intentionally configured.

### Zod Model

- Zod must be the canonical validation and type inference layer.
- Discovery must decide whether option metadata lives inside a custom wrapper around Zod or beside Zod schemas in descriptor maps.
- Discovery must decide whether defaults are represented with Zod `.default()` or external defaults maps.
- The package must support env/CLI coercion for booleans, numbers, strings, arrays, and structured values where needed.
- Secret masking must be declared in option metadata and used for public logging/output.
- JSON Schema generation may be supported later, likely via `zod-to-json-schema`, but is not mandatory for the initial implementation unless needed by migrated packages.

### CLI Parser Abstraction

- Direct parser usage must be hidden behind `@scramjet/config` or another Scramjet-owned abstraction.
- `cac` is the preferred candidate parser unless Phase 1 discovery finds it cannot satisfy current requirements.
- The selected parser path must support long flags, existing short aliases, booleans, strings, numbers, repeated/list flags where currently needed, help output, version output, async command handlers, and testable parsing without mutating process state.
- Parser implementation details must not leak into package public APIs, adapter interfaces, or `packages/types` contracts.

### Commander Replacement

- Remove direct `commander` imports from package code within the selected scope.
- Remove public references to `commander.Command`, especially from `packages/types/src/runtime-adapter.ts`.
- Replace `augmentOptions(options: Command): Command` with a Scramjet-owned registry/descriptor abstraction, such as a `RuntimeOptionRegistry`, finalized during design.
- Preserve the dynamic adapter option flow:

```text
1. STH parses enough information to determine the selected runtime adapter.
2. Selected adapter registers adapter-specific options through the new abstraction.
3. Final CLI parse validates common and adapter-specific options.
4. Parsed options feed into unified config loading.
```

- Docker, Kubernetes, and process adapter option registration must continue to work.

### File Loading

- The new config package must own config file loading for migrated consumers.
- It must support JSON and YAML at minimum.
- JSONC support should be included if easy and low-risk.
- Explicit config file paths from CLI must be supported.
- Absence of a config file must be allowed where current behavior allows it.
- Unreadable or invalid files must produce useful errors.
- Discovery must decide whether to use `c12`, `confbox`, existing `FileBuilder`, or a small custom loader.
- If `c12` is used, the design must document exactly which features are adopted and which are disabled.

### Backwards Compatibility

- Existing config schemas, persisted config shapes, CLI flags, and environment variable names must be preserved through aliases or compatibility mapping where needed.
- Compatibility behavior must be tested for migrated packages.
- Deprecated or compatibility-only names must be documented in the design and migration notes.
- Existing valid falsy configuration values must remain valid and must not be replaced by defaults.

### Package Coverage

- STH config and CLI behavior must be inventoried and designed for migration, including current flags in `packages/sth/src/bin/hub.ts`, `STHConfiguration`, config file loading, adapter-specific options, runtime adapter selection, and public masking.
- MultiManager config and CLI behavior must be inventoried and designed for migration, including existing CLI flags, manual merge logic, monitoring server config, S3 config, load-check config, and manager startup config.
- Manager config services must be inventoried and designed for migration or wrapping behind the new package.
- Runner boot config duplication in `runner-node` and `runner-bun` must be inventoried and designed for consolidation.
- `@scramjet/cli` command/subcommand complexity must be inventoried. Migration may be implemented in this track only if necessary to remove direct Commander usage within the agreed scope; otherwise it should be documented as follow-up work with a compatibility plan.

### Required Initial Implementation Deliverables

- Architecture/design document for `@scramjet/config`.
- Inventory of current config sources, consumers, schemas, CLI flags, env vars, and Commander imports.
- Library decision record for Zod, CLI parser, and config file loader.
- Initial `@scramjet/config` package skeleton.
- Tests for precedence, validation, masking, env coercion, CLI coercion/parsing, and compatibility aliases.
- Scramjet-owned adapter option registry/API replacing public `commander.Command` coupling.
- Updated Docker, Kubernetes, and process adapter option registration through the new abstraction.
- Static guard or invariant check preventing direct `commander` imports outside the new config package internals and any explicitly documented temporary migration allowlist.

## Non-Functional Requirements

- Changes must be incremental, test-conscious, and reviewable.
- Public CLI/API/config behavior must remain compatible unless an explicit migration note and compatibility path are approved.
- Runtime protocol behavior must remain unchanged.
- Configuration errors must be actionable for operators and contributors.
- The design must keep adapter-specific behavior explicit where process, Docker, and Kubernetes differ.
- The new package must work with the repository's strict TypeScript, CommonJS, ES2019 build setup.

## Acceptance Criteria

- A new Conductor track exists with approved `spec.md`, `plan.md`, `metadata.json`, and `index.md` artifacts.
- The track plan uses no more than 4 implementation phases: setup/discovery/TDD, new package implementation, replacement of old package surfaces, and verification/cleanup.
- The plan follows the repository workflow and includes phase completion manual verification tasks.
- The approved spec explicitly excludes concrete verser2 config field implementation while preserving extension points for the verser2 rollout track.
- The approved plan includes discovery of the initial files listed in the request.
- The approved plan includes tests before or alongside implementation for new config behavior and migration behavior.
- The approved plan includes validation commands such as package-local tests, `npm run build:packages`, and `npm run check:runtime-invariants` where relevant.

## Initial Files To Inspect

- `packages/sth/src/bin/hub.ts`
- `packages/types/src/sth-configuration.ts`
- `packages/types/src/runtime-adapter.ts`
- `packages/sth-config/src/config-service.ts`
- `packages/sth-config/src/default-config.ts`
- `packages/manager-config/src/config-service.ts`
- `packages/multi-manager/src/bin/start.ts`
- `packages/multi-manager/src/config/multi-manager-configuration.ts`
- `packages/multi-manager/src/lib/default-config.ts`
- `packages/multi-manager/src/types/multi-manager-types.ts`
- `packages/adapters/src/initialize-runtime-adapters.ts`
- `packages/adapter-docker/src/index.ts`
- `packages/adapter-kubernetes/src/index.ts`
- `packages/adapter-process/src/index.ts`
- `packages/utility/src/config/`
- `packages/utility/src/file/`
- `packages/utility/src/merge.ts`
- `packages/runner/src/bin/start-runner.ts`
- `packages/runner-node/src/boot-config.ts`
- `packages/runner-bun/src/boot-config.ts`
- `schemas/sth-config.schema.json`
- `schemas/startup-config.schema.json`
- `packages/cli/src/bin/index.ts`
- `packages/cli/src/lib/commands/`
- `packages/cli/src/lib/config/`
- `packages/cli/src/lib/platform/common.ts`

## Out Of Scope

- Concrete verser2 Host endpoint/TLS field implementation.
- Direct changes to verser2 Host creation, Manager/MultiManager verser2 attachment, or transport behavior.
- Full Docker/Kubernetes BDD unless required by a migrated behavior.
- Removing historical config packages before compatibility and parity are proven.
