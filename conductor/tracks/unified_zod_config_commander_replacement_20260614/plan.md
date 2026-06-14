# Implementation Plan: Unified Zod Config and Commander Replacement

## Phase 1: Setup, Discovery, Design, And TDD Baseline

- [ ] Task: Confirm package entrypoints, current behavior, and compatibility constraints
    - [ ] Read root `codemap.md` and relevant package codemaps before editing package code.
    - [ ] Inspect all initial files listed in `spec.md`.
    - [ ] Inventory all current config sources, consumers, config file formats, env vars, CLI flags, defaults, merge behavior, and masking behavior.
    - [ ] Inventory all `commander` imports and public `commander.Command` type references.
    - [ ] Identify which CLI flags and config fields are stable public API and must be preserved as aliases.
    - [ ] Identify persisted config compatibility constraints for STH, MultiManager, Manager, runner boot config, and CLI profile/session config.

- [ ] Task: Finalize `@scramjet/config` architecture
    - [ ] Decide final package name and workspace path, preferring `packages/config` / `@scramjet/config` unless a conflict exists.
    - [ ] Decide final Zod schema/metadata model: wrapper API versus descriptor map beside Zod schemas.
    - [ ] Decide default representation: Zod `.default()` versus external defaults map.
    - [ ] Define nested path representation and typed access conventions.
    - [ ] Define secret masking metadata and masked output behavior.
    - [ ] Define unknown-key policy, including reject-by-default product config behavior and intentional escape hatches.
    - [ ] Define array merge behavior.
    - [ ] Define compatibility alias behavior for old config keys, CLI flags, and env vars.
    - [ ] Document verser2 extension hooks without implementing concrete verser2 Host/TLS fields in this track.

- [ ] Task: Finalize library decisions
    - [ ] Validate `cac` against required CLI behavior: long flags, short aliases, booleans, strings, numbers, repeated/list flags, help, version, async handlers, and process-independent parsing.
    - [ ] Select config file loader: `c12`, `confbox`, existing `FileBuilder`, or a focused custom loader.
    - [ ] If using `c12`, document adopted and disabled features.
    - [ ] Decide whether JSONC support is included in the initial implementation.
    - [ ] Record the decisions in an architecture/design document.

- [ ] Task: Establish tests before or alongside implementation
    - [ ] Add or plan package-local AVA tests for precedence: defaults < config file < package.json config section < .env < process.env < CLI < explicit runtime overrides.
    - [ ] Add tests for preserving valid falsy values: `false`, `0`, and `""`.
    - [ ] Add tests for validation error formatting.
    - [ ] Add tests for env and CLI coercion of booleans, numbers, strings, arrays, and structured values where supported.
    - [ ] Add tests for secret masking.
    - [ ] Add tests for unknown-key rejection and intentional allow behavior.
    - [ ] Add tests for compatibility aliases.
    - [ ] Add tests for adapter-specific option registration and final parse behavior.

- [ ] Task: Produce architecture artifacts
    - [ ] Write the `@scramjet/config` architecture/design document.
    - [ ] Write the config and Commander inventory document.
    - [ ] Write the migration plan and risk register.
    - [ ] Document deferred work for concrete verser2 config fields and, if needed, full `@scramjet/cli` migration.

- [ ] Task: Run phase validation
    - [ ] Run the narrowest validation available for discovery/design artifacts, such as lint or markdown/schema checks if present.
    - [ ] Record any skipped validation and the reason.

- [ ] Task: Conductor - User Manual Verification 'Phase 1: Setup, Discovery, Design, And TDD Baseline' (Protocol in workflow.md)

## Phase 2: New `@scramjet/config` Package Implementation

- [ ] Task: Add package skeleton
    - [ ] Add `packages/config` with workspace manifest, TypeScript config, exports, source entrypoint, README or package docs, and AVA test setup matching existing package conventions.
    - [ ] Add Zod dependency and selected parser/file-loader dependencies.
    - [ ] Wire package build scripts into existing workspace build conventions.
    - [ ] Keep package output compatible with CommonJS and ES2019 repository settings.

