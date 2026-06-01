# packages/sth-config/src/

## Responsibility

Implements config defaults, merge/update semantics, runtime-adapter selection, and safe export of public config data.

## Design Patterns

Singleton-like default config object mutated by deep merge; optional dynamic import avoids hard dependency on adapter package during startup.

## Data & Control Flow

`default-config` is seeded with baked-in image values, `ConfigService.update()` merges CLI/file overrides, `selectRuntimeAdapter()` delegates adapter-specific augmentation, and `getConfigInfo()` strips local-only fields.

## Integration Points

Consumes `@scramjet/types` and `@scramjet/utility`; optionally imports `@scramjet/adapters` for runtime-specific configuration.
