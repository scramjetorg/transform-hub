# issues.md - Python Runner Wrapper

## Known Issues
- None yet

## 2026-05-31 observed legacy issues
- Legacy `SET` handling calls async `handle_set()` without awaiting it, so control-set capture records `RuntimeWarning: coroutine 'Runner.handle_set' was never awaited` on `STDERR`.
- Legacy stop/kill control paths exit via `sys.exit(1)` from background tasks, so several parity fixtures intentionally capture non-zero exit codes and task-exception traces as current behaviour.
