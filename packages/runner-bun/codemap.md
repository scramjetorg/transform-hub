# packages/runner-bun/

## Responsibility

Bun sequence runtime wrapper for the outer runner. Owns boot-config validation, optional direct sequence execution, and delegation to the Node runtime when host integration is required.

## Design/Patterns

Boot-config first startup with a split execution path: local Bun-only invocation for no-host cases, or protocol-compatible delegation to `runner-node` for full host/monitoring behavior.

## Data & Control Flow

`runner-bun.ts` reads argv[2], validates the JSON boot config, loads the sequence module directly when no host connection is present, otherwise resolves and invokes the Node bootstrap. The package exposes runtime constants and boot-config helpers for reuse.

## Integration Points

Depends on the outer runner boot-config contract, `@scramjet/runner-node` for delegated runtime execution, `@scramjet/symbols`, and Bun/Node module loading.
