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

1. A selected Manager/MultiManager owns the TLS HTTP/2 `verser2` `Host` for its connected peer set.
2. STH connects outbound to that Host as a `Broker` for STH-originated requests and streams.
3. When Manager-originated requests must reach STH, STH also registers a `Guest` route.
4. Manager-side code dispatches Manager to STH traffic through the Host/Broker/Guest routing surface instead of exposing old `VerserConnection`, raw HTTP/2 sessions, or BPMux channels to application code.
5. MultiManager follows the same selected-Host model. It may own or select a Host, but it must not assume that `verser2` provides shared route state across multiple Host processes.

### Standalone STH mode

1. STH still uses the same `verser2` Broker/Guest transport abstractions.
2. If no external Manager/MultiManager Host exists, STH may own a local Host for standalone runner and sequence routing.
3. The local Host is an STH deployment concern, not an intermediate relay in platform-connected mode.

### Runner and runtime mode

1. Host/STH reaches the outer runner as `STH Broker -> selected Host -> runner Guest`.
2. Host/STH reaches sequence-exposed APIs as `STH Broker -> selected Host -> sequence Guest` where the Guest is attached by the stack-specific runtime wrapper.
3. The outer runner owns global runner connectivity: Host URL, CA/trust material, optional client identity, runner route registration, process lifecycle, certificate delivery, reconnect/disconnect, and global streams such as stdio, control, monitoring, input, output, and logs.
4. Stack-specific runtimes own runtime-native sequence behavior: app context, non-listening `context.api` exposure, `context.hub`/sequence-to-STH API clients, framework adapters, and runtime-specific stream handling.

## Flat route topology

- All peers in a connected deployment attach directly to one selected `verser2` Host.
- STH does not run an intermediate Host between Manager/MultiManager and runner/sequence routes in platform-connected mode.
- Route state is scoped to one Host instance and its connected peer set.
- Multi-Host high availability, shared route-state replication, and cross-Host route distribution are deployment architecture or future work; they are not assumed to be built into `verser2`.
- Implementation code must therefore model Host selection explicitly and treat route-unavailable responses as normal operational states.

## Route naming, peer identity, and route state

### Route hostnames

Routes are deterministic DNS-style hostnames. Host route matching is exact hostname equality only: no wildcard, prefix, suffix, glob, regular expression, or `*.domain` matching is part of the rollout contract.

| Route | Registered by | Purpose |
| --- | --- | --- |
| `manager.<managerId>.scramjet.internal` | Manager Guest, when Manager exposes Manager-reachable handlers | Manager-reachable control, platform, and service endpoints that must be called by STH or other peers. |
| `multimanager.<multiManagerId>.scramjet.internal` | MultiManager Guest, when MultiManager exposes MultiManager-reachable handlers | MultiManager-level routing, coordination, and deployment endpoints. |
| `sth.<sthId>.scramjet.internal` | STH Guest | Manager/MultiManager to STH request forwarding and STH-exposed platform handlers. |
| `runner.<instanceId>.scramjet.internal` | Outer runner Guest | Global runner lifecycle, control, stdio, monitoring, input, output, and log routes. |
| `sequence.<instanceId>.scramjet.internal` | Stack-specific runtime Guest | Sequence-exposed API routes reached by STH. |

Route IDs are deployment-stable for the lifetime of the connected component. `sthId`, `managerId`, `multiManagerId`, and `instanceId` must be normalized before route construction and must not contain dots or characters outside the approved hostname label subset. Duplicate route registration for the same active peer set is a rollout error.

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

Each instance launch should receive separate, least-privilege material:

- outer runner Guest certificate for `runner.<instanceId>.scramjet.internal`;
- runtime Guest certificate for `sequence.<instanceId>.scramjet.internal`;
- runtime Broker client certificate for sequence to STH API calls when required;
- CA bundle for the selected Host.

