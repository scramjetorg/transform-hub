# packages/runner-node/src/

## Responsibility

Core runtime implementation for runner-node: boot config, fd streams, host client, contexts, handshake, lifecycle, and sequence execution.

## Design Patterns

Modular bootstrap pipeline with narrow helpers. Uses context builders and small protocol adapters instead of one monolithic runner class.

## Data & Control Flow

Boot config drives sequence loading and host connection. `context.ts` builds either host-backed or local sequence context, `wireControlStream()` dispatches STOP/KILL/EVENT/SET frames, `runSequence()` executes functions, and `lifecycle.ts` coordinates shutdown and keepalive semantics.

## Integration Points

Connects to host sockets, fd4/fd5 framing, API client/server plumbing, BPMux, and `@scramjet` types/symbols for monitoring and control messages.
