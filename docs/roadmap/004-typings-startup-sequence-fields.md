# Proposal: Type Startup-Managed Sequence Fields

| Field | Value |
|-------|-------|
| Title | Type startup-managed sequence fields |
| Category | typings |
| Scope | packages/types, packages/sth-config |
| Breaking | no |

## Problem Statement

The startup config format accepts fields such as `sequenceName`, `instanceName`, `required`, `restartLimit`, and `appConfig`, but these fields are not fully represented in the shared TypeScript type definitions. Consumers of `@scramjet/types` must fall back to `any` or local interfaces.

## Current Behavior

- `StartupSequence` or similar interfaces are either missing or only partially typed.
- `appConfig` is not declared as a structured object, so consumers cannot get completions for per-sequence configuration.
- Type-checking a hub wrapper that emits startup config requires custom types outside the repo.

## Expected Behavior

- A single, exported `StartupSequence` interface lists all supported fields with correct optionality.
- `appConfig` is typed as `Record<string, unknown>` or a stricter shape if the host already validates keys.
- `StartupConfig` (the top-level array/container) is also exported.

## Proposed Change

1. In `packages/types` (or the appropriate types package), add:
   ```ts
   export interface StartupSequence {
     id?: string;
     sequenceName?: string;
     instanceName?: string;
     required?: boolean;
     restartLimit?: number;
     appConfig?: Record<string, unknown>;
     args?: unknown[];
   }

   export interface StartupConfig {
     sequences: StartupSequence[];
   }
   ```
2. Update `packages/sth-config` schema validator to reference the same shapes so JSON validation and TypeScript stay in sync.
3. Re-export the interfaces from any convenience packages such as `@scramjet/sth-config`.

## Backwards Compatibility

No breaking changes. Purely additive types. Existing code that uses `any` will continue to compile.

## Testing Plan

- Type-check a standalone script that imports `StartupSequence` from `@scramjet/types`.
- Verify the config validator unit tests still pass after linking the TypeScript shape to the JSON schema.

## References

- `docs/read-more/sth-config.md`
- `packages/sth-config/src/config-service.ts`
