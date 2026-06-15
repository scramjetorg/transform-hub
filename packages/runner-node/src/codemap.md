# packages/runner-node/src/

## Responsibility

Inner Node runtime implementation details: reading/writing boot config, fd-stream transport, host channel setup, context construction, handshake, control/monitor wiring, and sequence invocation.

## Design / Patterns

- **Phase-separated helpers**: boot config, fd handling, context builders, transport helpers, lifecycle management, and sequence execution are split by concern.
- **Dependency injection friendly**: `bootstrap` accepts override hooks (`BootstrapOverrides`) for testing and controlled sequence loading.
- **Streaming-first internals**: transforms input through `DataStream` + content-type mapping; all monitoring/control messages are streamed via `writeMonitoring`/`wireControlStream` utilities.
- **Host-aware vs local fallback**: branch on presence of host coordinates; local mode bypasses `api-client` transport and uses discard adapters.

## Data & Control Flow

`bootstrap()` reads boot config -> builds fd streams -> loads sequence module -> if host config exists, connects `HostClient`, performs ping, opens control channel, maps input headers -> builds API-backed app context -> executes sequence -> emits monitoring and lifecycle frames -> disconnects host and exits.

Without host config: builds sequence context only, discards output, marks input closed, executes locally, and still emits local monitoring state.

## Integration Points

Integrates host transport (`HostClient`), verser2 runtime request metadata, API server/client helpers, `RunnerLifecycle`, `RunnerAppContext`, and shared `@scramjet` types/symbols.
