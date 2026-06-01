# packages/runner/

## Responsibility

Outer launcher for sequences. Validates adapter env, writes boot config, connects to host, and spawns the runtime-specific child process.

## Design Patterns

Split-owner transport: this package owns stdin/stdout/stderr/control/monitoring and delegates semantic sequence execution to runner-node or python.
Runtime selection is strategy-based via `selectExecutor()` and shell-compatible boot config handoff.

## Data & Control Flow

Env vars are parsed into `SequenceInfo` and `RunnerConnectInfo`, then a private boot JSON file is written and passed to the child. Host channels are opened first; child stdio is wired through raw pipes; lifecycle frames are observed and translated back into host disconnect/exit handling.

## Integration Points

Uses `@scramjet/api-client`, `@scramjet/api-server`, `@scramjet/client-utils`, host client transport, executor selection, and runner-node entry resolution.
