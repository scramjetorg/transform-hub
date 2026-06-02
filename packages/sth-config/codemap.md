# packages/sth-config/

## Responsibility

Owns STH configuration defaults, image defaults, deep-merge updates, and runtime-adapter selection.

## Design/Patterns

Default-object hydration with layered overrides, optional adapter augmentation, and a public-safe config view for inspection/logging.

## Data & Control Flow

Boot starts from `default-config` plus image config, applies `DeepPartial<STHConfiguration>` updates from CLI/file input, then resolves adapter-specific values before host startup.

## Integration Points

Used by `packages/sth/src/bin/hub.ts` and `packages/sth/src/index.ts`; reads `@scramjet/types`, `@scramjet/utility`, and optional `@scramjet/adapters` hooks.
