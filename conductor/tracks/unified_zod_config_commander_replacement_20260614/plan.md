# Implementation Plan: Unified Zod Config and Commander Replacement

## Phase 1: Setup, Discovery, Design, And TDD Baseline

- [x] Task: Confirm package entrypoints, current behavior, and compatibility constraints
    - [x] Read root `codemap.md` and relevant package codemaps before editing package code.
    - [x] Inspect all initial files listed in `spec.md`.
    - [x] Inventory all current config sources, consumers, config file formats, env vars, CLI flags, defaults, merge behavior, and masking behavior.
    - [x] Inventory all `commander` imports and public `commander.Command` type references.
    - [x] Identify which CLI flags and config fields are stable public API and must be preserved as aliases.
    - [x] Identify persisted config compatibility constraints for STH, MultiManager, Manager, runner boot config, and CLI profile/session config.

- [x] Task: Finalize `@scramjet/config` architecture
    - [x] Decide final package name and workspace path, preferring `packages/config` / `@scramjet/config` unless a conflict exists.
    - [x] Decide final Zod schema/metadata model: wrapper API versus descriptor map beside Zod schemas.
    - [x] Decide default representation: Zod `.default()` versus external defaults map.
    - [x] Define nested path representation and typed access conventions.
    - [x] Define secret masking metadata and masked output behavior.
    - [x] Define unknown-key policy, including reject-by-default product config behavior and intentional escape hatches.
    - [x] Define array merge behavior.
    - [x] Define compatibility alias behavior for old config keys, CLI flags, and env vars.
    - [x] Document verser2 extension hooks without implementing concrete verser2 Host/TLS fields in this track.

- [x] Task: Finalize library decisions
    - [x] Validate `cac` against required CLI behavior: long flags, short aliases, booleans, strings, numbers, repeated/list flags, help, version, async handlers, and process-independent parsing.
    - [x] Select config file loader: `c12`, `confbox`, existing `FileBuilder`, or a focused custom loader.
    - [x] If using `c12`, document adopted and disabled features.
    - [x] Decide whether JSONC support is included in the initial implementation.
    - [x] Record the decisions in an architecture/design document.

- [x] Task: Establish tests before or alongside implementation
    - [x] Add or plan package-local AVA tests for precedence: defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides.
    - [x] Add tests for preserving valid falsy values: `false`, `0`, and `""`.
    - [x] Add tests for validation error formatting.
    - [x] Add tests for env and CLI coercion of booleans, numbers, strings, arrays, and structured values where supported.
    - [x] Add tests for secret masking.
    - [x] Add tests for unknown-key rejection and intentional allow behavior.
    - [x] Add tests for compatibility aliases.
    - [x] Add tests for adapter-specific option registration and final parse behavior.

- [x] Task: Produce architecture artifacts
    - [x] Write the `@scramjet/config` architecture/design document.
    - [x] Write the config and Commander inventory document.
    - [x] Write the migration plan and risk register.
    - [x] Document deferred work for concrete verser2 config fields and, if needed, full `@scramjet/cli` migration.

- [x] Task: Run phase validation
    - [x] Run the narrowest validation available for discovery/design artifacts, such as lint or markdown/schema checks if present.
    - [x] Record any skipped validation and the reason.

- [x] Task: Conductor - User Manual Verification 'Phase 1: Setup, Discovery, Design, And TDD Baseline' (Protocol in workflow.md)

## Phase 2: New `@scramjet/config` Package Implementation

- [x] Task: Add package skeleton
    - [x] Add `packages/config` with workspace manifest, TypeScript config, exports, source entrypoint, README or package docs, and AVA test setup matching existing package conventions.
    - [x] Add Zod dependency and selected parser/file-loader dependencies.
    - [x] Wire package build scripts into existing workspace build conventions.
    - [x] Keep package output compatible with CommonJS and ES2019 repository settings.

- [x] Task: Implement core config declarations
    - [x] Implement schema/option declaration APIs finalized in Phase 1.
    - [x] Implement option metadata for env vars, CLI flags, descriptions, aliases, defaults, and secret masking.
    - [x] Implement typed config loading result and formatted validation errors.
    - [x] Implement explicit runtime override source support.