- [ ] Task: Implement core config declarations
    - [ ] Implement schema/option declaration APIs finalized in Phase 1.
    - [ ] Implement option metadata for env vars, CLI flags, descriptions, aliases, defaults, and secret masking.
    - [ ] Implement typed config loading result and formatted validation errors.
    - [ ] Implement explicit runtime override source support.

- [ ] Task: Implement source readers and precedence
    - [ ] Implement defaults extraction.
    - [ ] Implement config file loading for JSON and YAML.
    - [ ] Implement JSONC loading if selected in Phase 1.
    - [ ] Implement optional package.json config section loading if selected in Phase 1.
    - [ ] Implement `.env` and `process.env` overlay support with explicit precedence.
    - [ ] Implement CLI overlay support through the parser abstraction.
    - [ ] Implement nullish/defined-aware deep merge that preserves valid falsy values.
    - [ ] Implement explicit array merge behavior.

- [ ] Task: Implement parser abstraction
    - [ ] Hide `cac` or the selected parser behind Scramjet-owned APIs.
    - [ ] Support long flags, existing short aliases, booleans, strings, numbers, repeated/list flags, help, version, and async handler needs required by migrated packages.
    - [ ] Ensure parser behavior is testable without mutating `process.argv` or process state.
    - [ ] Ensure parser types do not leak into package public APIs.

- [ ] Task: Implement masking and compatibility aliases
    - [ ] Implement masked public config output.
    - [ ] Implement config key aliases.
    - [ ] Implement env var aliases.
    - [ ] Implement CLI flag aliases.
    - [ ] Add migration/deprecation metadata if selected in Phase 1.

- [ ] Task: Validate package behavior
    - [ ] Run `npm --prefix packages/config test`.
    - [ ] Run package build validation for the new package or `npm run build:packages` if required by workspace wiring.
    - [ ] Fix any session-introduced failures before proceeding.

- [ ] Task: Conductor - User Manual Verification 'Phase 2: New @scramjet/config Package Implementation' (Protocol in workflow.md)

## Phase 3: Replace Old Package Surfaces And Commander Coupling

- [ ] Task: Replace public runtime adapter option API
    - [ ] Replace `commander.Command` usage in `packages/types/src/runtime-adapter.ts` with a Scramjet-owned runtime option registry/descriptor interface.
    - [ ] Preserve type compatibility for adapter authors where possible without preserving Commander types.
    - [ ] Update package exports and dependent type imports.

- [ ] Task: Preserve dynamic adapter option flow
    - [ ] Update `packages/adapters/src/initialize-runtime-adapters.ts` to use the new option registry and two-stage parse flow.
    - [ ] Update Docker adapter option registration in `packages/adapter-docker/src/index.ts`.
    - [ ] Update Kubernetes adapter option registration in `packages/adapter-kubernetes/src/index.ts`.
    - [ ] Update process adapter option registration in `packages/adapter-process/src/index.ts`.
    - [ ] Add tests proving adapter-specific options are registered, parsed, validated, and merged with correct precedence.

- [ ] Task: Migrate STH-facing config and CLI surface as needed
    - [ ] Replace direct Commander usage in `packages/sth/src/bin/hub.ts` with the new parser/config abstraction.
    - [ ] Preserve existing STH CLI flags, aliases, defaults, config file behavior, adapter selection, and public masking behavior.
    - [ ] Wrap or migrate `packages/sth-config` behavior behind the new package without deleting old services before parity is proven.
    - [ ] Add tests around current STH defaults, config file overrides, CLI overrides, adapter-specific options, and public-safe config output.

- [ ] Task: Migrate Manager and MultiManager config surfaces without concrete verser2 fields
    - [ ] Replace manual MultiManager merge logic with the new config package where feasible in this track.
    - [ ] Preserve existing MultiManager CLI flags and config aliases, including current SSL-related names as compatibility aliases if still present.
    - [ ] Migrate or wrap `packages/manager-config` behavior behind the new package where feasible.
    - [ ] Do not add concrete verser2 Host endpoint/TLS config fields; document the extension point for the verser2 rollout track.
    - [ ] Add tests for config file, env, CLI, validation, alias, and falsy-value behavior.

