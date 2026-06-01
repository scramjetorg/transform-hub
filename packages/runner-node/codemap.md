# packages/runner-node/

## Responsibility

Sequence runtime executed under the outer runner. Owns boot-config parsing, host channel setup, app-context construction, lifecycle control, and sequence execution.

## Design Patterns

Boot-config driven startup, split host-channel ownership, and a layered runtime: transport setup -> context construction -> control loop -> sequence execution -> cleanup.

## Data & Control Flow

`runner-node.ts` reads the boot JSON, opens fd4/fd5 plus host sockets, builds either app or sequence context, performs handshake and control wiring, runs the sequence, then emits terminal monitoring frames and exit files.

## Integration Points

Uses `@scramjet/api-client`, `@scramjet/api-server`, BPMux, `@scramjet/types`, `@scramjet/symbols`, and the outer runner’s boot-config/stdio contract.
