# packages/sth/src/

## Responsibility

Runtime wrapper code for starting STH from a configuration object.

## Design/Patterns

Minimal orchestration layer plus shared identity exports for process-wide lookup.

## Data & Control Flow

`STH` stores config and delegates to `startHost`; shared exports expose the hub symbol used for instance discovery and CLI/bootstrap coordination.

## Integration Points

Used by `sth` consumers and the CLI entrypoint; integrates with `@scramjet/host` and `@scramjet/types`.
