# packages/cli/

## Responsibility

`@scramjet/cli` provides the `si` command-line interface for communicating with Scramjet Transform Hub instances and the Scramjet Cloud Platform. Supports sequence/instance lifecycle management, config management, profile switching, topic operations, space management, and developer tooling.

## Design/Patterns

- **Command tree**: Built with `@scramjet/config` helpers (`cmd()`), composing nested command descriptors with arguments, options, and action handlers.
- **Profile-based configuration**: Config profiles managed by `ProfileManager` with `SiConfig` (global config), `ProfileConfig` (per-profile), and `SessionConfig` (session state) supporting `--config` and `--config-path` overrides.
- **Client delegation**: Communicates with Hubs via `@scramjet/api-client` (`HostClient`) and with Cloud Platform via `@scramjet/middleware-api-client`.
- **Verser2 broker bridge** (`src/lib/commands/api.ts`): Shared mTLS-authenticated Verser2 transport spanning both raw API (`si api`) and typed named commands. The `createVerser2CliTransport()` function wraps a `@signicode/verser2-guest-node` broker and the `RoutedBrokerTransport` contract from `@scramjet/api-router`, resolving routes by domain and encoding path/query/headers/body/streaming requests. `createVerifiedVerser2Session()` is the shared identity-verification (`GET /api/v2/ingress/identity`), error-classification, redirect/traversal, and cleanup boundary before raw or typed dispatch.
- **Native capability facade** (`src/lib/capabilities.ts`): `getNativeCapabilities()` returns a `NativeCapabilities` API (`.json()`, `.managerJson()`, `.rootJson()`, `.spaceJson()`, `.upload()`, `.stream()`, etc.) that materializes topology-aware paths (platform/space/hub/root ownership contracts) through a shared `createVerifiedVerser2Session()`. It forwards structured Hub disconnect/delete/force queries through manifest-backed contracts and rejects explicit/session targets that contradict fixed ingress. Named command actions check `getNativeCapabilities()` first and use the facade when a Verser2 profile is active; otherwise they fall through to the HTTP/v1 client path.
- **Explicit unavailable classification** (`src/lib/apiCommandError.ts`, `src/lib/commands/configControls.ts`): Unsupported Verser2 operations throw `CapabilityUnavailableError` (exit 80, code `UNAVAILABLE`) rather than falling back silently to HTTP/v1. Config-control leaves for `[space|hub|sequence|instance] config set|reload` and most `config get` leaves (except `hub config get`, which is native) all register as deterministic exit-80 placeholders. Middleware-only commands (`space access`, `inst inout`, `inst event on --stream`) and the `api endpoints` placeholder also use exit 80.
- **CLI entry**: `src/bin/index.ts` resolves command path, handles `--version`/`--help`, and delegates to child command handlers.
- **Completion system**: Bash completion via `scripts/completion/` and `events/completerDetails.ts` event type. The `completion` command is registered unconditionally (not gated on Linux); its `action` handler outputs the shell script; `install`/`uninstall` subcommands are conditional on platform support.

## Source Structure

| Path | Responsibility |
|------|---------------|
| `src/bin/` | CLI entrypoint (`index.ts`) |
| `src/events/` | Event type definitions (completer details) |
| `src/lib/commands/` | Command definitions (api, config, configControls, completion, developerTools, hub, init, instance, scope, sequence, si, space, store, topic, util) |
| `src/lib/config/` | Configuration management (SiConfig, ProfileManager, ProfileConfig, SessionConfig, verser2Profile) |
| `src/lib/helpers/` | Command helper utilities (sequence, instance, scope, developerTools, various) |
| `src/lib/capabilities.ts` | Native capability facade — topology-aware Verser2 typed client for named commands |
| `src/lib/apiCommandError.ts` | `ApiCommandError` and `CapabilityUnavailableError` base classes |
| `src/utils/` | Environment detection utilities |
| `src/types/` | CLI-specific TypeScript types |

## Integration Points

- Depends on `@scramjet/api-client`, `@scramjet/client-utils`, `@scramjet/middleware-api-client` for HTTP(S)/v1 API communication.
- Uses `@scramjet/config` for command parsing, option/argument definitions, and profile/validation/masking shared utilities.
- Uses `@scramjet/obj-logger` for logging, `@scramjet/utility` for helpers.
- **Verser2 stack**: Depends on `@scramjet/api-router` for `RoutedBrokerTransport` contract, `@scramjet/rest-api2` for typed manifest-backed route clients, `@scramjet/config` for outbound Verser2 profile schema/validation/redaction, and `@signicode/verser2-guest-node` for broker connection and mTLS session.
- The `api.ts` command module (`createVerser2CliTransport`, `createVerifiedVerser2Session`) reuses route-readiness and lifecycle patterns from `packages/manager/src/lib/verser2-transport.ts` without exporting that Manager implementation.
- Consumed as a binary (`si`) via `package.json` `bin` entry or directly as a library module.
