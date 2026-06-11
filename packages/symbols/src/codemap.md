# packages/symbols/src/

## Responsibility

Defines the concrete symbol enums/constants and exported contract helpers that back all STH protocol and runtime-kind coordination.

## Design/Patterns

Small, side-effect-free constants-first module set. Most values are numeric/string enums or `const enum` for zero-cost usage in hot protocol paths, grouped by protocol domain (runner messages, CPM messages, exit codes, statuses, stream states, headers).

## Data & Control Flow

`runtime-kind.ts` infers execution runtime from package `engines` metadata and is re-exported by `@scramjet/types` for consistent executor selection. `index.ts` composes public exports across symbols, headers, stream states, and runtime kind helpers so downstream packages import a single contract surface.

`CommunicationChannel` values map to host/runner fd stream surfaces; message code enums are used by typed message unions in `@scramjet/types` and by host/runner dispatchers to branch behavior.

## Integration Points

Imported and re-used pervasively by `@scramjet/types`, `host`, `runner`, `api-server`, `api-client`, adapters, and stream/topic model packages; serves as the source of truth for protocol-level numeric/string identifiers.
