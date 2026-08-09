# packages/cli/src/lib/

## Responsibility

Core library modules for the CLI: command definitions, configuration management, helper utilities, output formatting, client resolution, error handling, path resolution, Verser2 native capability dispatch, and API error classification.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `commands/` | Command descriptor trees for each CLI domain, including raw API (`api.ts`), config-control placeholders (`configControls.ts`), and native v2 dispatch for Hub/Space/Sequence/Instance/Topic |
| `config/` | Profile and session configuration management, including Verser2 profile bootstrap/validation (`verser2Profile.ts`) |
| `helpers/` | Helper utilities for command implementations |

## Modules (top-level files)

| File | Role |
|------|------|
| `common.ts` | `getHostClient()` — resolves and caches host API client from session config |
| `errorHandler.ts` | Error display/reporting for CLI command failures |
| `output.ts` | `displayEntity()`, `displayObject()`, `displayStream()`, `displayError()`, `displayMessage()` — formatted CLI output. Also `displayLogStream()` for log-format enabled streams |
| `paths.ts` | Filesystem path resolution for config files, sequences, profiles |
| `platform.ts` | `getMiddlewareClient()` — resolves and caches platform middleware API client |
| `capabilities.ts` | `NativeCapabilities` facade and `getNativeCapabilities()` — topology-aware typed client wrapping `createVerifiedVerser2Session()` and manifest-backed `@scramjet/rest-api2` contracts. Provides `.json()`, `.managerJson()`, `.rootJson()`, `.spaceJson()`, `.upload()`, `.stream()`, `.rootStream()`, `.spaceStream()`, `.topicPath()` for all named command variants. `CapabilityUnavailableError` class (exit 80) for deterministic rejection |
| `apiCommandError.ts` | `ApiCommandError` base class with typed `code`, `exitCode`, and optional `diagnostic` payload. Used by both raw API (`api.ts`) and the capability facade (`capabilities.ts`) for all Verser2 error mapping |

## Integration Points

- Common modules (`common.ts`, `paths.ts`, `output.ts`) are consumed by all command modules for HTTP/v1 command paths.
- Capabilities module (`capabilities.ts`) is consumed by named command actions to dispatch native v2 calls when a Verser2 profile is active; `getNativeCapabilities()` returns `undefined` when no profile is selected, causing the command to fall through to the HTTP/v1 client path.
- Api module (`commands/api.ts`) and capabilities module (`capabilities.ts`) share the `createVerser2CliTransport()` and `createVerifiedVerser2Session()` functions; raw API commands use them directly while named commands route through the facade. Both share `mapApiError()` and `ApiCommandError` classification.
- Config modules are initialized in `bin/index.ts` during CLI startup.
- Platform client used by hub/scope/space commands for cloud platform interaction (HTTP/v1 fallback only).
