# verser2 Rollout Architecture

This document is the Phase 1 design record for replacing legacy STH connectivity with TLS HTTP/2 `verser2` routing. It is intentionally architecture-first: implementation tasks must keep using package-local tests and must stop with an upstream report when missing `verser2` behavior is generic transport, TLS, routing, Broker, Guest, or streaming functionality.

## Current connectivity responsibilities

| Area | Current responsibility | Legacy coupling to remove |
| --- | --- | --- |
| Manager (`packages/manager`) | Owns connected STH/Host controllers, request forwarding, service discovery, health and topic routing. | `STHController` wraps old `VerserConnection` and forwards Manager/Host requests over `@scramjet/verser`/BPMux. |
| MultiManager (`packages/multi-manager`) | Owns multiple Manager instances and accepts Host/MultiHost connections. | Creates old `Verser` server and `MultiHostController` uses numbered old-verser channels. |
| Host/STH (`packages/host`) | Owns sequence and instance lifecycle, API server, Manager connection, and runner supervision. | `CPMConnector` uses old `VerserClient`; `SocketServer` accepts raw 9-socket runner channels; `CSIController` uses BPMux for requests. |
| Outer runner (`packages/runner`) | Owns adapter-launched process startup, boot config, child runtime selection, lifecycle exit mapping, and global stdio/control/monitoring bridge. | `HostClient` opens raw per-channel sockets to Host and uses BPMux on the request channel. |
| Runtime wrappers (`packages/runner-node`, `packages/runner-python`, `packages/runner-bun`) | Own runtime-specific sequence context, sequence execution, local API exposure, runtime-native sequence-to-STH API access, and parity behavior. | Node uses BPMux-backed `HostClient`; Python uses fd/frame and host socket behavior; Bun currently delegates host-integrated behavior to Node. |
| API server (`packages/api-server`) | Provides HTTP routing primitives for STH/Manager APIs. | No direct old-verser dependency; future forwarding helpers must avoid unsupported HTTP features. |
| Shared contracts (`packages/types`, `packages/symbols`) | Define runtime executor/boot config and the legacy `CommunicationChannel` model. | Channel-index contracts remain compatibility inputs during migration but must not define final `verser2` topology. |

## Final verser2 role model

### Platform-connected Manager/MultiManager mode

1. A selected Manager/MultiManager owns the upstream TLS HTTP/2 `verser2` `Host` for STH control-plane connections.
2. STH connects outbound to that Host as a `Broker` for STH-originated requests and streams.
3. STH also connects outbound to that Host as a `Guest` for the Manager-callable STH API surface. Manager-originated STH API calls route through the Manager/MultiManager Host to the STH Guest route; Manager/MultiManager does not need to initiate an inbound connection to STH.
4. Manager-side code dispatches Manager to STH traffic through the Host/Broker/Guest routing surface instead of exposing old `VerserConnection`, raw HTTP/2 sessions, or BPMux channels to application code.
5. MultiManager follows the same selected-Host model. It may own or select the upstream Host for STH peers, but it must not assume that `verser2` provides shared route state across multiple Host processes.

### Standalone STH mode

1. STH still uses the same `verser2` Broker/Guest transport abstractions.
2. STH owns the local runner-side Host for runner and runtime peers.
3. If no external Manager/MultiManager Host exists, STH has no upstream Manager/MM connection but still uses the local runner-side Host for instances.

### Runner and runtime mode

1. The outer runner initiates an outbound mTLS HTTP/2 connection to the owning STH local Host and registers `runner.<instanceId>.scramjet.internal` as a Guest.
2. Stack-specific runtimes initiate outbound mTLS HTTP/2 connections to the owning STH local Host and register `sequence.<instanceId>.scramjet.internal` as Guests only when sequence API exposure is enabled by explicit normalized configuration.
3. The outer runner owns global runner connectivity: Host URL, CA/trust material, optional client identity, runner route registration, process lifecycle, certificate delivery, reconnect/disconnect, and global streams such as stdio, control, monitoring, input, output, and logs.
4. Stack-specific runtimes own runtime-native sequence behavior: app context, non-listening `context.api` exposure, `context.hub`/sequence-to-STH API clients, framework adapters, and runtime-specific stream handling.

## Hierarchical H2 connection topology

HTTP/2 connection establishment is downstream-to-upstream by control-plane ownership:

