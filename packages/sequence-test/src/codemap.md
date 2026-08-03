# packages/sequence-test/src/

## Responsibility

Implementation layer for the supported @scramjet/sequence-test package (scoped local sequence fixture/harness validation).

The source tree is organized around composable harness primitives:

- `index.ts`: top-level public API surface, `createSequenceTest`, `runSequence`, and barrel re-exports of all harness primitives and types.
- `runner-launcher.ts`: runner env/launch abstraction.
- `fake-instances-server.ts`: low-level transport shim for runner instance channels.
- `hub-harness.ts`: full mock Hub API + timeline/recording/assertion engine (1246 lines — largest file).
- `hub-mock.ts`: thin compatibility facade exporting `createHubMock` as `createHubHarness().hub`.
- `fixtures.ts`: sequence fixture creation and metadata validation.
- `captures.ts`: byte-stream and monitoring frame capture utilities.
- `input-driver.ts`: write helpers for sequence input payloads.
- `request-client.ts`: tiny HTTP helper used for sequence HTTP checks.

## Data flow

### 1) Launch preparation (`runner-launcher.ts`)

`createRunnerEnv` builds process env values expected by runner runtime (`SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, `INSTANCES_SERVER_HOST/PORT`, `INSTANCE_ID`).

`createRunnerLaunchPlan` adds `process.execPath` + resolved start-runner script path (`resolveRunnerEntry`) and stdio wiring for test transport interception.

Engine requirements are either:
- explicit in options (`engines`), validated as string map, or
- resolved by runtime (`node >=16`, `python3 >=3.8`, `bun >=1`).

### 2) Sequence execution path (`index.ts`)

`createSequenceTest` returns a `SequenceTestHarness` with:
- lifecycle control methods (`start`, `close`, `waitForCompletion`)
- I/O and monitoring bridges (`input`, `output`, `logs`, `monitoring`)
- assertion accessor (`assert`)

`runSequence` composes these primitives and currently short-circuits to direct execution for node mode (dynamic require, function invocation, ndjson-style output writing, monitoring frame injection).

### 3) Capture plumbing (`captures.ts`)

- `createByteCapture` -> in-memory chunk store (`write`, `capture`, `raw`, `text`, `lines`).
- `createOutputCapture` extends output capture with `ndjson()` parsing.
- `createMonitoringCapture` parses framed lines into `unknown[][]`, supports completion waiters through `waitForCompletion`, and emits `frames()` snapshots.
- `createSequenceAssertions` gives lightweight checks for completion + runtime error conditions in monitoring frames.

### 4) Input path (`input-driver.ts`)

`createInputDriver` turns a writable stream into content-type aware input APIs:
- `text`, `bytes`, `ndjson`, `stream`
- emits `content-type` header only on first payload
- enforces idempotent `end()`.

### 5) Host transport simulation (`fake-instances-server.ts`)

- Implements a TCP server that parses Scramjet channel framing (header + payload).
- Tracks connected sockets/channels, raw buffers per channel, parsed monitoring frames, and harness-side errors.
- Patches `net.connect`/`createConnection` to map ephemeral client sockets by local port for richer socket correlation.
- Exposes `awaitChannel(idx, timeout)` to synchronize tests waiting on protocol channels.

### 6) Hub mock (`hub-harness.ts`, `hub-mock.ts`)

- `createHubHarness` tracks:
  - registered routes
  - full request/response timeline
  - localStorage operations
  - logs/events/lifecycle/api routes/space calls
- Supports assertions over timeline (`called`, `callCount`, `body`, `order`) and returns canned/default API behavior.
- Normalizes method/path, body parsing (JSON/buffers/streams), and response helpers (text/json, optional stream body).
- **V2 client integration**: provides `hubClient()` and `spaceClient()` on `HubContext`, with `v2HubClient`/`v2SpaceClient` implementations that delegate to `hub.handle()`. Default responses for `GET /api/v2/status` (`{ status: "ok" }`) and `GET /api/v1/cpm/api/v2/hubs` (`{ items: [...] }`).
- `createHubMock` is a minimal convenience wrapper around `createHubHarness().hub`.

### 7) Fixtures (`fixtures.ts`)

- `createSequenceFixture` writes provided file map to temp fixture directory.
- `createNodeSequenceFixture`/`createPythonSequenceFixture`/`createBunSequenceFixture` set defaults.
- `resolveSequenceFixtureMetadata` reads and validates fixture `package.json`, resolves `main` path safely, and returns normalized `runtimeKind` via `selectRuntimeKind`.

### 8) HTTP helpers (`request-client.ts`)

- `createSequenceRequestClient` provides tiny HTTP `fetch`/`get`/`post` helper over host+port.
- `createSequenceRequestClientFromMonitoring` derives API host/port from a monitoring frame payload (`exposeHost`, `exposePort`).

## Integration notes

- `sequence-test` is designed to plug into tests that would otherwise require a live runner process + hub infrastructure.
- It intentionally reuses runner protocol constants/types and mirrors existing runner endpoint conventions for compatibility.
- The package is supported for scoped local sequence fixture/harness validation and is not a full parity replacement for a real Hub + runner deployment.
- 12 test fixtures exist including `v2-client-calls/` (new — exercises `hubClient().status.get()` and `spaceClient().hubs.get()` via the v2 canonical API).
- Harness tests (14 spec files in `test/harness/`) cover all primitives with Node, Python, and Bun runtime variants.
