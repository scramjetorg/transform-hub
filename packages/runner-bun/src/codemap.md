# packages/runner-bun/src/

## Responsibility

Bun runtime implementation helpers: boot config parsing/validation, runtime constants, and bootstrap delegation logic.

## Design/Patterns

Small validation and adapter helpers around JSON boot state. Keeps Bun-specific checks isolated from the runtime bootstrap entry.

## Data & Control Flow

`boot-config.ts` parses argv[2], validates the boot JSON shape, and returns a typed config. `index.ts` exports runtime identity and helpers, while the Bun entry uses them to choose between direct sequence execution and Node-runtime delegation.

## Integration Points

Uses `@scramjet/types`, filesystem/path APIs, Bun/Node module loading, and the `@scramjet/runner-node` bootstrap contract.
