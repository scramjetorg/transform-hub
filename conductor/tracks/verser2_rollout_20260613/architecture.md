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
