# Proposal: Type Instance Output Content-Type

| Field | Value |
|-------|-------|
| Title | Type instance output content-type |
| Category | typings |
| Scope | packages/types, packages/api-server |
| Breaking | no |

## Problem Statement

When a consumer reads from an instance `/output` route, the HTTP `Content-Type` response header is sometimes `application/octet-stream` even though the Sequence produces structured data such as NDJSON. This forces consumers to hard-code parsers instead of relying on the declared type.

## Current Behavior

- The output route does not consistently propagate the Sequence-level content type.
- Consumers expecting `application/x-ndjson` receive `application/octet-stream` and must sniff or override.
- There is no typed contract linking a Sequence's output metadata to the HTTP response headers.

## Expected Behavior

- The output route returns a content type that matches the Sequence's declared output encoding.
- Type definitions include an optional `contentType` field on output metadata so the host and adapters can forward it.
- If the Sequence does not declare a type, the fallback remains `application/octet-stream`.

## Proposed Change

1. Add an optional `contentType?: string` field to the relevant output descriptor interface in `packages/types`.
2. In `packages/api-server`, ensure the `/output` handler reads the content type from the instance adapter or CSI controller and sets the response header before piping the stream.
3. Update Sequence packaging logic so that `package.json` or sequence metadata can carry the default content type.

## Backwards Compatibility

No breaking changes. When `contentType` is absent, behavior falls back to today.

## Testing Plan

- Unit test: mock instance adapter with a declared content type and assert the response header.
- Integration test: deploy a Sequence that yields NDJSON objects, call `/output`, and assert `Content-Type: application/x-ndjson`.

## References

- `docs/read-more/stream-and-api.md`
- `packages/api-server/src/handlers/stream.ts`
- `packages/types/src/index.ts`
