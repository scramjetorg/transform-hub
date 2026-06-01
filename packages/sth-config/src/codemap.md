# packages/sth-config/src/

## Responsibility

Implements config defaults, image defaults, merge/update semantics, adapter selection, and public config extraction.

## Design/Patterns

Mutable in-memory default config hydrated by deep merge; adapter resolution is deferred so startup avoids a hard dependency when adapters are unused.

## Data & Control Flow

`default-config.ts` seeds host/docker/kubernetes/runtime defaults, `image-config.json` provides baked image tags, update calls overlay CLI/file config, and public getters strip local-only fields before exposure.

## Integration Points

Consumes `@scramjet/types` and `@scramjet/utility`; may import `@scramjet/adapters` for runtime-specific augmentation.
