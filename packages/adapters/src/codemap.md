# packages/adapters/src/

## Responsibility

Source implementation for the umbrella adapter registry. Handles adapter package discovery, lifecycle management, and adapter instantiation for the STH host at runtime.

- `get-adapters.ts`: lazy-loads and caches adapter packages; exposes `getAdapter()` and `getValidAdapters()`.
- `initialize-runtime-adapters.ts`: adapter selection ("detect" or explicit), `augmentOptions()`, `augmentConfig()`, and `registerRuntimeAdapterOption()`.
- `get-instance-adapter.ts`: factory for creating `ILifeCycleAdapterMain & ILifeCycleAdapterRun` instances from the resolved adapter.
- `get-sequence-adapter.ts`: factory for creating `ISequenceAdapter` instances from the resolved adapter.
- `types.ts`: shared type definitions (`InstanceAdapterOptions`, `RunnerEnvConfig`, `RunnerEnvironmentVariables`).

## Design/Patterns

- **Lazy singleton**: adapters loaded on first access via `getAdapter()` and cached in module scope.
- **Detect-or-explicit**: `initializeRuntimeAdapters()` probes Docker first when set to "detect", falls back to process.
- **Factory pattern**: `getInstanceAdapter()` and `getSequenceAdapter()` select the correct adapter class based on resolved runtime adapter name.

## Data & Control Flow

1. Host startup calls `registerRuntimeAdapterOption()` to add CLI option, then `augmentOptions()` to inject adapter-specific options.
2. `initializeRuntimeAdapters()` resolves the adapter, calls its `initialize()`, then calls `augmentConfig()` on the STH configuration.
3. During sequence/instance operations, `getSequenceAdapter()` and `getInstanceAdapter()` construct the appropriate adapter instances from the resolved adapter's exported classes.

## Integration Points

- Depends on `@scramjet/adapter-docker`, `@scramjet/adapter-kubernetes`, `@scramjet/adapter-process` (lazy-loaded).
- Consumed by `packages/host` during startup and runtime sequence/instance operations.
- Types from `@scramjet/types` (`IAdapterAugmentation`, `STHConfiguration`).
