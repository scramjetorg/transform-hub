# Final Handoff

## Implemented Config APIs

- `createOptionRegistry()` and `RuntimeOptionRegistry` collect Scramjet-owned option descriptors for STH and runtime adapter option registration.
- `parseCliOptions()` parses option descriptors without exposing parser implementation types.
- `loadConfig()` applies the documented precedence model and validates through Zod.
- `mergeConfig()` preserves valid falsy values and replaces arrays explicitly.
- `maskConfig()` masks descriptor-marked secret values for public-safe output.
- `formatZodError()` formats Zod validation failures for operator-facing errors.
- Native command descriptors in `command-model.ts` resolve nested `si command subcommand --arg` style commands without Commander shims.

## Migrated Surfaces

- STH startup now parses common and adapter-specific CLI options through `@scramjet/config` descriptors.
- Docker, Kubernetes, and process adapters register runtime options through Scramjet-owned descriptors instead of mutating a Commander command.
- `packages/types/src/runtime-adapter.ts` no longer exposes `commander.Command` in public adapter contracts.
- MultiManager startup uses native option descriptors and its config merge preserves valid falsy values.
- `@scramjet/cli` command modules were migrated to a native descriptor tree with descriptor-based completion and developer tooling.
- Direct `commander` imports and package manifest dependencies were removed from package code.
- `npm run check:runtime-invariants` now includes a Commander guard.

## Compatibility Guarantees

- Public STH, MultiManager, and CLI command names, aliases, positional arguments, and option names were preserved where represented by existing commands.
- Dynamic adapter option registration remains two-stage: parse runtime adapter, register selected adapter options, parse final options.
- Runner protocol and boot config shapes were intentionally left unchanged.
- Concrete verser2 Host endpoint/TLS fields remain deferred to `verser2_rollout_20260613`.

## Validation Summary

- `npm --prefix packages/config test`: passed.
- `npm --prefix packages/cli test`: passed.
- `npm --prefix packages/multi-manager test`: passed.
- `npm --prefix packages/adapters test`: passed.
- `npm run check:runtime-invariants`: passed.
- `scripts/build-all.js -v -w modules --ts-config tsconfig.build.json --no-distws --no-install`: passed.
- `npm run build:packages`: TypeScript/prepack completed, then final dist install failed due unauthenticated private GitHub package access for `@signicode/verser-common`; classified as environment/auth and recorded in `phase3-validation.md`.

## Remaining Deferrals

- Removing legacy config packages (`@scramjet/sth-config`, `@scramjet/manager-config`, utility config classes) remains deferred until broader parity and migration coverage is intentionally planned.
- JSON Schema generation from Zod is not implemented in this track; existing schema files remain in place.