```text
runtime/sequence Guest/Broker  ->  owning STH local verser2 Host
outer runner Guest             ->  owning STH local verser2 Host
STH Broker/Guest               ->  selected Manager/MultiManager verser2 Host
```

- Instance runners and runtime wrappers connect to their owning STH, not directly to Manager/MultiManager.
- STH connects to Manager/MultiManager as the next upstream control plane.
- Manager/MultiManager does not establish direct H2 connections to runner/runtime peers.
- Manager-originated STH API calls are routed through the Manager/MultiManager Host to the STH Guest. Manager-originated runner or sequence commands reach STH first; STH then performs the corresponding runner or sequence operation over its local runner-side transport.
- STH is not a transparent TCP/H2 tunnel. It terminates and authorizes runner-side connections, then issues separate routed requests upstream or downstream as application transport operations.
- Route state is scoped to each Host instance and connected peer set. Manager/MM route state and STH-local runner route state are separate.
- Multi-Host high availability, shared route-state replication, and cross-Host route distribution are deployment architecture or future work; they are not assumed to be built into `verser2`.
- Implementation code must model upstream/downstream Host selection explicitly and treat route-unavailable responses as normal operational states.

## Route naming, peer identity, and route state

### Route hostnames

Routes are deterministic DNS-style hostnames. Host route matching is exact hostname equality only: no wildcard, prefix, suffix, glob, regular expression, or `*.domain` matching is part of the rollout contract.

| Route | Registered by | Purpose |
| --- | --- | --- |
| `manager.<managerId>.scramjet.internal` | Manager Guest, when Manager exposes Manager-reachable handlers | Manager-reachable control, platform, and service endpoints that must be called by STH or other peers. |
| `multimanager.<multiManagerId>.scramjet.internal` | MultiManager Guest, when MultiManager exposes MultiManager-reachable handlers | MultiManager-level routing, coordination, and deployment endpoints. |
| `sth.<sthId>.scramjet.internal` | STH Guest, required for Manager-connected STHs | Manager/MultiManager to STH API calls and STH-exposed platform handlers. |
| `runner.<instanceId>.scramjet.internal` | Outer runner Guest | Global runner lifecycle, control, stdio, monitoring, input, output, and log routes. |
| `sequence.<instanceId>.scramjet.internal` | Stack-specific runtime Guest, only when sequence API exposure is enabled | Sequence-exposed API routes reached by STH. |

Route IDs are deployment-stable for the lifetime of the connected component. `sthId`, `managerId`, `multiManagerId`, and `instanceId` must be normalized before route construction and must not contain dots or characters outside the approved hostname label subset. Duplicate route registration for the same active peer set is a rollout error. Route hostnames remain instance-specific even when certificate material is reused for instances of the same sequence on one STH.

### Peer IDs

Every Broker and Guest has a unique peer ID within the selected Host's connected peer set. Recommended peer IDs are:

- `manager:<managerId>:broker` and `manager:<managerId>:guest`;
- `multimanager:<multiManagerId>:broker` and `multimanager:<multiManagerId>:guest`;
- `sth:<sthId>:broker` and `sth:<sthId>:guest`;
- `runner:<instanceId>:guest`;
- `sequence:<instanceId>:guest`;
- runtime-native Broker clients as `sequence:<instanceId>:<runtime>:broker` where `<runtime>` is `node`, `python`, or `bun`.

Duplicate peer registration is fatal for the registering component. Recovery requires disconnecting the duplicate peer, issuing fresh identity material if needed, and reconnecting with a unique peer ID.

### Route table semantics

Brokers must treat route-control frames from the Host as a replacement of the full known route table, not as incremental patches. Shorter frames retract omitted routes, and empty frames retract all previously known routes for that Broker. Broker code must handle route loss as normal operational state and must not keep sending to cached stale routes.

Broker startup paths must use `waitForRoute(domain)` or an equivalent timeout-aware readiness gate before sending routed requests. Readiness gates must classify timeout as route unavailable rather than as protocol corruption.

### Certificate identity conventions

Certificate identities must bind the route hostname and the peer identity used by registration/authorization:

- route-serving Guest certificates include `DNS:<route-hostname>` for every route registered by that peer;
- client/peer identity certificates include `URI:urn:verser:client:<peerId>` where client identity is required;
- Manager, MultiManager, STH, runner, and sequence certificates must not rely on common name matching for authorization;
- authorization allowlists should use certificate fingerprints and route/peer IDs rather than mutable display names.

