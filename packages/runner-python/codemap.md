# packages/runner-python/

## Responsibility

Python sequence runtime and parity reference. Implements boot-config parsing, host-channel connection, control/monitoring codecs, context, lifecycle, and sequence loading. Depends on `@signicode/verser2-guest-python` for verser2 guest connectivity.

## Design/Patterns

Frame-based transport over fd4/fd5 with small codec/writer helpers. Runtime behavior is split into boot, handshake, control loop, lifecycle, and stream adapters for Node parity. Verser2 guest integration via `@signicode/verser2-guest-python` enables the Python runtime to participate in the verser2-based host transport model.

## Data & Control Flow

Boot config is read from argv, host sockets are opened for IN/OUT/LOG, ping/pong handshake seeds app config and args, control frames drive STOP/KILL/SET/EVENT handling, and sequence output is forwarded with monitoring frames.

## Integration Points

Integrates with the outer runner boot-config contract, host instances server, `scramjet` streams, `@signicode/verser2-guest-python` for verser2 connectivity, and parity fixtures/tests for runtime compatibility.
