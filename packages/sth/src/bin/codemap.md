# packages/sth/src/bin/

## Responsibility

CLI bootstrap that parses flags, builds `STHConfiguration`, selects the runtime adapter, validates verser2 config, and launches the host process.

## Design/Patterns

Imperative startup pipeline: parse options, merge config file and CLI overlays, normalize paths/ports/images, validate verser2 schema via `loadConfig`, then install signal handlers after host start.

## Data & Control Flow

1. Parse CLI argv via `parseCliOptions` with `createOptionRegistry()`, including `sthOutboundVerser2Options` from `@scramjet/config`.
2. Detect runtime adapter for adapter-specific option augmentation (via `augmentOptions`).
3. Merge verser2 config via `loadConfig` using `sthOutboundVerser2ConfigSchema` — validates env/config-file/CLI overrides against the Zod schema.
4. Load config file (if specified), apply runner ENV overrides, then feed everything to `ConfigService.update()`.
5. Set derived fields for host, docker, kubernetes, telemetry, couchdb, verser2, and other sections.
6. Call `selectRuntimeAdapter()` to finalize adapter-specific config defaults.
7. Launch `startHost()` from `@scramjet/host` with the assembled config.
8. After host start, install SIGINT/SIGTERM signal handlers that delegate to `host.performStop()`.

## Integration Points

- Talks to `@scramjet/config` (`ConfigService`, `loadConfig`, `sthOutboundVerser2ConfigSchema`, `sthOutboundVerser2Options`, `createOptionRegistry`), `@scramjet/types`, `@scramjet/host` (`startHost`), `@scramjet/adapters` (`augmentOptions`), `@scramjet/utility`, and Node process signals.
- Verser2 config validation uses Zod schema from `@scramjet/config` with environment and CLI fallback support.
