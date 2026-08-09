# packages/bpmux/

## Responsibility

Retained legacy BPMux stream-multiplexing package. It provides `@scramjet/bpmux`, the back-pressure-aware multiplexing primitive used by the retained `@scramjet/verser` package and preserved for external compatibility.

## Design/Patterns

- `index.js` is the upstream-derived CommonJS implementation and exports `BPMux`, `BPDuplex`, and HTTP/2 session helpers.
- `index.d.ts` is the TypeScript declaration surface for external consumers and retained `packages/verser` users.
- `test/index.js` is a minimal smoke proof that creates a local Unix-socket carrier, multiplexes two streams, and closes both peers.

## Integration Points

- Runtime dependency: `@scramjet/frame-stream` for framed message transport.
- Retained consumer: `packages/verser` imports `BPMux` and `BPDuplex` from `@scramjet/bpmux`.
- Active Transform Hub runtime packages must not re-import BPMux; `scripts/check-runtime-wrapper-invariants.sh` Guard 7 excludes only this retained package and `packages/verser`.

## Retention Notes

- This package is intentionally retained, not deleted, during the cleanup roadmap because `@scramjet/verser` remains a standalone legacy compatibility package.
- Keep declaration dependencies standalone-friendly; avoid coupling the public `.d.ts` to repo-local utility types unless required by the runtime implementation.
