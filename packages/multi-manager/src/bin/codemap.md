# packages/multi-manager/src/bin/

## Responsibility

CLI entrypoint (`start.ts`) for the Multi-Manager process. Parses command-line options, assembles MultiManager configuration, creates the HTTP API server, and starts the `MultiManager` orchestrator with both v1 and v2 API surfaces.

## Design/Patterns

Imperative startup pipeline:
1. Define CLI option descriptors (`ConfigOptionDescriptor[]`) for all configurable flags.
2. `parseCliOptions()` from `@scramjet/config` produces a `MultiManagerCommandOptions` object from `process.argv`.
3. `MultiManagerServerConfig` validates SSL key/cert paths.
4. `MultiManagerConfig` merges defaults, optional JSON file (flag `--config`), and CLI flags into a validated read-only config.
5. `createServer()` from `@scramjet/api-server` creates the HTTP server.
6. `MultiManager` is instantiated with the server and config; `.start()` is called, which sets up v1 and v2 API routing via `MultiManagerAPIHandler`.
7. Optional heap-dump monitor dumps a V8 snapshot when memory exceeds a threshold.

## Data & Control Flow

`process.argv` → `parseCliOptions()` → `MultiManagerCommandOptions` → `MultiManagerConfig` (merged with file config and defaults) + `ServerConfiguration` (SSL) → `createServer()` → `new MultiManager(apiServer, mmConfig)` → `multiManager.start()` → `setRouting()` → `new MultiManagerAPIHandler(this).attach()` (registers v1+v2 routes).

## Integration Points

- `@scramjet/config`: CLI option parsing.
- `@scramjet/api-server`: HTTP server factory.
- `@scramjet/utility`: `merge` utility.
- `../lib/multi-manager`: `MultiManager` orchestrator class.
- `../lib/api/multi-manager-api`: `MultiManagerAPIHandler` (v1+v2 route setup).
- `../config/multi-manager-configuration`: `MultiManagerConfig`.
- `../types/multi-manager-types`: `MultiManagerCommandOptions`.
- Node.js `v8` module: optional heap snapshot.
