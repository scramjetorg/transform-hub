# @scramjet/manager-config

## Responsibility

Holds the default configuration and a singleton `ConfigService` for the Scramjet CPM (Continuous Processing Manager). Provides runtime access to `ManagerConfiguration` values and supports partial updates via deep merge.

## Design / Patterns

- **Singleton service**: `ConfigService` is exported as a module-level singleton (`configService`) initialized with the `defaultConfig`. This avoids passing config through the dependency graph; any module can import and read the current config.
- **Deep merge on update**: `ConfigService.update()` uses `@scramjet/utility`'s `merge` (deep recursive merge) so callers can pass partial configuration objects without replacing entire subtrees.
- **Immutable defaults factory**: `getDefaultConfig()` returns `JSON.parse(JSON.stringify(managerDefaultConfig))` — a deep clone that prevents accidental mutation of the canonical defaults object.
- **No validation**: Config is typed by `ManagerConfiguration` from `@scramjet/types` but validated externally (typically by the host process that reads the config file and supplies the initial partial).

## Data & Control Flow

```
Startup:
  import configService → already initialized with defaultConfig
  configService.update(partialConfig) → deep merge into this.config

Runtime:
  configService.getConfig() → returns the live ManagerConfiguration object (mutable ref)
  getDefaultConfig() → returns a frozen deep clone of defaults
```

## Integration Points

- **`@scramjet/types`** — `ManagerConfiguration` interface defines the shape; this package provides the concrete default values.
- **`@scramjet/utility`** — `merge` function used for deep partial updates.
- Consumed by `@scramjet/cpm-*/` packages (the CPM host processes) that import `configService` and call `update()` with file/env-based partial configs at startup.
- No CLI or config-file loading logic lives here; that is the responsibility of `@scramjet/config`.

## Source files

| File | Lines | Role |
|---|---|---|
| `src/index.ts` | 1 | Re-exports `config-service` barrel |
| `src/config-service.ts` | 27 | `ConfigService` class, singleton export, `defaultConfig` re-export, `getDefaultConfig()` factory |
| `src/default-config.ts` | 11 | Hardcoded `ManagerConfiguration` defaults: `logColors: true`, `logLevel: "info"`, `apiBase: "/api/v1"`, `id: "cpm-manager"`, `sthController.unhealthyTimeoutMs: 61000` |
