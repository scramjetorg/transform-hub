# packages/cli/src/lib/

## Responsibility

Core library modules for the CLI: command definitions, configuration management, helper utilities, output formatting, client resolution, error handling, and path resolution.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `commands/` | Command descriptor trees for each CLI domain |
| `config/` | Profile and session configuration management |
| `helpers/` | Helper utilities for command implementations |

## Modules (top-level files)

| File | Role |
|------|------|
| `common.ts` | `getHostClient()` — resolves and caches host API client from session config |
| `errorHandler.ts` | Error display/reporting for CLI command failures |
| `output.ts` | `displayEntity()`, `displayObject()`, `displayStream()`, `displayError()`, `displayMessage()` — formatted CLI output |
| `paths.ts` | Filesystem path resolution for config files, sequences, profiles |
| `platform.ts` | `getMiddlewareClient()` — resolves and caches platform middleware API client |

## Integration Points

- Common modules (`common.ts`, `paths.ts`, `output.ts`) are consumed by all command modules.
- Config modules are initialized in `bin/index.ts` during CLI startup.
- Platform client used by hub/scope/space commands for cloud platform interaction.
