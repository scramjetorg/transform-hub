# packages/runner-python/

## Responsibility

Python sequence runtime and parity test harness. Implements boot-config parsing, host-channel connection, control/monitoring codecs, context, lifecycle, and sequence loading.

## Design Patterns

Frame-based transport over fd4/fd5 with small codec/writer helpers. Runtime behavior is split into boot, handshake, control loop, lifecycle, and stream adapters for easier parity with the Node runtime.

## Data & Control Flow

Boot config is read from argv, host sockets are opened for IN/OUT/LOG, a ping/pong handshake seeds app config and args, control frames drive STOP/KILL/SET/EVENT handling, and sequence output is forwarded with monitoring frames.

## Integration Points

Integrates with the outer runner’s boot-config contract, host instances server, `scramjet` streams, and parity fixtures/tests for runtime compatibility.
