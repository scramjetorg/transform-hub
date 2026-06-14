# Migration Plan And Risk Register

## Migration Plan

1. Add `@scramjet/config` with descriptor, registry, parser, loader, merge, masking, and validation primitives.
2. Replace public adapter option augmentation types with Scramjet-owned `RuntimeOptionRegistry` descriptors.
3. Update adapter packages to register descriptors instead of mutating Commander commands.
4. Migrate STH startup to parse through the new abstraction while preserving existing CLI flags and config mapping.
5. Migrate MultiManager config merging where feasible to fix falsy-value handling and centralize validation/masking.
6. Migrate `@scramjet/cli` commands, completions, platform initialization, and developer-tool command introspection away from Commander.
7. Consolidate runner-node and runner-bun boot config validation only if this remains low-risk and protocol-neutral.
8. Add a runtime invariant guard for direct Commander imports outside `@scramjet/config` internals.

## Risks

- CLI parser differences can change help output, boolean negation, default handling, or repeated flag behavior. Mitigation: keep descriptor tests and preserve existing flag names and aliases.
- Dynamic adapter option parsing currently peeks directly at `process.argv`. Mitigation: implement a two-stage parse that accepts explicit argv arrays and avoids global process mutation.
- MultiManager merge behavior currently relies on `||`; fixing it may surface previously hidden `false`, `0`, and empty string config values. Mitigation: cover falsy values in tests and treat this as intended compatibility preservation.
- Full `@scramjet/cli` migration is broad because completions and developer tooling use Commander internals. Mitigation: migrate command metadata first, keep behavior tests focused, and avoid parser types in public APIs.
- Adding package dependencies may affect workspace installation. Mitigation: add them only to `packages/config` and keep CommonJS/ES2019 output.
- Runner boot config consolidation could accidentally change protocol behavior. Mitigation: keep shape and error behavior compatible; defer if not necessary for Commander removal.

## Commander Boundary

- No direct `commander` imports should remain in package code after this track.
- Parser implementation details must live behind `@scramjet/config` and use `cac` rather than Commander.
- Commander may remain only in historical lockfile entries until dependencies are removed and the lockfile is updated.

## Deferrals

- Concrete verser2 Host endpoint and TLS fields are deferred to `verser2_rollout_20260613`.
- Removing legacy config packages is deferred until parity is proven.
