# packages/multi-manager/src/lib/

## Responsibility

Core orchestration library for the Multi-Manager. Contains the main `MultiManager` class, verser2 Host attachment for managed Managers, Manager lifecycle stores, audit log aggregation, port-range parsing, and default configuration.

## Design/Patterns

- **`MultiManager`**: Central orchestrator. Owns the HTTP API server (`APIExpose`), verser2 Host, sub-Manager registry (`ManagersStore`), load check, health check, audit aggregator, and common log pipe. Sets up REST routing on start and attaches local Broker/Guest peers for each managed Manager.
- **`ManagersStore`**: Typed `Store<Manager>` for active sub-Manager instances.
- **`Store<T>`**: Generic Map-backed registry with `add`, `remove`, `list`, `getById`, and `size`.
- **`MultiManagerAuditor`**: Multiplexes audit streams from all attached `ManagerAuditor` instances into a `ReReadable` output. Uses `MultiStream` to merge JSON-parse/annotate/stringify pipelines. Controls flow (setFlowing) based on active HTTP audit consumers.
- **`portsParser`**: Validates `N-N` port-range CLI arguments, returns `[number, number]` tuple. Throws `InvalidOptionArgumentError` on invalid format.
- **`defaultConfig`**: Module-level defaults (`MultiManagerOptions`) and `createSettings()` helper for CLI→options mapping with S3 env-var injection.

## Data & Control Flow

See `multi-manager.ts` for the full orchestration flow. Key paths:
1. `MultiManager.start()` → resolve/start verser2 Host, `setRouting()`, optional `startMonitoringServer()`, `server.listen()`, optional `startManagers()`.
2. Manager startup attaches local verser2 Broker/Guest peers so STH registrations and forwarding route through the selected Manager.
3. API `POST /start` → load-check gates, `new Manager(...)`, `.main()`, attaches auditor, adds to store.
4. API `GET /list` → returns IDs from `ManagersStore.list()`.
5. API `POST /cpm/:id/stop` → stops Manager, removes from store.
6. API `GET /log` → SSE upstream from `CommonLogsPipe`.
7. API `GET /audit` → SSE upstream from `MultiManagerAuditor`.

## Integration Points

- `@scramjet/manager`: `Manager`, `CommonLogsPipe`, `HealthCheck`, `ManagerAuditor`.
- `@scramjet/manager-config`: `getDefaultConfig()`.
- `@signicode/verser2-host`: verser2 Host and local Broker/Guest attachments.
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
