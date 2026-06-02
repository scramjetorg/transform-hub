# packages/sth/src/bin/

## Responsibility

CLI bootstrap that parses flags, builds `STHConfiguration`, selects the runtime adapter, and launches the host process.

## Design/Patterns

Imperative startup pipeline: parse options, merge config file and CLI overlays, normalize paths/ports/images, then install signal handlers after host start.

## Data & Control Flow

Parsed options feed `ConfigService.update()`, derived fields populate host/docker/kubernetes/telemetry/couchdb sections, and `selectRuntimeAdapter()` finalizes runtime-specific config before `startHost()` runs.

## Integration Points

Talks to `@scramjet/sth-config`, `@scramjet/types`, `@scramjet/host`, `@scramjet/adapters`, `@scramjet/utility`, and Node process signals.
