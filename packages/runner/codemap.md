# packages/runner/

## Responsibility

Outer runtime launcher for adapter-launched sequences. Validates env, writes boot config, opens host transport, and selects the Bun/Node/Python child runtime.

## Design/Patterns

Transport-owner wrapper: this package owns stdio/control/monitoring wiring while runtime packages own sequence execution. Runtime choice is strategy-based via `selectExecutor()` and per-runtime launcher resolution.

## Data & Control Flow

Adapter env is parsed into `SequenceInfo`/`RunnerConnectInfo`, persisted to a private boot JSON file, then passed to the selected child entry. Host channels are initialized first; child pipes are forwarded raw; terminal lifecycle frames drive cleanup and exit translation.

## Integration Points

Uses `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/client-utils`, `@scramjet/runner-bun`, `@scramjet/runner-node`, host client transport, and child-process spawning.
