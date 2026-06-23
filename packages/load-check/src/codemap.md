# packages/load-check/src/

## Files

| File | Lines | Role |
|------|-------|------|
| `index.ts` | 3 | Barrel re-export (LoadCheck, health-components, LoadCheckConfig). |
| `load-check.ts` | 134 | `LoadCheck` class — monitors CPU/memory/disk, computes `LoadCheckStat` values, checks safe operation limits. |
| `health-components.ts` | 151 | Composable health check functions and `HealthSummary` aggregation for process and OS resource health. |
| `config/load-check-config.ts` | 25 | `LoadCheckConfig` — validates safe operation limit and instance requirements. |
| `config/instance-requirements-config.ts` | 30 | `InstanceRequirementsConfig` — validates per-instance freeMem, cpuLoad, freeSpace. |

## Responsibility

Implements system resource monitoring and health check logic: gathers CPU load, free memory, free disk space; evaluates against configurable thresholds; produces typed load check stats and health summaries.

## Design/Patterns

- `LoadCheck` wraps OS-level metric gathering with a configurable threshold system.
- `health-components.ts` is a pure helper module — no class, just exported async/sync functions for composable health diagnostics.
- Health components follow a uniform `HealthComponent` interface with `name`, `healthy`, `status`, `scope`, `details`.
- Config classes extend `ReadOnlyConfig` from `@scramjet/utility` with per-field `validateEntry()`.

## Integration Points

- Index exports both `LoadCheck` and all `health-components` for consumer use.
- `LoadCheck` consumed by `@scramjet/host` for scheduling decisions.
- Config classes used by host startup to validate load-check configuration.
