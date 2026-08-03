# packages/load-check/

## Responsibility

Provides system resource monitoring and load-checking capabilities for Scramjet Transform Hub. Monitors CPU load, memory usage, disk space, and determines if the machine is overloaded or healthy.

## Design / Patterns

- **Component-based health checks**: `health-components.ts` exports composable health check functions (`processMemoryComponent`, `processCpuComponent`, `osMemoryComponent`, `osLoadComponent`, `osDiskComponents`) that produce `HealthComponent` results with `"healthy" | "degraded" | "unhealthy"` status.
- **Configurable thresholds**: `LoadCheckConfig` and `InstanceRequirementsConfig` (extending `ReadOnlyConfig`) allow configurable limits for safe operation and per-instance resource requirements. Validated via `validateEntry()`.
- **Summary aggregation**: `summarizeHealth()` reduces multiple `HealthComponent` results into a single `HealthSummary` with aggregate status.
- **Default health options**: `createDefaultHealthComponents(options)` creates a standard set of health components with configurable thresholds for memory, CPU, load, and disk.

## Data & Control Flow

```
LoadCheck instance created with LoadCheckConfig
  → validates config, computes SAFE_OPERATION_LIMIT and MIN_INSTANCE_REQUIREMENTS
  → gatherStats() reads CPU loadavg, free memory (via node-os-utils), disk usage (via diskusage-ng)
  → returns LoadCheckStat with current system state

createDefaultHealthComponents(options)
  → processMemoryComponent + processCpuComponent + osMemoryComponent + osLoadComponent + osDiskComponents
  → summarizeHealth(scope, components) → HealthSummary
```

## Source Structure

| Path | Role |
|------|------|
| `src/index.ts` | Barrel re-export of LoadCheck, health-components, and LoadCheckConfig |
| `src/load-check.ts` | `LoadCheck` class — monitors CPU/memory/disk, stores SAFE_OPERATION_LIMIT and MIN_INSTANCE_REQUIREMENTS |
| `src/health-components.ts` | Composable health check functions and HealthSummary aggregation |
| `src/config/load-check-config.ts` | `LoadCheckConfig` class with safeOperationLimit and instanceRequirements validation |
| `src/config/instance-requirements-config.ts` | `InstanceRequirementsConfig` with freeMem, cpuLoad, freeSpace validation |

## Integration Points

- Consumed by `@scramjet/host` for instance scheduling decisions and health endpoint responses.
- Depends on `@scramjet/obj-logger` (logging), `@scramjet/utility` (defer, ReadOnlyConfig), `scramjet` (streams), `diskusage-ng`, `node-os-utils`.
