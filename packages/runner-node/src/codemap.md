# packages/runner-node/src/

## Responsibility

Core Node runtime implementation: boot config, fd streams, host client, contexts, handshake, lifecycle, and sequence execution.

## Design/Patterns

Modular bootstrap pipeline with narrow helpers and protocol adapters rather than one monolithic runtime class.

## Data & Control Flow

Boot config drives sequence loading and host connection. Context builders prepare the execution environment, control wiring dispatches STOP/KILL/EVENT/SET frames, `runSequence()` executes the entry, and lifecycle helpers coordinate shutdown and keepalive behavior.

## Integration Points

Connects to host sockets, fd4/fd5 framing, API client/server plumbing, BPMux, and `@scramjet` types/symbols for monitoring and control messages.
