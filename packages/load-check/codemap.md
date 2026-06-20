# @scramjet/load-check

## Responsibility

Provides system resource monitoring and load-checking capabilities for Scramjet Transform Hub. Monitors CPU load, memory usage, disk space, and determines if the machine is overloaded or healthy.

## Design / Patterns

- **Component-based health checks**: `health-components.ts` exports composable health check functions (`processMemoryComponent`, `processCpuComponent`, `osMemoryComponent`, `osLoadComponent`, `osDiskComponents`) that produce `HealthComponent` results with `"healthy" | "degraded" | "unhealthy"` status.
- **Configurable thresholds**: `LoadCheckConfig` and `InstanceRequirementsConfig` allow configurable limits for safe operation and per-instance resource requirements.
- **Summary aggregation**: `summarizeHealth()` reduces multiple `HealthComponent` results into a single `HealthSummary`.

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

## Integration Points

- Consumed by `@scramjet/host` for instance scheduling decisions and health endpoint responses.
- Depends on `@scramjet/obj-logger` (logging), `@scramjet/utility` (defer), `scramjet` (streams), `diskusage-ng`, `node-os-utils`.
