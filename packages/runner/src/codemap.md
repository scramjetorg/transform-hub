# packages/runner/src/

## Responsibility

Legacy runner implementation and launcher plumbing. Contains the outer `Runner`, host client, executor selection, and support helpers for stream and storage mediation.

## Design Patterns

Event-driven control plane with a mutable runner context, stream override wrappers, and adapter-style helpers around host communication.
Executor selection is data-driven from `engines`, defaulting to Node.

## Data & Control Flow

Startup validates env and host connectivity, then `Runner` bridges input/output/monitoring streams, handles control messages, and forwards storage updates. The executor layer spawns runtime children and translates exit codes and lifecycle frames.

## Integration Points

Integrates with `@scramjet` model/symbols/types/utility, host API client/server, BPMux, and child-process execution.
