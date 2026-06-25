# packages/runtime-types/

## Responsibility

Generic low-level runtime-neutral types for Scramjet Transform Hub. Owns `BaseAppContext`, runtime-neutral utility/logger/storage interfaces, error types, function/stream primitives, runner config/connect contracts, sequence info, instance limits/stats, and runtime-executor types — all without any API client or endpoint-specific dependencies.

This is the foundation layer of the typings split: both `@scramjet/sequence-types` and `@scramjet/api-types` built on `@scramjet/runtime-types` without importing `@scramjet/rest-api2` or `@scramjet/types`.

## Design / Patterns

- **No forbidden dependencies**: must NOT depend on `@scramjet/rest-api2`, `@scramjet/api-types`, `@scramjet/sequence-types`, or `@scramjet/types` (enforced by `test/no-forbidden-deps.cjs`).
- **Pure type surface** with structural config models, tagged error unions, and shared protocol contracts.
- **`BaseAppContext` core**: the minimal app-context contract that sequence-facing (`SequenceAppContext`) and API-facing (`StrictAppContext`) extensions build upon.
- **Runtime-neutral**: Logger, localStorage, error codes, and stream/function types are defined without reference to any particular runtime or API version.

## Data and control flow

`BaseAppContext` is the central type that flows from:
1. Runner startup → boot config construction → runner-node context assembly
2. Sequence entrypoint (`SequenceAppContext` passed as `this` to `transform`/`main`)
3. API client setup (`StrictAppContext` extends `BaseAppContext` with typed v1/v2 API clients)

Supporting types (`AppConfig`, `Logger`, `ILocalStorage`, `SequenceInfo`, `InstanceLimits`, `InstanceStats`, `RuntimeExecutable`) flow through runner boot configs, monitoring frames, and host-side run-control messages.

## Integration points

- Consumed by `@scramjet/sequence-types` (depends on `BaseAppContext`, sequence types, app-config).
- Consumed by `@scramjet/api-types` (depends on `BaseAppContext`, host-client, runtime-executor).
- Consumed by `@scramjet/types` (re-exports via compatibility barrel).
- Consumed by `packages/runner`, `packages/runner-node`, `packages/host`, `packages/manager` for runtime-neutral contracts.
- ~40 exported modules across the package root.
