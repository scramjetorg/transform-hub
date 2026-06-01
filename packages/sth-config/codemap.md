# packages/sth-config/

## Responsibility

Central configuration assembly layer: builds defaults, merges runtime overrides, and exposes safe helpers for selecting the runtime adapter.

## Design Patterns

Default-object hydration with deep merge, environment-aware runtime selection, and a safe/public config projection for non-sensitive inspection.

## Data & Control Flow

Starts from `default-config` + image defaults, accepts `DeepPartial<STHConfiguration>` updates, then resolves adapter-specific config before host startup.

## Integration Points

Used by `packages/sth/src/bin/hub.ts` and `packages/sth/src/index.ts`; imports `@scramjet/types`, `@scramjet/utility`, and optionally `@scramjet/adapters`.
