# packages/multi-manager/src/types/

## Responsibility

Type definitions for the Multi-Manager package. Defines the configuration shape (`MultiManagerOptions`, `MultiManagerServerOptions`), CLI command option shape (`MultiManagerCommandOptions`), and API request parameter types (`StartManagerRequestParams`).

## Design/Patterns

- **`MultiManagerServerOptions`**: Typed API server sub-config (url path, host, port, API version).
- **`MultiManagerOptions`**: Full merged configuration interface extending `LoadCheckRequirements`. Includes log settings, server config, optional Manager pre-configuration, S3 credentials, optional monitoring server config, and verser2 configuration.
- **`MultiManagerCommandOptions`**: Flat CLI flag shape after `parseCliOptions()`. All fields are optional or have defaults; non-flat sub-structures remain as raw strings pending JSON parse in `start.ts`.
- **`StartManagerRequestParams`**: `DeepPartial<ManagerConfiguration>` for the `POST /v1/start` body.

## Integration Points

- Used by `src/config/`, `src/lib/`, `src/lib/api/`, and `src/bin/` modules.
- References `@scramjet/types` (`ApiVersion`, `DeepPartial`, `IdString`, `LoadCheckRequirements`, `LogLevel`, `ManagerConfiguration`, `Port`, `UrlPath`).
