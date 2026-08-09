# packages/sequence-types/

## Responsibility

Sequence-author-facing types for Scramjet Transform Hub. Exports the frozen sequence AppContext API backed by `BaseAppContext` from `@scramjet/runtime-types`, plus canonical sequence application/function types for sequence authors.

Sequence authors should import their AppContext type from `@scramjet/sequence-types`:
```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";
```

## Design / Patterns

- **Frozen sequence-facing surface**: `SequenceAppContext` extends `BaseAppContext` with opaque `hub`/`space` accessors, minimal `api.use` for route registration, and canonical runtime-type re-exports.
- **Application/function types**: `SequenceTransformApp`, `SequenceMainApp`, and related `ThisParameterType` assertions define the `this` type for sequence entrypoint functions.
- **No API client coupling**: intentionally does not expose typed v1/v2 API clients — sequence authors interact with `hub`/`space` through the opaque accessors, not direct HTTP client types.
- **Depends on `@scramjet/runtime-types`** for the base app context, app-config, logger, localStorage, and function/stream primitives.
- **Depends on `@scramjet/symbols`** for runtime-kind constants.

## Data and control flow

1. Sequence author imports `SequenceAppContext` from `@scramjet/sequence-types`.
2. Runner startup binds the concrete app context implementation to the `SequenceAppContext` shape.
3. The sequence entrypoint receives the context as `this`.
4. Code inside the sequence uses `this.config`, `this.hub`, `this.space`, `this.api.use()`, `this.logger`, `this.localStorage`, etc. — all typed through `SequenceAppContext`.

## Integration points

- Consumed by sequence fixture packages and `@scramjet/sequence-test` (type-level validation).
- Consumed by `@scramjet/types` (re-exported via compatibility barrel for legacy imports).
- Re-exports key types from `@scramjet/runtime-types` for sequence-author convenience.
- ~10 exported modules.
