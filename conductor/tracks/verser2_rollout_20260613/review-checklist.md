# verser2 Rollout Automated Review Checklist

Use this checklist for automated reviews between subphases and at every phase gate. Reviewers should cite files and lines for any finding.

## Host / Guest / Broker role use

- Manager/MultiManager owns the selected upstream TLS HTTP/2 Host in platform-connected mode.
- STH connects outbound as Broker and, when Manager-connected, registers an STH Guest for Manager-callable STH APIs.
- Runner/runtime peers initiate H2 connections to the owning STH local Host; STH initiates H2 connections to Manager/MultiManager.
- Manager/MultiManager does not connect directly to runner/runtime peers, and runner/runtime peers do not connect directly to Manager/MultiManager.
- STH terminates and authorizes runner-side H2 connections; it is not a transparent H2 tunnel.
- Runtime wrappers use published Guest/Broker packages instead of local reimplementations.
- No new raw HTTP/2 session, old `VerserConnection`, or BPMux objects leak into application logic.

## Hierarchical topology and route state

- Peers connect to their immediate upstream Host: runner/runtime -> STH, STH -> Manager/MultiManager.
- Route matching uses exact hostname equality only.
- Brokers replace their full route table on route-control frames; omitted routes are retracted.
- Startup paths wait for required routes with timeout-aware readiness checks.
- Multi-Host/HA assumptions are documented as deployment/future work, not implicit `verser2` behavior.

## Lease lifecycle and streaming

- Guest request handling treats leases as one-use and opens replacements after use.
- Lease pools and timeouts are explicit and tested for route unavailable, lease unavailable, abort, and disconnect cases.
- Request and response bodies remain streamed with backpressure; production code does not rely on full-buffer direct dispatch helpers.
- Retrying is limited to idempotent operations or handlers that explicitly support retry.

## TLS, CA, and mTLS authorization

- Host TLS is mandatory and server certificate SANs match the peer `hostUrl` values actually used.
- Guest/Broker clients use explicit `ca`/`caFile`; combined CA bundles are documented when public WebPKI and private CAs are both needed.
- mTLS is required in final architecture; any exception is a temporary migration path with alternate credentials.
- `authorizeRegistration(context)` validates peer ID, exact route ownership, URI SAN, DNS SAN, issuer role, fingerprint/serial allowlist, and duplicates.
- Certificate expiry is proactively tracked; default rotation is configurable around a 24h interval, with renew-before and jitter settings.
- CSR enrollment uses one-time launch credentials for first issuance and current valid mTLS identity for rotation; CSRs with extra SANs or mismatched peer IDs are rejected.
- Runner/runtime leaf certificates may be reused only by instances of the same sequence on the same STH when the SAN set and allowlist match every peer URI identity and exact local route; peer IDs remain unique for concurrent instances.
- Per-request authorization exists in application wrappers and does not trust spoofable headers.
- Private keys are delivered as files with restrictive permissions and are not logged, passed in command arguments, or baked into images.

## Transport contracts

- Manager/STH transport abstractions expose route registration, Broker request helpers, readiness, and stream support only.
- `RunnerTransport` callers do not depend on raw channel arrays or BPMux.
- `LegacyRunnerTransport` is compatibility-only and covered by parity tests before `Verser2RunnerTransport` replaces it.
- Node, Python, and Bun runtime paths receive Host URL, explicit route domains, CA/trust material, optional client identity, and timeout settings through boot config.
- Sequence Guest startup is controlled by normalized explicit configuration; runtimes skip sequence Guest registration when no sequence API is exposed, while `context.hub` Broker access is configured independently.
- Unsupported features are rejected or documented: WebSocket upgrade, CONNECT tunneling, HTTP trailers, and informational 1xx forwarding.

## Dependency and dead-code safety

- Run `npm run check:runtime-invariants` after changes that touch transport dependencies, runner protocols, or runtime wrappers.
- Guard 7 prevents new active `@scramjet/bpmux` or old `@scramjet/verser` references outside the explicit migration allowlist.
- Final-phase removal must delete the allowlist entries as legacy paths are migrated.

## Upstream verser2 halt-and-report workflow

Halt the current subtask and produce an upstream report when missing or incorrect behavior is generic to `verser2` transport, TLS, routing, Broker, Guest, lease lifecycle, or streaming. The report must include:

1. observed Transform Hub use case;
2. failing or missing `verser2` behavior;
3. affected package/API;
4. minimal desired change;
5. blocking impact on the rollout;
6. temporary workaround, if any, and why it is or is not acceptable.

Do not add brittle Transform Hub-specific workarounds for upstream `verser2` issues without explicit approval.
