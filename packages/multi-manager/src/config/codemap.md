# packages/multi-manager/src/config/

## Responsibility

Configuration classes for the Multi-Manager process. Validates and merges settings from JSON files, CLI options, and compile-time defaults into a typed, read-only configuration object. Includes verser2 configuration for v2 API routing.

## Design/Patterns

- **`MultiManagerConfig`**: Extends `ReadOnlyConfig<MultiManagerOptions>`. Performs a three-way merge in its constructor: defaults → file config → CLI options. Exposes typed getters for each config section (`logLevel`, `server`, `manager`, `loadCheckRequirements`, `s3`, `monitoringServer`, `verser2`). Provides `getMasked()` for safe logging (redacts S3 credentials). Static `validateEntry()` delegates to `isLogLevel`, `MultiManagerServerConfig.validateEntry`, and `LoadCheckConfig.validateEntry`.
- **`MultiManagerServerConfig`**: Extends `ReadOnlyConfig<MultiManagerServerOptions>`. Validates server sub-fields (`apiBase` via `isUrlPath`, `apiPort` via `isPort`, `apiHost` via `isIP`, `version` via `isApiVersion`).

## Data & Control Flow

`MultiManagerConfig` constructor receives `MultiManagerCommandOptions` (CLI parsed). It reads an optional JSON config file path from `options.config`, merges three layers (defaults → file → CLI), and stores the result. Callers (e.g., `MultiManager` in `lib/multi-manager.ts` and API handlers in `lib/api/`) read typed properties like `.server.apiPort`, `.loadCheckRequirements`, `.s3`, `.verser2`, etc.

## Integration Points

- `@scramjet/utility`: `ReadOnlyConfig`, `JsonFile`, `isLogLevel`, `isPort`, `isUrlPath`, `isApiVersion`, `merge`.
- `@scramjet/load-check`: `LoadCheckConfig`.
- `@scramjet/types`: `LoadCheckRequirements`.
- `../types/multi-manager-types`: `MultiManagerOptions`, `MultiManagerCommandOptions`, `MultiManagerServerOptions`.
- Node.js `net`: `isIP`.
