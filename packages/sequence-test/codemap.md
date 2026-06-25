# packages/sequence-test/

## Responsibility

**Supported** test harness package for Scramjet Transform Sequence testing (scoped to local sequence fixture/harness validation).

The package provides a lightweight way to exercise sequence execution paths through the runner protocol without standing up a full Transform Hub stack. It currently offers:

- Runtime-aware launch configuration and plan generation (`runner-launcher.ts`)
- Fake instances transport to emulate host/runtime monitoring channels (`fake-instances-server.ts`)
- Lightweight hub and host mock for API behavior and call assertions (`hub-harness.ts`, `hub-mock.ts`)
- Fixture generation and metadata resolution (`fixtures.ts`)
- Input and output side captures plus basic monitoring/assertion helpers (`captures.ts`, `input-driver.ts`, `request-client.ts`)

## Design / Patterns

- **Protocol-driven harness design**: the API leans on runner protocol semantics (runner env vars, instance ID, monitoring channel format, monitoring frames) and reuses existing runtime contracts from `@scramjet/runner`.
- **Capture-first testing model**: mutable in-memory buffers and frame queues are used for output/logging/monitoring; assertions are explicit and mostly synchronous over captured timelines.
- **Route-first dispatch with defaults**: `hub-harness` supports explicit route registration for targeted tests, then deterministic fallback handlers for standard Hub API endpoints (`/version`, `/config`, `/topics`, `/rpc`, `/sequences`, `/instances`, etc.).
- **Ephemeral fixture workspace**: `createSequenceFixture` creates temp directories in `os.tmpdir()` and writes provided file maps, validating relative paths and sequence entry points.
- **Lifecycle simulation**: hub context tracks localStorage, logger, lifecycle, events, and API route declarations into timeline arrays so tests can assert sequence-host interactions deterministically.
- **V2 canonical API client support**: `hub-harness` now provides `hubClient()` and `spaceClient()` on the `HubContext`, with default endpoint responses for `GET /api/v2/status` and `GET /api/v1/cpm/api/v2/hubs`. Internal `v2HubClient`/`v2SpaceClient` delegators dispatch through `hub.handle()` for request recording.
- **Multi-runtime fixtures**: dedicated fixture generators for Node, Python, and Bun with auto-resolved runtime kinds.

## Data and control flow

1. **Fixture + metadata resolution** (`fixtures.ts`): fixture files are written to a temp dir, `package.json` is validated (main + engines), and metadata is resolved into executable path/runtime kind.
2. **Launch plan creation** (`runner-launcher.ts`): runner env (SEQUENCE_PATH, SEQUENCE_INFO, INSTANCES_SERVER_* etc.), runtime-specific defaults, and resolved `start-runner` entry are assembled into a launch command object.
3. **Runner communication** (`fake-instances-server.ts`): monkey-patches `net.connect`/`createConnection` locally to intercept instance-channel sockets and collect monitoring/raw frames, providing `awaitChannel()` by channel index.
4. **Sequence interaction surface** (`runSequence`, `createSequenceTest`, exports): captures, input driver, request helpers, and assertions are composed for user-facing API calls.
5. **Host-side simulation** (`hub-harness.ts` + `hub-mock.ts`): the hub receives synthetic requests, normalizes/matches routes, emits timeline events, returns canned responses, and exposes assertion helpers over recorded calls. Supports v2 `hubClient().status.get()` and `spaceClient().hubs.get()` through internal v2 client delegation.
6. **Assertions**: `captures.ts` provides `createSequenceAssertions` for completion + runtime error checks, while `hub-harness` exposes `called()`, `callCount()`, `body()`, `order()` over the request timeline.

## Integration points

- `packages/runner/src/bin/start-runner.ts` (entrypoint resolution via `resolveRunnerEntry`)
- `@scramjet/runner` (runner protocol contracts and launch semantics)
- `@scramjet/symbols` (runtime selection and message frame constants)
- `@scramjet/sequence-types` (sequence-facing AppContext type checks for fixture/harness validation)
- `packages/runner-*` runtimes are exercised as external adapters through generated runner plans (node/python/bun paths are supported by API surface).
- Test fixtures include `v2-client-calls/` (exercises `hubClient().status.get()`/`spaceClient().hubs.get()`), `appcontext/`, `events/`, `exposed-api/`, `hub-calls/`, `lifecycle-calls/`, `map-ndjson/`, `ordered-behavior/`, `python-echo/`, `space-minimal/`, `stream-behavior/`, and `bun-direct/`.

## Current state and caveats

- The package is **supported** for scoped local sequence fixture and hub-harness validation. It is not a full live Hub/process/Docker/Kubernetes parity replacement.
- Public API is available and used across tests.
- `runSequence` currently includes a simplified node-only execution shortcut; full multi-runtime process orchestration is not yet production complete.
- Harness behavior is intentionally permissive for testing and observability, trading some runtime parity for speed and determinism.
- The supported public exports used for AppContext fixture validation are: `createHubHarness`, `createHubMock`, `createSequenceFixture`, `createNodeSequenceFixture`, `runSequence`, `resolveSequenceFixtureMetadata`, `createSequenceAssertions`, and the `HubHarness`/`HubMock`/`HubContext` types.