## TLS, CA, authorization, and certificate provisioning

### CA hierarchy by deployment mode

Platform-connected deployments use the Manager/MultiManager selected Host as the TLS HTTP/2 `verser2` Host. Host TLS is mandatory. The Host server certificate must be valid for every DNS name or IP address used by peers in `hostUrl`; Docker and Kubernetes internal names must be included when those are the actual connection targets. A platform CA anchors Manager/MultiManager Host identity.

In platform-connected mode, STH receives or manages a delegated, scoped CA for runner and runtime peer certificates. That delegated CA must issue only runner/runtime identities and must not be accepted for Manager, MultiManager, or STH server identities. The Manager/MultiManager Host trust bundle may include both platform and delegated CA roots/intermediates, but role authorization must still verify that the issuer is valid for the registering role.

Standalone STH deployments use a local STH CA. STH creates or loads this CA and uses it for the local `verser2` Host server certificate, STH Broker/Guest identity when needed, and per-runner/per-runtime certificates. Standalone remains TLS-only; a non-TLS `verser2` path is test-only and must not become a product mode.

### Guest and Broker trust behavior

Guest and Broker clients must use explicit trust material with `ca` or `caFile`. In Node TLS, configuring `ca` replaces the default CA set for that connection. Deployments that need both public WebPKI and private platform CA trust must provide a combined CA bundle. `rejectUnauthorized: false` and `NODE_TLS_REJECT_UNAUTHORIZED=0` are prohibited outside isolated tests.

### mTLS policy

The final architecture requires mTLS for all `verser2` peers:

- STH Broker/Guest connecting to Manager/MultiManager Host;
- Manager/MultiManager Broker/Guest peers when they connect to another Host;
- outer runner Guest;
- runtime Guest;
- runtime Broker clients used for sequence to STH API calls.

The Host must configure client authentication using the accepted CA bundle. Clients receive `certFile`/`keyFile` or PFX/PKCS12 material. Any temporary optional-mTLS migration mode must require an alternative registration credential and must be removed or explicitly narrowed before the default switch. Unauthenticated runner/runtime registration is not allowed in the final model.

### Registration-time authorization

`authorizeRegistration(context)` is the registration-time authorization boundary. It must validate:

- peer ID format and role;
- exact route domain ownership for the registering role;
- `URI:urn:verser:client:<peerId>` when peer identity is required;
- `DNS:<route-hostname>` SAN coverage for every registered Guest route;
- certificate fingerprint or serial allowlist membership;
- issuer CA acceptance for the registering role;
- duplicate peer ID or duplicate active route rejection.

Common names must not be used for authorization. Dynamically generated runner/runtime certificates must have their expected fingerprint or serial recorded in an active-instance registry before process launch.

### Per-request authorization

`verser2` registration authorization does not replace application authorization. Manager, STH, runner, and runtime wrappers must enforce per-request permissions in their Broker/Guest handlers. Handlers must derive caller identity from authenticated peer context, not from spoofable request headers, and must check caller role, instance ID, target route, and operation. A valid runner or runtime certificate must not authorize calls to unrelated STH or Manager APIs.

### Per-runner and per-runtime certificate lifecycle

Each instance launch receives or references least-privilege material:

- outer runner Guest certificate for `runner.<instanceId>.scramjet.internal`;
- runtime Guest certificate for `sequence.<instanceId>.scramjet.internal`;
- runtime Broker client certificate for sequence to STH API calls when required;
- CA bundle for the selected Host.

Certificates are short-lived and proactively rotated. The default certificate lifetime is 48 hours, the default rotation interval is 24 hours, and renewal is forced no later than 6 hours before expiry. These values must be configurable, for example `tls.certLifetime`, `tls.certRotationInterval`, `tls.certRenewBefore`, and `tls.certRotationJitter`. Rotation starts when the configured interval elapses or when the certificate enters the renew-before window. A small jitter should be applied to avoid thundering-herd renewal.

Expired certificates are invalid for new TLS handshakes and registration. Hosts must reject expired peer certificates during handshake or `authorizeRegistration(context)`. Because TLS stacks may not terminate already-established sessions exactly at `notAfter`, each component must track certificate expiry itself and proactively rotate, close, and reconnect before expiry. If rotation is missed, runner/sequence routes become unavailable until a valid certificate is issued and the peer reconnects. There is no unauthenticated fallback.

