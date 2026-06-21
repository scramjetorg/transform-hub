# Bugfix: Instances Server Port Collision

| Field | Value |
|-------|-------|
| Title | Fix instances server port collision |
| Category | bugfix |
| Scope | packages/host, packages/sth-config |
| Breaking | no |

## Problem Statement

The `instancesServerPort` config value defaults to a fixed number, `8001`. When multiple STH processes run on the same machine, or when integration tests start and stop hosts in rapid succession, the port may still be held by a lingering socket. This causes `EADDRINUSE` and crashes the host.

## Current Behavior

- `host.instancesServerPort` defaults to `8001`.
- Users can override it, but there is no automatic fallback if the chosen port is busy.
- CI pipelines that run tests in parallel must manually assign unique ports and track them.

## Expected Behavior

- If the configured `instancesServerPort` is unavailable, the host should try the next few ports automatically.
- Alternatively, setting `instancesServerPort: 0` should bind to an ephemeral port and report the chosen port in the host info file.
- The ephemeral port approach is especially useful for test suites.

## Proposed Change

1. Update the host socket server startup to catch `EADDRINUSE` and attempt `port + 1` up to a small limit (for example, 10 retries).
2. Support `instancesServerPort: 0` as an explicit "auto-assign" value, then write the resolved port into `infoFilePath` so consumers can discover it.
3. Log the final chosen port at `INFO` level so operators know what happened.

## Backwards Compatibility

No breaking changes. Default behavior with a free `8001` stays identical. Auto-assignment is opt-in via `0`.

## Testing Plan

- Unit test: mock a server that fails on `8001` and succeeds on `8002`; assert the host picks `8002`.
- Integration test: launch two STH processes with default config and verify the second one lands on a new port.
- Integration test: set `instancesServerPort: 0`, start the host, and verify the info file contains a non-zero port.

## References

- `docs/read-more/sth-config.md`
- `packages/host/src/lib/socket-server.ts`
- `packages/sth-config/src/config-service.ts`