Certificates should be short-lived and instance-scoped. Delivery uses files, not raw PEM/PFX values in environment variables or command arguments. Rotation issues new certificates and reconnects peers; keeping the same peer ID requires coordinated disconnect/reconnect because duplicate peer registration is fatal. Revocation removes allowlist entries and closes active connections; do not assume CRL/OCSP support unless the selected `verser2` package explicitly provides it. Cleanup removes key/cert files, Docker mount directories, and Kubernetes Secrets when the instance exits or is deleted.

### Host certificate reload behavior

`reloadTlsCertificate()` reloads Host server identity only. It does not reload client CA trust, `requestCert`, `rejectUnauthorized`, mTLS policy, existing client certificates, or Broker/Guest client identity. Client CA or mTLS policy changes require Host restart. Broker/Guest certificate rotation requires recreating client connections.

### Key and certificate file handling

- Private key files: POSIX `0600` or stricter; Docker-mounted key files should be read-only and may use `0400`.
- Private key directories: POSIX `0700`.
- CA bundle files: `0644` is acceptable when they contain only public certificates.
- Write key material atomically with restrictive modes and never log PEM/PFX values.
- Windows deployments require equivalent ACL restrictions.

### Adapter certificate injection

Process adapter launches use a per-instance state directory containing `ca.pem`, `cert.pem`, and `key.pem`, pass file paths through boot config or environment, and delete the directory during process cleanup.

Docker adapter launches use a per-instance host certificate directory mounted read-only into the runner container. Certificates are never baked into images. Boot config/environment carries only mounted paths, and the host directory is removed with container lifecycle cleanup.

Kubernetes adapter launches use a per-instance Secret mounted read-only with restrictive `defaultMode`, for example `0400`. Secrets must not be shared across instances. Owner references, labels, and finalizers should drive cleanup. A ConfigMap may hold a public CA bundle only when no private material is included. Namespace and RBAC boundaries must remain explicit.

### Node >=20 enforcement

Node-based STH and runner components must fail fast on Node versions below 20 before attempting TLS or `verser2` startup. Enforcement points include package/root `engines`, STH CLI startup, `packages/runner` `start-runner`, Node runtime bootstrap, Docker image build/runtime validation, and Kubernetes runner image selection or admission where available.

## Connectivity flows

### Manager/MultiManager ⇄ STH

- STH registers `sth.<sthId>.scramjet.internal` as a Guest when inbound Manager requests are required.
- STH registers a Broker identity for STH-originated Manager requests.
- Manager/MultiManager routes requests through Broker/Guest APIs and application-owned handlers.
- Platform, log, audit, and topic communication become explicit routed requests with streaming request or response bodies instead of implicit old-verser channels.

### STH ⇄ global runner

- The outer runner registers `runner.<instanceId>.scramjet.internal` as a Guest.
- Host-side instance lifecycle code depends on a `RunnerTransport` abstraction rather than a raw socket array.
- Legacy channel meanings map to explicit route paths and streaming bodies while migration is in progress.
- Route readiness is mandatory before lifecycle actions: startup must wait for the runner route or fail with a timeout classified as route unavailable.

### Global runner ⇄ stack-specific runtime

- The global runner supplies a boot config containing Host URL, peer IDs, route domains, CA/trust material, optional client cert/key or PFX settings, route timeouts, and lease pool settings.
- Runtime wrappers attach runtime-specific Guests for sequence APIs and create runtime-native Broker clients for sequence-to-STH API calls.
- Node uses the published Node guest/broker helpers; Python uses Python Guest and Broker/request APIs; Bun uses Bun Guest and Broker/fetch APIs.
- If a public package API is missing or differs from this model, pause implementation and produce the upstream `verser2` report rather than adding brittle local transport workarounds.

### STH ⇄ sequence API and sequence → STH API

- STH calls sequence APIs by sending routed Broker requests to `sequence.<instanceId>.scramjet.internal`.
- Sequence code calls STH APIs through runtime-provided `context.hub` helpers backed by `verser2` Broker/request or Broker/fetch behavior.
- Exposed sequence APIs are non-listening local handlers attached to runtime Guest routes; they do not open additional public HTTP servers.

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
