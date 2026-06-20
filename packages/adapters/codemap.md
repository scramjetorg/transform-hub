# packages/adapters/

## Responsibility

Umbrella adapter registry package that aggregates and exposes all runtime adapter plugins (docker, kubernetes, process). Provides adapter lifecycle management — registration, configuration augmentation, option injection, and initialization — for the STH host.

- Discovers and lazy-loads adapter packages (`@scramjet/adapter-docker`, `@scramjet/adapter-kubernetes`, `@scramjet/adapter-process`).
- Exposes adapter resolution via `getAdapter(name)`, `getValidAdapters()`, and `initializeRuntimeAdapters()`.
- Handles "detect" mode: tries Docker first, falls back to process.

## Design/Patterns

- **Lazy singleton**: adapters are instantiated once on first `getAdapter()` call and cached.
- **Strategy selection**: valid adapters form a fixed set (`process`, `docker`, `kubernetes`); "detect" autoselects at startup.
- **Uniform augmentation contract**: each adapter exposes `augment()`, `augmentOptions()`, `augmentConfig()`, `initialize()` via `IAdapterAugmentation`.

## Data & Control Flow

1. `augmentOptions()` injects CLI/config options from adapters into the runtime option registry.
2. `initializeRuntimeAdapters()` resolves adapter from config (or probes Docker), calls its `initialize()`, and applies `augmentConfig()` to the STH configuration.
3. Runtime adapter selection determines which sequence/instance adapter classes the host instantiates for storage and execution.

## Integration Points

- Delegates to `@scramjet/adapter-docker`, `@scramjet/adapter-kubernetes`, `@scramjet/adapter-process` for individual adapter implementations.
- Consumed by STH host startup through `registerRuntimeAdapterOption` and `initializeRuntimeAdapters`.
- Shares types from `@scramjet/types` (`IAdapterAugmentation`, `STHConfiguration`, `RuntimeOptionRegistry`).
