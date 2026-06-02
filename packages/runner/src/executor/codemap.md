# packages/runner/src/executor/

## Responsibility

Child-process runtime executors and launch helpers for Node, Bun, and Python, plus runtime selection and lifecycle/stdio forwarding support.

## Design/Patterns

Strategy-based executor selection over a fixed fd layout. Each executor is a thin spawn wrapper with strict handle expectations and runtime-specific env sanitization.

## Data & Control Flow

`select.ts` picks an executor from `engines` (`bun` first, then `python3`, else Node). Launcher helpers resolve runtime entrypoints; `node-process-executor.ts`, `bun-process-executor.ts`, and `python-process-executor.ts` spawn children and expose stdout/stderr/control/monitoring handles for the outer runner.

## Integration Points

Touches `@scramjet/types`, Node child-process APIs, runner-bun/runner-node package entrypoints, Python module entry resolution, and stream/lifecycle helpers.