- [ ] Task: Consolidate runner boot config validation where feasible
    - [ ] Move shared boot config schema/validation for `runner-node` and `runner-bun` into the new config package or a shared runtime config module if Phase 1 design selected this scope.
    - [ ] Preserve runner protocol behavior and boot config shape.
    - [ ] Add parity tests for existing valid and invalid boot config cases.
    - [ ] Do not disrupt `runner-python` unless discovery identifies a required compatibility touchpoint.

- [ ] Task: Handle `@scramjet/cli` Commander usage according to Phase 1 decision
    - [ ] Inventory command/subcommand behavior, help, version, profiles, session config, async handlers, and completions.
    - [ ] If in scope, migrate command registration to the new abstraction while preserving public behavior.
    - [ ] If not in scope, document a temporary allowlist and follow-up migration track while ensuring package public APIs do not expose Commander.

- [ ] Task: Add static guard against direct Commander usage
    - [ ] Add or update `npm run check:runtime-invariants` to fail on direct `commander` imports outside `@scramjet/config` internals and any explicitly documented temporary allowlist.
    - [ ] Add guard coverage for public `commander.Command` references in `packages/types`.
    - [ ] Document the allowlist and removal path if temporary exceptions remain.

- [ ] Task: Validate migrated surfaces
    - [ ] Run `npm --prefix packages/config test`.
    - [ ] Run relevant package-local tests, such as `npm --prefix packages/multi-manager test`, `npm --prefix packages/sth test`, `npm --prefix packages/manager test`, and `npm --prefix packages/adapters test` where available.
    - [ ] Run `npm run build:packages` after integrated package changes.
    - [ ] Run `npm run check:runtime-invariants` after adding the Commander guard.
    - [ ] Record any unavailable package scripts or skipped validations with reasons.

- [ ] Task: Conductor - User Manual Verification 'Phase 3: Replace Old Package Surfaces And Commander Coupling' (Protocol in workflow.md)

## Phase 4: Verification, Cleanup, Documentation, And Handoff

- [ ] Task: Complete compatibility review
    - [ ] Compare migrated defaults, config file shapes, env vars, CLI flags, aliases, and masked outputs against the Phase 1 inventory.
    - [ ] Confirm no valid falsy values are lost during merge or fallback behavior.
    - [ ] Confirm unknown-key behavior matches the design.
    - [ ] Confirm old config services remain only where intentionally wrapped or deferred.

- [ ] Task: Complete Commander removal review
    - [ ] Confirm no direct `commander` imports remain outside `@scramjet/config` internals and documented temporary allowlist.
    - [ ] Confirm no public `commander.Command` references remain in `packages/types`.
    - [ ] Confirm Docker, Kubernetes, and process adapters use only Scramjet-owned option registry APIs.
    - [ ] Confirm parser implementation details do not leak into public APIs.

- [ ] Task: Update docs and generated artifacts
    - [ ] Update package README/docs for `@scramjet/config`.
    - [ ] Update migration notes for config aliases, CLI flag aliases, and any temporary allowlist items.
    - [ ] Update schema/docs generation notes if JSON Schema generation is included or deferred.
    - [ ] Update Conductor artifacts with validation results, risks, and deferred follow-ups.

- [ ] Task: Final validation
    - [ ] Run `npm --prefix packages/config test`.
    - [ ] Run all relevant migrated package-local tests that exist.
    - [ ] Run `npm run build:packages`.
    - [ ] Run `npm run check:runtime-invariants`.
    - [ ] Run `npm run lint` if changed files require repository-level lint validation.
    - [ ] Run BDD smoke tests only if migration crosses runtime execution behavior and package-level tests are insufficient.
    - [ ] Record failures using the workflow failure classification rules and fix session-introduced or in-scope failures.

- [ ] Task: Final handoff
    - [ ] Summarize implemented config package APIs.
    - [ ] Summarize migrated package surfaces and remaining allowlist/deferred items.
    - [ ] Summarize compatibility guarantees and known risks.
    - [ ] Identify the exact extension points for resuming `verser2_rollout_20260613`.
    - [ ] Confirm whether a follow-up `@scramjet/cli` full migration track is still needed.

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
- Full `@scramjet/cli` migration may be deferred only if Phase 1 records a temporary allowlist and follow-up plan.
- Removal of old config services is deferred until compatibility and parity are proven.
