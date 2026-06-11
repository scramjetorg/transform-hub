# packages/runner/src/bin/

## Responsibility

Outer runner bootstrap executable. It is the startup boundary between host adapter env and the actual runtime child process.

## Design / Patterns

- **Fail-fast startup**: parse and validate all required env vars, ports, and sequence path before touching child process state.
- **Dependency inversion for runtime entrypoints**: child entry path is resolved dynamically by launcher resolvers.
- **Best-effort cleanup**: temporary boot file cleanup and host disconnect attempts are wrapped to avoid masking the main failure reason.
- **Deterministic stream wiring**: explicit raw forwarding and explicit `{ end: false }` semantics for host-facing streams.

## Data & Control Flow

Reads `SEQUENCE_PATH`, `SEQUENCE_INFO`, `RUNNER_CONNECT_INFO`, and sequence runtime hints (`engines` from both source config paths).

- Writes a private boot JSON (mode `0600`) in a temp directory.
- Chooses executor via `selectExecutor(...)`.
- Resolves runtime entry (`runner-node` or `runner-bun`) through dedicated launcher resolvers.
- Spawns runtime with matching executor config (`runtimeEntry`, `bootConfigPath`, optional env overrides).
- Wires host <-> child pipes:
  - host `stdin -> child.stdin`
  - child `stdout/stderr -> host streams`
  - host `control -> child fd4`
  - child `fd5 -> host monitor`
- Captures child `close`, emits terminal lifecycle frame if not already sent by the child, logs summary on failures (including stderr tail), and exits with translated runner code.

## Integration Points

`HostClient` (`OUTER_RUNNER_CHANNELS`), `selectExecutor`, launcher resolvers, stream forwarder, lifecycle observer, exit translator, and `runner-node`/`runner-bun` runtime packages.
