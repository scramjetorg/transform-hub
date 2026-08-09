# packages/cli/src/

## Responsibility

Source implementation for the Scramjet CLI (`si`). Contains the CLI entrypoint, command definitions, configuration management, helper utilities, event types, and environment utilities.

## Design/Patterns

- **Command trees**: Each logical domain (sequence, instance, hub, etc.) has a dedicated module in `lib/commands/` exporting a `CommandDescriptor` built with `@scramjet/config` `cmd()`.
- **Profile manager singleton**: `ProfileManager` (in `lib/config/`) manages profile switching, with CLI args `--config` and `--config-path` as overrides.
- **Client resolution**: `getHostClient()` and `getMiddlewareClient()` in `lib/common.ts` and `lib/platform.ts` provide typed STH/Platform API clients.
- **Output helpers**: `lib/output.ts` provides `displayEntity()`, `displayObject()`, `displayStream()`, `displayError()`, `displayMessage()` for formatted CLI output.

## Subdirectories

| Directory | Responsibility |
|-----------|---------------|
| `bin/` | CLI entrypoint (`index.ts`) — command resolution, version/help handling |
| `events/` | CompleterDetails event for bash completion |
| `lib/commands/` | Command trees: sequence, instance, hub, config, scope, space, topic, store, init, util, developerTools, completion |
| `lib/config/` | Configuration: SiConfig, SessionConfig, ProfileManager, ProfileConfig, ReadOnlyProfileConfig, commonProfileConfig |
| `lib/helpers/` | Command helpers: sequence pack/send/start, instance kill/restart, scope parsing, developer tools, format helpers |
| `types/` | CLI-specific types (params, entities, env) |
| `utils/` | Environment detection (`envs.ts`) |

## Integration Points

- Consumed as a CLI binary via `src/bin/index.ts` entrypoint.
- All command modules are registered in `lib/commands/index.ts` and added to the root `si` command tree.
- Uses `@scramjet/config` for command resolution, `@scramjet/api-client` / `@scramjet/client-utils` for API communication.
