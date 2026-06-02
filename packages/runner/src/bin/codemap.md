# packages/runner/src/bin/

## Responsibility

Outer runner entrypoint. Validates adapter env, writes boot config, selects the child runtime, and connects host stdio/control/monitoring streams.

## Design/Patterns

Straight-line bootstrap with early validation and best-effort cleanup. Runtime-specific behavior is delegated to executor modules and entry resolvers.

## Data & Control Flow

Reads `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, host instance env, and engine hints. The entry writes a private JSON boot file, resolves Bun/Node launch targets, wires raw pipes, observes lifecycle frames, and translates child close events into process exit.

## Integration Points

Depends on host client transport, executor selection, runner-node/runner-bun launchers, stream forwarding, and lifecycle translation helpers.
