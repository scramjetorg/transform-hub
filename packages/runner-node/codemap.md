# packages/runner-node/

## Responsibility

Node sequence runtime executed by the outer runner. Owns boot-config parsing, host channel setup, context construction, lifecycle control, and sequence execution.

## Design/Patterns

Boot-config driven startup with small helpers for transport, handshake, context, and lifecycle. Keeps runtime behavior layered instead of embedding it in one bootstrap function.

## Data & Control Flow

The runtime reads boot JSON, opens host sockets plus fd4/fd5, builds app/sequence context, performs control wiring, executes the sequence, and emits terminal monitoring/exit state on shutdown.

## Integration Points

Uses `@scramjet/api-client`, `@scramjet/api-server`, BPMux, `@scramjet/types`, `@scramjet/symbols`, and the outer runner boot-config/stdio contract.
