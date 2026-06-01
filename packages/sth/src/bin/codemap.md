# packages/sth/src/bin/

## Responsibility

Command-line entrypoint that parses flags, builds `STHConfiguration`, and launches the host process.

## Design Patterns

Imperative bootstrap pipeline: parse options, load/merge config, normalize paths, then start host and install signal handlers.

## Data & Control Flow

CLI options and optional config file are merged into `ConfigService`; derived fields such as runner images, storage paths, telemetry, and adapter settings are normalized before `startHost()`.

## Integration Points

Talks to `@scramjet/sth-config`, `@scramjet/types`, `@scramjet/host`, `@scramjet/adapters`, `@scramjet/utility`, and Node process signals.
