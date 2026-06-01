# packages/sth/src/

## Responsibility

Runtime entry and wrapper code for starting STH with a provided configuration.

## Design Patterns

Minimal orchestration layer plus constant export for shared process identity.

## Data & Control Flow

`STH` stores config and delegates to `startHost`; `lib/index.ts` exports the hub symbol used for process-wide instance discovery.

## Integration Points

Used by `sth` consumers and the CLI entrypoint; integrates with `@scramjet/host` and `@scramjet/types`.
