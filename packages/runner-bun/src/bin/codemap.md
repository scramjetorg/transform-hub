# packages/runner-bun/src/bin/

## Responsibility

Executable Bun runtime entrypoint. Loads boot config, executes local sequences when possible, or hands off to the Node runtime bootstrap.

## Design/Patterns

Conditional bootstrap with explicit runtime delegation. The entry keeps Bun-specific validation local and reuses the Node runtime for host-backed execution.

## Data & Control Flow

Reads boot config path from `argv[2]`, validates the JSON payload, then either requires the sequence module directly or resolves `@scramjet/runner-node` and calls its bootstrap. Errors are surfaced to stderr and converted to process exit codes.

## Integration Points

Depends on `boot-config`, `@scramjet/runner-node`, `@scramjet/symbols`, and Bun/Node process and module resolution APIs.
