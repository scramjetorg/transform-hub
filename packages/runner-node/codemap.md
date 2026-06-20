# packages/runner-node/

## Responsibility

Node runtime child process used by the outer launcher. It receives a boot config file (containing optional `verser2Runtime` block), sets up split host transport via `HostClient` (with verser2 broker for sequence API calls), creates the sequence context, executes sequence functions, and reports lifecycle state back to host.

## Design / Patterns

- **Boot-config only input**: runtime config arrives via validated JSON from argv; `verser2Runtime` block enables verser2-based HTTP agent for `context.hub` API calls.
- **Verser2 broker integration**: when boot config includes `verser2Runtime`, `HostClient.initVerser2BrokerAgent()` creates a `@signicode/verser2-guest-node` broker and uses `createAgent()` to provide outbound HTTP connectivity to the hub.
- **Selective channel opening**: `HostClient` accepts a channel set during `init()`; REQUESTs channel is excluded when verser2 runtime is configured (since the verser2 broker handles hub requests).
- **Layered bootstrap**: modules compose boot-config, fd-streams, handshake, context, lifecycle, and execution stages.
- **Split channel model**: child reads/writes fd0..5 and delegates semantic channels (IN/OUT/LOG) to host connection ownership via `LocalChannelServer` from the outer runner.

## Data & Control Flow

`runner-node` bootstrap parses `process.argv[2]` and validates boot config, then opens fd4/fd5 via `createFdStreams`. If host coordinates are present it connects host channels (`RUNNER_NODE_CHANNELS`) via `HostClient.init()`, builds app context with API/storage/proxy wiring, emits ping + healthy monitoring, maps input/output streams, wires control handlers, and runs the sequence.

On completion/failure it writes terminal monitoring frames, runs lifecycle cleanup, disconnects host channels (including verser2 broker `close()`), flushes monitoring, writes exit file, and returns exit code.

## Integration Points

Uses `@scramjet/types`, `@scramjet/symbols`, `@scramjet/api-client`, `@scramjet/api-server`, `@signicode/verser2-guest-node` (for broker agent), and the outer runtime's boot-config + fd4/fd5 protocol contract.

Relies on `LocalChannelServer` from the outer runner for local channel address resolution.