- [x] Task: Implement source readers and precedence
    - [x] Implement defaults extraction.
    - [x] Implement config file loading for JSON and YAML.
    - [x] Implement JSONC loading if selected in Phase 1.
    - [x] Implement optional package.json config section loading if selected in Phase 1.
    - [x] Implement `.env` and `process.env` overlay support with explicit precedence.
    - [x] Implement CLI overlay support through the parser abstraction.
    - [x] Implement nullish/defined-aware deep merge that preserves valid falsy values.
    - [x] Implement explicit array merge behavior.

- [x] Task: Implement parser abstraction
    - [x] Hide `cac` or the selected parser behind Scramjet-owned APIs.
    - [x] Support long flags, existing short aliases, booleans, strings, numbers, repeated/list flags, help, version, and async handler needs required by migrated packages.
    - [x] Ensure parser behavior is testable without mutating `process.argv` or process state.
    - [x] Ensure parser types do not leak into package public APIs.

- [x] Task: Implement masking and compatibility aliases
    - [x] Implement masked public config output.
    - [x] Implement config key aliases.
    - [x] Implement env var aliases.
    - [x] Implement CLI flag aliases.
    - [x] Add migration/deprecation metadata if selected in Phase 1.

- [x] Task: Validate package behavior
    - [x] Run `npm --prefix packages/config test`.
    - [x] Run package build validation for the new package or `npm run build:packages` if required by workspace wiring.
    - [x] Fix any session-introduced failures before proceeding.

- [x] Task: Push branch before manual verification

- [x] Task: Conductor - User Manual Verification 'Phase 2: New @scramjet/config Package Implementation' (Protocol in workflow.md)

## Phase 3: Replace Old Package Surfaces And Commander Coupling

- [x] Task: Replace public runtime adapter option API
    - [x] Replace `commander.Command` usage in `packages/types/src/runtime-adapter.ts` with a Scramjet-owned runtime option registry/descriptor interface.
    - [x] Preserve type compatibility for adapter authors where possible without preserving Commander types.
    - [x] Update package exports and dependent type imports.

- [x] Task: Preserve dynamic adapter option flow
    - [x] Update `packages/adapters/src/initialize-runtime-adapters.ts` to use the new option registry and two-stage parse flow.
    - [x] Update Docker adapter option registration in `packages/adapter-docker/src/index.ts`.
    - [x] Update Kubernetes adapter option registration in `packages/adapter-kubernetes/src/index.ts`.
    - [x] Update process adapter option registration in `packages/adapter-process/src/index.ts`.
    - [x] Add tests proving adapter-specific options are registered, parsed, validated, and merged with correct precedence.

- [x] Task: Migrate STH-facing config and CLI surface as needed
    - [x] Replace direct Commander usage in `packages/sth/src/bin/hub.ts` with the new parser/config abstraction.
    - [x] Preserve existing STH CLI flags, aliases, defaults, config file behavior, adapter selection, and public masking behavior.
    - [x] Keep `packages/sth-config` behavior in place while routing STH CLI parsing through the new package without deleting old services before parity is proven.
    - [x] Validate current STH CLI parsing and adapter-specific options through package build and config parser coverage; old config service parity remains in place.

- [x] Task: Migrate Manager and MultiManager config surfaces without concrete verser2 fields
    - [x] Replace manual MultiManager merge logic with the new config package where feasible in this track.
    - [x] Preserve existing MultiManager CLI flags and config aliases, including current SSL-related names as compatibility aliases if still present.
    - [x] Review `packages/manager-config`; leave old service in place because it has no Commander coupling and removal is deferred until broader config parity.
    - [x] Do not add concrete verser2 Host endpoint/TLS config fields; document the extension point for the verser2 rollout track.
    - [x] Add tests for config file, env, CLI, validation, alias, and falsy-value behavior.

- [x] Task: Consolidate runner boot config validation where feasible
    - [x] Review shared boot config schema/validation for `runner-node` and `runner-bun`; leave unchanged because no Commander coupling exists and protocol behavior must remain stable.
    - [x] Preserve runner protocol behavior and boot config shape by avoiding unnecessary runner changes.
    - [x] Keep existing boot-config parity tests unchanged because runner config consolidation was not required for this phase.
    - [x] Do not disrupt `runner-python` because no required compatibility touchpoint was identified.

- [x] Task: Handle `@scramjet/cli` Commander usage according to Phase 1 decision
    - [x] Inventory command/subcommand behavior, help, version, profiles, session config, async handlers, and completions.
    - [x] If in scope, migrate command registration to the new abstraction while preserving public behavior.
    - [x] Confirm no temporary Commander allowlist remains.

