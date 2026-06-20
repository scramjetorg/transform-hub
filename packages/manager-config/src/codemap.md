# packages/manager-config/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 1 | Re-exports from `config-service` barrel. |
| `config-service.ts` | 27 | `ConfigService` class with singleton export, `defaultConfig` re-export, and `getDefaultConfig()` deep-clone factory. |
| `default-config.ts` | 44 | Hardcoded `ManagerConfiguration` defaults including `logColors`, `logLevel`, `apiBase`, `id`, `sthController`, and `verser2` settings. |

## Responsibility

Provides the concrete default configuration and a module-level singleton `ConfigService` for the Manager process. Supports runtime partial updates via deep merge.

## Design/Patterns

- **Singleton access**: `ConfigService` is exported as a pre-initialized singleton (`configService`), avoiding config-passing through the dependency graph.
- **Deep merge updates**: `update()` uses `@scramjet/utility`'s `merge` for recursive partial merge.
- **Immutable defaults**: `getDefaultConfig()` returns `JSON.parse(JSON.stringify(managerDefaultConfig))` to prevent accidental mutation.

## Integration Points

- Consumes `ManagerConfiguration` type from `@scramjet/types`.
- Uses `merge` from `@scramjet/utility`.
- Imported by Manager host processes (`@scramjet/manager`) at startup.