Certificate issuance is owned by the immediate upstream authority for the connection being made. Manager/MultiManager platform identity and Host server certificates come from the platform CA or deployment PKI. STH certificates for the STH -> Manager/MM connection come from the platform enrollment path. Runner and runtime certificates are issued by the owning STH local CA in standalone mode, or by a delegated runner/runtime CA provisioned to STH in platform-connected mode.

CSR enrollment is used when the private key should be generated inside the component that will use it. The peer generates a private key and CSR containing only the expected SANs: `URI:urn:verser:client:<peerId>` for each peer identity the certificate may authenticate and the exact `DNS:<route-hostname>` values required for its role. Common Name is ignored. The CSR is sent to the immediate upstream issuer using a one-time launch enrollment credential for first issuance, or the current valid mTLS identity for rotation. STH signs runner/runtime CSRs only when they match an active launch, sequence, or instance record: expected STH, sequence ID, instance ID when instance-scoped, peer ID, role, route domains, SAN set, and issuer scope. Extra SANs or mismatched peer IDs are rejected. After signing, STH records the certificate serial/fingerprint in its active registry before allowing registration.

Leaf certificates may be reused by instances of the same sequence on a single STH only when the certificate is explicitly sequence-scoped, still valid, still allowlisted on that STH, and its SAN set covers both identity and route requirements for every peer using it. That means the certificate must include the exact `URI:urn:verser:client:<peerId>` SAN for each active or pre-authorized peer ID and the exact `DNS:<route-hostname>` SAN for each route registered with that certificate. Unique peer IDs are still required for concurrent instances; certificate reuse does not permit duplicate peer registration. Reuse must not cross STH boundaries, sequence identities, or trust domains. If a new instance has an instance-specific peer ID or route hostname that is not already covered by the reusable certificate, STH must issue or rotate a certificate before registration. Revoking a reused sequence-scoped certificate invalidates all local instances using it, so operators may choose stricter per-instance certificates for smaller blast radius.

Delivery uses files, not raw PEM/PFX values in environment variables or command arguments. Rotation writes new material atomically, updates the allowlist, and reconnects peers. Keeping the same peer ID requires coordinated disconnect/reconnect because duplicate peer registration is fatal. Revocation removes allowlist entries and closes active connections; do not assume CRL/OCSP support unless the selected `verser2` package explicitly provides it. Cleanup removes key/cert files, Docker mount directories, and Kubernetes Secrets when the sequence/instance exits or is deleted and no same-sequence local instance still references reusable material.

### Host certificate reload behavior

`reloadTlsCertificate()` reloads Host server identity only. It does not reload client CA trust, `requestCert`, `rejectUnauthorized`, mTLS policy, existing client certificates, or Broker/Guest client identity. Client CA or mTLS policy changes require Host restart. Broker/Guest certificate rotation requires recreating client connections.

### Key and certificate file handling

- Private key files: POSIX `0600` or stricter; Docker-mounted key files should be read-only and may use `0400`.
- Private key directories: POSIX `0700`.
- CA bundle files: `0644` is acceptable when they contain only public certificates.
- Write key material atomically with restrictive modes and never log PEM/PFX values.
- Windows deployments require equivalent ACL restrictions.

### Adapter certificate injection

Process adapter launches use a per-instance or STH-local sequence-scoped state directory containing `ca.pem`, `cert.pem`, and `key.pem`, pass file paths through boot config or environment, and delete unreferenced material during process cleanup.

Docker adapter launches use a per-instance or STH-local sequence-scoped host certificate directory mounted read-only into the runner container. Certificates are never baked into images. Boot config/environment carries only mounted paths, and the host directory is removed when no live local sequence instance references it.

Kubernetes adapter launches use per-instance or STH-local sequence-scoped Secrets mounted read-only with restrictive `defaultMode`, for example `0400`. Reused Secrets must be limited to instances of the same sequence on the same STH. Owner references, labels, and finalizers should drive cleanup only after the last referencing local instance exits. A ConfigMap may hold a public CA bundle only when no private material is included. Namespace and RBAC boundaries must remain explicit.

### Node >=20 enforcement