- [x] Task: Add static guard against direct Commander usage
    - [x] Add or update `npm run check:runtime-invariants` to fail on direct `commander` imports or package dependencies.
    - [x] Add guard coverage for public `commander.Command` references in `packages/types`.
    - [x] Document that no temporary exceptions remain.

- [x] Task: Validate migrated surfaces
    - [x] Run `npm --prefix packages/config test`.
    - [x] Run relevant package-local tests, such as `npm --prefix packages/multi-manager test`, `npm --prefix packages/sth test`, `npm --prefix packages/manager test`, and `npm --prefix packages/adapters test` where available.
    - [x] Run `npm run build:packages` after integrated package changes and classify its auth-only dist install failure; rerun package build with `--no-distws --no-install` successfully.
    - [x] Run `npm run check:runtime-invariants` after adding the Commander guard.
    - [x] Record any unavailable package scripts or skipped validations with reasons.

- [x] Task: Push branch before manual verification

- [x] Task: Conductor - User Manual Verification 'Phase 3: Replace Old Package Surfaces And Commander Coupling' (Protocol in workflow.md)

## Phase 4: Verification, Cleanup, Documentation, And Handoff

- [x] Task: Complete compatibility review
    - [x] Compare migrated defaults, config file shapes, env vars, CLI flags, aliases, and masked outputs against the Phase 1 inventory.
    - [x] Confirm no valid falsy values are lost during merge or fallback behavior.
    - [x] Confirm unknown-key behavior matches the design.
    - [x] Confirm old config services remain only where intentionally wrapped or deferred.

- [x] Task: Complete Commander removal review
    - [x] Confirm no direct `commander` imports remain outside `@scramjet/config` internals and documented temporary allowlist.
    - [x] Confirm no public `commander.Command` references remain in `packages/types`.
    - [x] Confirm Docker, Kubernetes, and process adapters use only Scramjet-owned option registry APIs.
    - [x] Confirm parser implementation details do not leak into public APIs.

- [x] Task: Update docs and generated artifacts
    - [x] Update package README/docs for `@scramjet/config`.
    - [x] Update migration notes for config aliases, CLI flag aliases, and any temporary allowlist items.
    - [x] Update schema/docs generation notes if JSON Schema generation is included or deferred.
    - [x] Update Conductor artifacts with validation results, risks, and deferred follow-ups.

- [x] Task: Final validation
    - [x] Run `npm --prefix packages/config test`.
    - [x] Run all relevant migrated package-local tests that exist.
    - [x] Run `npm run build:packages`.
    - [x] Run `npm run check:runtime-invariants`.
    - [x] Run `npm run lint` if changed files require repository-level lint validation.
    - [x] Run BDD smoke tests only if migration crosses runtime execution behavior and package-level tests are insufficient.
    - [x] Record failures using the workflow failure classification rules and fix session-introduced or in-scope failures.

- [x] Task: Final handoff
    - [x] Summarize implemented config package APIs.
    - [x] Summarize migrated package surfaces and remaining allowlist/deferred items.
    - [x] Summarize compatibility guarantees and known risks.
    - [x] Identify the exact extension points for resuming `verser2_rollout_20260613`.
    - [x] Confirm whether a follow-up `@scramjet/cli` full migration track is still needed.

- [x] Task: Push branch before manual verification

- [ ] Task: Conductor - User Manual Verification 'Phase 4: Verification, Cleanup, Documentation, And Handoff' (Protocol in workflow.md)

## Validation Commands

- [ ] `npm --prefix packages/config test`
- [ ] `npm --prefix packages/multi-manager test` if available after migration touches MultiManager
- [ ] `npm --prefix packages/sth test` if available after migration touches STH
- [ ] `npm --prefix packages/manager test` if available after migration touches Manager
- [ ] `npm --prefix packages/adapters test` if available after adapter changes
- [ ] `npm run build:packages`
- [ ] `npm run check:runtime-invariants`
- [ ] `npm run lint` when changed-file or repository lint validation is relevant

## Explicit Deferrals

- Concrete verser2 Host endpoint/TLS config fields are deferred to `verser2_rollout_20260613`.
- Direct verser2 transport behavior changes are deferred to `verser2_rollout_20260613`.
- Full `@scramjet/cli` migration was completed in this track; no Commander allowlist remains.
- Removal of old config services is deferred until compatibility and parity are proven.
