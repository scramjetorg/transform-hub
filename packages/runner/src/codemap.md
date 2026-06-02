# packages/runner/src/

## Responsibility

Runner launcher and runtime-executor plumbing. Contains the outer startup entrypoint, host client mediation, runtime selection, and child-process helpers.

## Design/Patterns

Small adapter-style modules around host transport and `child_process.spawn`. Executor selection is data-driven from sequence `engines`, defaulting to Node when Bun/Python are not requested.

## Data & Control Flow

Startup validates adapter env, writes boot config, initializes host channels, then spawns the selected runtime child with fixed fd wiring. Control and monitoring frames remain raw byte streams; lifecycle observers translate child termination into host disconnect and exit propagation.

## Integration Points

Integrates with host API client/server code, `@scramjet/types`, `@scramjet/symbols`, `@scramjet/runner-node`, `@scramjet/runner-bun`, `@scramjet/runner-python`, and Node stream/process APIs.
