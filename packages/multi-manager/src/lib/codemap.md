# packages/multi-manager/src/lib/

## Responsibility

Core orchestration library for the Multi-Manager. Contains the main `MultiManager` class, Host/MultiHost connection management, Manager lifecycle stores, audit log aggregation, port-range parsing, and default configuration.

## Design/Patterns

- **`MultiManager`**: Central orchestrator. Owns the HTTP API server (`APIExpose`), Verser TCP broker (`Verser`), sub-Manager registry (`ManagersStore`), MultiHost registry (`MultiHostControllerStore`), load check, health check, audit aggregator, and common log pipe. Sets up REST routing on start and handles all Host/MultiHost connection events.
- **`MultiHostController`**: Wraps a single `VerserConnection` to a remote MultiHost. Establishes two Verser channels (channel 0 for request forwarding, channel 1 for log streaming). Supports reconnect via `reconnect()`. Forwards HTTP requests to the remote MultiHost via `forward()`.
- **`MultiHostControllerStore`**: Typed `Store<MultiHostController>` for active MultiHost connections.
- **`ManagersStore`**: Typed `Store<Manager>` for active sub-Manager instances.
- **`Store<T>`**: Generic Map-backed registry with `add`, `remove`, `list`, `getById`, and `size`.
- **`MultiManagerAuditor`**: Multiplexes audit streams from all attached `ManagerAuditor` instances into a `ReReadable` output. Uses `MultiStream` to merge JSON-parse/annotate/stringify pipelines. Controls flow (setFlowing) based on active HTTP audit consumers.
- **`portsParser`**: Validates `N-N` port-range CLI arguments, returns `[number, number]` tuple. Throws `InvalidOptionArgumentError` on invalid format.
- **`defaultConfig`**: Module-level defaults (`MultiManagerOptions`) and `createSettings()` helper for CLI→options mapping with S3 env-var injection.

## Data & Control Flow

See `multi-manager.ts` for the full orchestration flow. Key paths:
1. `MultiManager.start()` → `setRouting()`, `attachVerserListeners()`, optional `startMonitoringServer()`, `server.listen()`, optional `startManagers()`.
2. Verser `connect` event → header-inspection dispatches to `attachHostAPI()` (routes to `Manager.handleHostConnection`) or `attachMultiHostAPI()` (creates/reattaches `MultiHostController`).
3. Verser `close` event → removes from `ManagersStore` or `MultiHostControllerStore`.
4. API `POST /start` → load-check gates, `new Manager(...)`, `.main()`, attaches auditor, adds to store.
5. API `GET /list` → returns IDs from `ManagersStore.list()`.
6. API `POST /cpm/:id/stop` → stops Manager, removes from store.
7. API `GET /log` → SSE upstream from `CommonLogsPipe`.
8. API `GET /audit` → SSE upstream from `MultiManagerAuditor`.

## Integration Points

- `@scramjet/manager`: `Manager`, `CommonLogsPipe`, `HealthCheck`, `ManagerAuditor`.
- `@scramjet/manager-config`: `getDefaultConfig()`.
- `@scramjet/verser`: `Verser`, `VerserConnection`.
- `@scramjet/api-server`: `APIExpose`.
- `@scramjet/load-check`: `LoadCheck`, `LoadCheckConfig`.
- `@scramjet/model`: `IDProvider`.
- `@scramjet/utility`: `FreePortsFinder`, `promiseTimeout`, `merge`, `readJsonFile`.
- `@scramjet/monitoring-server`: `MonitoringServer`.
- `@scramjet/obj-logger`: `ObjLogger`, `prettyPrint`.
- `@scramjet/types`: `MMRestAPI`, `MonitoringServerConfig`, `ManagerConfiguration`, `ParsedMessage`, `NextCallback`.
- `scramjet`: `DataStream`, `StringStream`, `MultiStream`.
- `rereadable-stream`: `ReReadable`.
- `http-status-codes`: `ReasonPhrases`.
- `find-package-json`: Build version discovery.
