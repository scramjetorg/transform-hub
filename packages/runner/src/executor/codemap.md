# packages/runner/src/executor/

## Responsibility

Runtime spawning and lifecycle helpers for child processes, including Node and Python executors plus stdio/control forwarding utilities.

## Design Patterns

Small adapter layer around `child_process.spawn`; explicit fd layout, runtime-kind strategy selection, and fail-fast validation of paths/handles.

## Data & Control Flow

`select.ts` picks a `RuntimeExecutor` from sequence engines. `process-executor.ts` spawns `runner-node`, `python-process-executor.ts` spawns `runner-python`, and the launcher/forwarder helpers manage entry resolution and byte-stream handoff.

## Integration Points

Touches `@scramjet/types`, Node child-process APIs, the runner-node package, and Python runtime entry resolution.
