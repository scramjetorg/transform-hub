# packages/runner/src/bin/

## Responsibility

CLI entry for the outer runner. Validates adapter env, writes boot config, selects runtime executor, and wires raw stdio to host channels.

## Design Patterns

Thin orchestration layer: validation first, then boot-config emission, then transport wiring. Keeps compatibility semantics while delegating runtime-specific work to child packages.

## Data & Control Flow

Reads `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, host address/instance env, and sequence args. Spawns runner-node with a private JSON boot file; pipes stdin/stdout/stderr/control/monitoring, observes child lifecycle frames, and exits with translated codes.

## Integration Points

Depends on host client, executor selection, runner-node entry resolution, and lifecycle/stdio helpers.
