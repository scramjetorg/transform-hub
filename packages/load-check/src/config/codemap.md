# packages/load-check/src/config/

## Responsibility

Configuration classes for load-check resource thresholds. Provide validated typed configuration for safe operation limits and per-instance resource requirements.

## Modules

### `load-check-config.ts` (25 lines) — `LoadCheckConfig`

Extends `ReadOnlyConfig<LoadCheckRequirements>`. Validates:
- `safeOperationLimit`: must be a non-negative integer.
- `instanceRequirements`: validated via `InstanceRequirementsConfig`.
- Exposes `safeOperationLimit` and `instanceRequirements` getters.

### `instance-requirements-config.ts` (30 lines) — `InstanceRequirementsConfig`

Extends `ReadOnlyConfig<InstanceRequirements>`. Validates:
- `freeMem`: non-negative integer.
- `cpuLoad`: number between 0 and 100.
- `freeSpace`: non-negative integer.
- Exposes `freeMem`, `cpuLoad`, `freeSpace` getters.

## Integration Points

- Consumed by `LoadCheck` class in `load-check.ts` during construction.
- `LoadCheckConfig` re-exported from package entry point (`src/index.ts`).
- Used by host startup to validate and apply resource thresholds.
