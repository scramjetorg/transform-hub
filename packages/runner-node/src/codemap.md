# packages/runner-node/src/

## Responsibility

Inner Node runtime implementation details: reading/writing boot config (with verser2 runtime section), fd-stream transport, host channel setup via `HostClient`, verser2 broker agent creation, context construction, handshake, control/monitor wiring, input-stream parsing, and sequence invocation.

## Design / Patterns

- **Phase-separated helpers**: boot config, fd handling, context builders, transport helpers, lifecycle management, input stream, local storage, and sequence execution are split by concern.
- **HostClient with verser2 broker**: `host-client.ts` has been extended to accept a `verser2Runtime` config — when present, it uses `@signicode/verser2-guest-node` `createVerserBroker()` to create an HTTP `Agent` for the sequence's API calls, replacing the legacy direct-socket approach for outbound hub requests.
- **Selective channel init**: `HostClient.init(id, channels)` accepts a subset of channels; the default set (`ALL_CHANNELS`) includes STDIN/STDOUT/STDERR/CONTROL/MONITORING/IN/OUT/LOG/REQUESTS. `RUNNER_NODE_CHANNELS` = IN/OUT/LOG/REQUESTS. The REQUESTS channel is excluded when verser2 runtime or `requestsUnsupported` is configured.
- **Dependency injection friendly**: `bootstrap` accepts override hooks (`BootstrapOverrides`) for testing and controlled sequence loading.
- **Streaming-first internals**: transforms input through `DataStream` + content-type mapping; all monitoring/control messages are streamed via `writeMonitoring`/`wireControlStream` utilities.
- **Host-aware vs local fallback**: branch on presence of host coordinates; local mode bypasses `api-client` transport and uses discard adapters.
- **Module files**:
  - `types.ts`: shared types (`SequenceLocalContext`, `SequenceFunction`, `ControlDispatch`, `BuildContextDeps`, `BuildAppContextDeps`, `BootstrapOverrides`, etc.).
  - `boot-config.ts`: reads/parses/validates `RunnerNodeBootConfig` JSON (including `verser2Runtime` block).
  - `fd-streams.ts`: wraps fd0–fd5 into `RunnerNodeFdStreams` (stdin/stdout/stderr/controlIn/monitoringOut).
  - `host-client.ts`: host TCP socket connectivity per channel + verser2 broker agent.
  - `context.ts`: `buildSequenceContext()` (local) and `buildAppContext()` (host-backed with v2 API clients).
  - `runner-app-context.ts`: `AppContext` implementation with v1/v2 hub/space clients, `APIExpose`, `ILocalStorage`, event emitter, lifecycle handler registries.
  - `lifecycle.ts`: `RunnerLifecycle` — STOP/KILL handler with keepAlive tracking.
  - `run-sequence.ts`: iterates sequence functions, pipes DataStream/Readable interop, emits PANG.
  - `input-stream.ts`: reads HTTP-style input headers and maps content types to DataStream variants.
  - `handshake.ts`: builds PING message (`[RunnerMessageCode.PING, PingMessageData]`).
  - `local-storage-agent.ts`: `ILocalStorage` via STORAGE_UPDATE monitoring frames.
  - `message-utils.ts`: `writeMessageOnStream()` helper.
  - `utils.ts`: `resolveSequenceFunctions`, `loadSequenceModule`, `wireControlStream`, `writeMonitoring`, `writeProcessExitFile`, `writeLegacyExitFileSecure`, `makeOutputDiscard`.

## Data & Control Flow

`bootstrap()` reads boot config -> creates fd streams -> loads sequence module -> if host config exists, connects `HostClient` (initiating verser2 broker if configured), performs PING handshake, reads input headers, opens control channel, builds API-backed app context (v1+v2 clients) -> executes sequence via `runSequence()` -> emits monitoring and lifecycle frames -> disconnects host (closes verser2 broker) and exits.

Without host config: builds sequence context only, discards output, marks input closed, executes locally, and still emits local monitoring state.

## Integration Points

Integrates host transport (`HostClient` with optional verser2 broker), verser2 runtime request metadata (`getApiBase()` returns hub target domain URL when configured), API server/client helpers, `RunnerLifecycle`, `RunnerAppContext`, and shared `@scramjet` types/symbols.
