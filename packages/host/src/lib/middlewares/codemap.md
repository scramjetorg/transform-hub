# packages/host/src/lib/middlewares/

## Responsibility

Host API request middleware layer. Currently provides audit logging middleware that tracks API request lifecycle (START, ACTIVE, END, ERROR states) for compliance/audit purposes.

## Modules

### `audit.ts` — `auditMiddleware` (62 lines)

Express-style middleware that wraps incoming API requests with audit tracking:

- Attaches an `auditData` object to each request containing a generated ID, the target resource ID (`request.params.id`), byte-level RX/TX tracking via `getRequestBytesRead`/`getRequestBytesWritten`, and the requestor identity from the `x-mw-billable` header.
- Reports audit events through the `Auditor` instance at three lifecycle points: `START` (request arrival), `ACTIVE` (every 10s while data is flowing), and `END`/`ERROR` (on completion or failure).
- Uses a 10-second interval (`ACTIVE_REQUEST_AUDIT_INTERVAL`) to emit intermediate ACTIVE audit entries only when byte counts have changed, reducing noise.
- Wires to request `end`/`close`/`error` events and response `finish`/`error` events via `Promise.all` to capture the terminal audit event.

## Integration Points

- Consumed by the `Host` class (via `HostAPIHandler` or API server middleware chain) to wrap all API requests.
- Depends on `@scramjet/model` (`IDProvider`), `@scramjet/obj-logger`, `@scramjet/types`, and `@scramjet/utility` for byte-count helpers.
- Reports to the `Auditor` instance in `../auditor.ts`.
