# packages/runner-node/src/bin/

## Responsibility

Executable entrypoint for the Node runtime. Boots the runtime and exits with the derived runner code.

## Design/Patterns

Single async bootstrap with explicit cleanup and best-effort teardown. Keeps process-global side effects localized to startup and shutdown.

## Data & Control Flow

Reads boot config from `argv[2]`, loads the sequence module, sets up fd streams, optionally starts the exposed API server, wires host channels, performs handshake, runs the sequence, then closes streams and writes the exit file.

## Integration Points

Uses `boot-config`, `context`, `fd-streams`, `handshake`, `host-client`, `lifecycle`, `run-sequence`, and `utils` helpers plus Node process/stdin/stdout/stderr.
