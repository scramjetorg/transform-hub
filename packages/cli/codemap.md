# packages/cli/

## Responsibility

`@scramjet/cli` provides the `si` command-line interface for communicating with Scramjet Transform Hub instances and the Scramjet Cloud Platform. Supports sequence/instance lifecycle management, config management, profile switching, topic operations, space management, and developer tooling.

## Design/Patterns

- **Command tree**: Built with `@scramjet/config` helpers (`cmd()`), composing nested command descriptors with arguments, options, and action handlers.
- **Profile-based configuration**: Config profiles managed by `ProfileManager` with `SiConfig` (global config), `ProfileConfig` (per-profile), and `SessionConfig` (session state) supporting `--config` and `--config-path` overrides.
- **Client delegation**: Communicates with Hubs via `@scramjet/api-client` (`HostClient`) and with Cloud Platform via `@scramjet/middleware-api-client`.
- **CLI entry**: `src/bin/index.ts` resolves command path, handles `--version`/`--help`, and delegates to child command handlers.
- **Completion system**: Bash completion via `scripts/completion/` and `events/completerDetails.ts` event type.

## Source Structure

| Path | Responsibility |
|------|---------------|
| `src/bin/` | CLI entrypoint (`index.ts`) |
| `src/events/` | Event type definitions (completer details) |
| `src/lib/commands/` | Command definitions (sequence, instance, hub, config, scope, space, topic, store, init, util, developerTools, completion) |
| `src/lib/config/` | Configuration management (SiConfig, ProfileManager, ProfileConfig, SessionConfig) |
| `src/lib/helpers/` | Command helper utilities (sequence, instance, scope, developerTools, various) |
| `src/utils/` | Environment detection utilities |
| `src/types/` | CLI-specific TypeScript types |

## Integration Points

- Depends on `@scramjet/api-client`, `@scramjet/client-utils`, `@scramjet/middleware-api-client` for API communication.
- Uses `@scramjet/config` for command parsing and option/argument definitions.
- Uses `@scramjet/obj-logger` for logging, `@scramjet/utility` for helpers.
- Consumed as a binary (`si`) via `package.json` `bin` entry or directly as a library module.
