# packages/runner-node/src/

## Responsibility

Inner Node runtime implementation details: reading/writing boot config (with verser2 runtime section), fd-stream transport, host channel setup via `HostClient`, verser2 broker agent creation, context construction, handshake, control/monitor wiring, and sequence invocation.

## Design / Patterns

- **Phase-separated helpers**: boot config, fd handling, context builders, transport helpers, lifecycle management, and sequence execution are split by concern.
- **HostClient with verser2 broker**: `host-client.ts` has been extended to accept a `verser2Runtime` config — when present, it uses `@signicode/verser2-guest-node` `createVerserBroker()` to create an HTTP `Agent` for the sequence's API calls, replacing the legacy direct-socket approach for outbound hub requests.
- **Selective channel init**: `HostClient.init(id, channels)` accepts a subset of channels; the REQUESTS channel is excluded when verser2 runtime is configured.
- **Dependency injection friendly**: `bootstrap` accepts override hooks (`BootstrapOverrides`) for testing and controlled sequence loading.
- **Streaming-first internals**: transforms input through `DataStream` + content-type mapping; all monitoring/control messages are streamed via `writeMonitoring`/`wireControlStream` utilities.
- **Host-aware vs local fallback**: branch on presence of host coordinates; local mode bypasses `api-client` transport and uses discard adapters.

## Data & Control Flow

`bootstrap()` reads boot config -> creates fd streams -> loads sequence module -> if host config exists, connects `HostClient` (initiating verser2 broker if configured), performs ping, opens control channel, maps input headers -> builds API-backed app context -> executes sequence -> emits monitoring and lifecycle frames -> disconnects host (closes verser2 broker) and exits.

Without host config: builds sequence context only, discards output, marks input closed, executes locally, and still emits local monitoring state.

## Integration Points

Integrates host transport (`HostClient` with optional verser2 broker), verser2 runtime request metadata (`getApiBase()` returns hub target domain URL when configured), API server/client helpers, `RunnerLifecycle`, `RunnerAppContext`, and shared `@scramjet` types/symbols.
