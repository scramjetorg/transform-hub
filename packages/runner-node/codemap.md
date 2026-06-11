# packages/runner-node/

## Responsibility

Node runtime child process used by the outer launcher. It receives a boot config file, sets up split host transport, creates the sequence context, executes sequence functions, and reports lifecycle state back to host.

## Design / Patterns

- **Boot-config only input**: runtime config arrives via validated JSON from argv; legacy adapter env vars are not treated as runtime input.
- **Layered bootstrap**: modules compose handshake, context, lifecycle, and execution stages instead of one monolith.
- **Split channel model**: child reads/writes fd0..5 and delegates semantic channels to host connection ownership.
- **Lifecycle-centric error handling**: all terminal outcomes route through lifecycle and monitoring message emission.

## Data & Control Flow

`runner-node` bootstrap parses `process.argv[2]` and validates boot config, then opens fd4/fd5 via `createFdStreams`. If host coordinates are present it connects host channels (`RUNNER_NODE_CHANNELS`), builds app context with API/storage/proxy wiring, emits ping + healthy monitoring, maps input/output streams, wires control handlers, and runs the sequence.

On completion/failure it writes terminal monitoring frames, runs lifecycle cleanup, disconnects host channels, flushes monitoring, writes exit file, and returns exit code.

## Integration Points

Uses `@scramjet/types`, `@scramjet/symbols`, `@scramjet/api-client`, `@scramjet/api-server`, BPMux, and the outer runtime's boot-config + fd4/fd5 protocol contract.