Node-based STH and runner components must fail fast on Node versions below 20 before attempting TLS or `verser2` startup. Enforcement points include package/root `engines`, STH CLI startup, `packages/runner` `start-runner`, Node runtime bootstrap, Docker image build/runtime validation, and Kubernetes runner image selection or admission where available.

## Connectivity flows

### Manager/MultiManager ⇄ STH

- Manager-connected STH always registers `sth.<sthId>.scramjet.internal` as a Guest for Manager-callable STH APIs. Without this Guest, Manager cannot call STH APIs over `verser2`.
- STH registers a Broker identity for STH-originated Manager requests.
- Manager/MultiManager routes requests through Broker/Guest APIs and application-owned handlers.
- Platform, log, audit, and topic communication become explicit routed requests with streaming request or response bodies instead of implicit old-verser channels.

### STH ⇄ global runner

- The outer runner initiates the H2 connection to the owning STH local Host and registers `runner.<instanceId>.scramjet.internal` as a Guest.
- Host-side instance lifecycle code depends on a `RunnerTransport` abstraction rather than a raw socket array.
- Legacy channel meanings map to explicit route paths and streaming bodies while migration is in progress.
- Route readiness is mandatory before lifecycle actions: startup must wait for the runner route or fail with a timeout classified as route unavailable.

### Global runner ⇄ stack-specific runtime

- The global runner supplies a boot config containing the owning STH local Host URL, peer IDs, route domains, CA/trust material, optional client cert/key or PFX settings, CSR/enrollment settings where used, route timeouts, and lease pool settings.
- Runtime wrappers attach runtime-specific Guests for sequence APIs and create runtime-native Broker clients for sequence-to-STH API calls.
- Node uses the published Node guest/broker helpers; Python uses Python Guest and Broker/request APIs; Bun uses Bun Guest and Broker/fetch APIs.
- If a public package API is missing or differs from this model, pause implementation and produce the upstream `verser2` report rather than adding brittle local transport workarounds.

### STH ⇄ sequence API and sequence → STH API

- STH calls sequence APIs by sending routed Broker requests to `sequence.<instanceId>.scramjet.internal` only when the runtime registered that Guest route.
- Sequence code calls STH APIs through runtime-provided `context.hub` helpers backed by `verser2` Broker/request or Broker/fetch behavior.
- Exposed sequence APIs are non-listening local handlers attached to runtime Guest routes; they do not open additional public HTTP servers.

### Sequence API exposure configuration

Sequence Guest startup must be driven by a normalized explicit configuration model rather than by the current quirky implicit behavior. The migration should introduce one resolved runtime exposure decision before transport startup:

- `sequenceApi.enabled`: starts a `sequence.<instanceId>.scramjet.internal` Guest when true and skips it when false;
- `sequenceApi.routes` or equivalent route metadata: declares the local handlers to expose;
- `sequenceApi.required`: fails startup if exposure is enabled but the runtime cannot attach the Guest;
- `hubApi.enabled`: controls whether runtime-native sequence -> STH API helpers start a Broker client for `context.hub`.

Runtimes that do not expose a sequence API should not register a sequence Guest. STH callers must treat the missing sequence route as a configured capability absence, not as a transport failure. Sequence -> STH API access remains independent from STH -> sequence API exposure: a sequence may need `context.hub` without exposing any inbound API route.

## Transport abstraction contracts

### Manager/STH transport

Manager, MultiManager, and STH code must depend on an application transport abstraction rather than on old-verser classes or raw `verser2` session internals. The abstraction may expose:

- Host lifecycle configuration for the selected Manager/MultiManager or standalone STH Host;
- Broker startup and shutdown;
- Guest route registration and handler attachment;
- `waitForRoute(domain, timeout)` readiness;
- routed request helpers equivalent to `broker.request({ targetId, method, path, headers, body })`;
- streaming request and response body support;
- route-unavailable, duplicate-registration, and registration-rejected error classes.

The abstraction must not expose raw HTTP/2 sessions, old `VerserConnection` equivalents, BPMux channels, channel indexes, or lease objects to Manager/STH application logic.

### RunnerTransport

Host-side instance lifecycle code should depend on `RunnerTransport` rather than raw socket channel arrays. The migration should introduce a legacy implementation first, then a `verser2` implementation:

- `LegacyRunnerTransport` wraps current `SocketServer`, `HostClient`, `CommunicationChannel`, and BPMux behavior to preserve parity while callers move behind the interface.
- `Verser2RunnerTransport` targets `runner.<instanceId>.scramjet.internal` and sequence routes through Broker requests over the owning STH local Host.
- The interface owns route readiness, route unavailable classification, reconnect/disconnect state, and stream lifecycle cleanup.

Legacy channel semantics map to explicit routes and streaming bodies:

| Legacy channel | Final transport meaning |
| --- | --- |
| `STDIN` | Routed streaming request or long-lived stream endpoint from Host/STH to runner stdin. |
| `STDOUT` | Routed streaming response or runner-pushed stream for stdout. |
| `STDERR` | Routed streaming response or runner-pushed stream for stderr. |
| `CONTROL` | Routed request/response control operations such as STOP, KILL, SET, EVENT, and health probes. |
| `MONITORING` | Routed streaming body for lifecycle, health, and monitoring frames. |
| `IN` | Routed stream for sequence input. |
| `OUT` | Routed stream for sequence output. |
| `LOG` | Routed streaming body for sequence logs. |
| `REQUESTS` | Replaced by Broker requests/fetch helpers for API calls; no BPMux compatibility object in final transport. |

### Lease lifecycle and timeouts

`verser2` routed streams are modeled as one-use leases. Guests keep a lease pool for incoming routed requests; each request consumes one lease. Implementations must open replacement leases after use and must keep enough waiting leases for expected concurrency. Lease exhaustion is a backpressure and availability signal, not a reason to buffer unlimited bodies in memory.

Default settings should be explicit and package-configurable:

- minimum waiting leases per Guest route;
- maximum lease pool size per route;
- lease acquire timeout for Broker requests;
- route readiness timeout;
- idle stream timeout;
- request body and response body cancellation behavior.

Timeouts must classify failures as route unavailable, lease unavailable, stream aborted, or peer disconnected. Retrying is allowed only for idempotent operations or operations whose handlers explicitly support retry.

### Stack-specific runtime capabilities

Runtime wrappers must use the published runtime packages and shared helpers instead of reimplementing Guest/Broker transport:

- Node: `@signicode/verser2-guest-node` for Guest attachment and Broker helpers, plus shared `@signicode/verser-common` / `@signicode/verser2-guest-js-common` where public APIs require them.
- Python: `@signicode/verser2-guest-python` or the published Python package name for Guest and Broker/request behavior; Python Guests must always receive explicit routed domains because they do not default domains to Guest ID.
- Bun: `@signicode/verser2-guest-bun` for Guest `fetch`/routes and Broker/fetch behavior, plus shared JS common packages where public APIs require them.

If these package names or public APIs differ at implementation time, stop the current subtask and produce the upstream `verser2` report unless the fix is a local dependency-name correction with no architecture impact.

### API forwarding and unsupported features

API forwarding helpers must preserve streaming and backpressure for request and response bodies. They may adapt HTTP method, path, headers, status, and body streams to the selected Broker request/fetch API. They must not require full response buffering or rely on direct/test-only dispatch paths in production.

The rollout explicitly excludes unsupported forwarding behavior from the `verser2` capability set: WebSocket upgrade, CONNECT tunneling, HTTP trailers, and informational 1xx responses such as `100-continue`. If public API handlers receive these requests, they should reject them clearly or keep them on a documented non-`verser2` path until a future upstream capability exists.

## Migration flags

- Temporary migration flags may choose between legacy and `verser2` transports only while a phase still needs parity coverage.
- No temporary flag may introduce a non-TLS `verser2` path.
- Flags must be scoped by layer: Manager/STH transport, global runner transport, and stack-specific runtime transport.
- The final architecture has no feature flag requirement: `verser2` is the default and active connectivity substrate.
- Legacy old-verser, raw socket, and BPMux paths must be deleted or narrowed to explicitly deprecated compatibility code before final completion.

## Implementation notes for later phases

- Do not expose raw HTTP/2 sessions, old `VerserConnection` equivalents, or BPMux objects from new transport abstractions.
- Prefer exact route readiness checks such as `waitForRoute(domain)` or timeout-aware equivalents before routed requests.
- Preserve streaming and backpressure: large request/response bodies must remain stream-based and must not require full buffering.
- Unsupported HTTP forwarding features are not rollout requirements: WebSocket upgrade, CONNECT tunneling, trailers, and informational 1xx forwarding must be documented or rejected at the API boundary.
