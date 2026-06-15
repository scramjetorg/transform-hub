# Route Forwarding Classification

## Purpose

This document classifies Manager, STH, instance, topic, storage, and RPC API routes by action semantics for the verser2 rollout. The classification must not rely on HTTP method alone. It decides whether a request should be handled by Manager-owned multiplexing or by a follow-style route to a single owning STH or instance.

The immediate implementation target is redirect-readiness: Transform Hub should separate route decisions now, while verser2 native follow behavior is pending in `signicode/verser2#20`.

## Routing Decisions

### Follow

Use follow when all of these are true:

- Exactly one target owner is known.
- The action is intended to happen once at that owner.
- No fan-in or fan-out is needed.
- Manager-owned state is not the source of truth for the response.
- For streams, the stream is between the caller and one target, not a Manager aggregate.

During redirect-readiness, Manager may resolve the target internally and return the target response or stream to the original caller only for requests that entered through the Manager API surface. Later, once verser2 supports native route-aware follow, Manager can return a verser2-followable redirect instead of invoking the target internally.

For STH-originated payloads targeting another STH, Manager must not use this dummy handler as a data-plane proxy. Manager may return or publish route ownership metadata, but the STH must use the target STH route directly.

### Manager Multiplex

Use Manager multiplexing when any of these are true:

- Multiple producers or consumers may participate.
- Manager exposes an aggregate view.
- The route represents topic distribution rather than one target operation.
- The request is bidirectional and not covered by a dedicated direct route protocol.

Manager multiplexing is not caching. Streams should be current live streams, and replay or durable buffering must not be introduced as part of this classification.

### Manager Owned

Use Manager-owned handling when Manager is the source of truth or the action controls Manager state. These routes are neither follow nor multiplex decisions, even when they return a stream.

### Unsupported Bidirectional

Use unsupported-bidirectional for duplex or coupled request/response flows that need a dedicated route protocol before they can safely move to verser2. Generic follow and Manager multiplexing should not be applied to these routes by default.

## Redirect-Readiness Model

Until verser2 supports native internal follow, Manager should implement a dummy redirect handler for follow-classified routes:

- Classify the incoming Manager-level route.
- Resolve the owning STH, instance, or local Manager target.
- For Manager API callers, internally issue the target request over the active verser2 transport.
- Return the target response or stream to the original caller.
- Keep this handler shaped so it can later be replaced by returning a `307` or `308` redirect to verser2.

The dummy handler must not expose verser2-internal hostnames to ordinary clients. When native verser2 follow is ready, the handler can instead return a redirect whose `Location` host is an advertised verser2 route, such as `sth.<sthId>.scramjet.internal`.

The dummy handler must not be used for direct STH-to-STH payloads. For those flows, Manager should coordinate route discovery only.

## Clear Follow Cases

These routes are safe to follow directly to an advertised STH or instance route when Manager has resolved a single owner.

| Route or Family | Action | Reason |
| --- | --- | --- |
| Manager `GET /sth/:id/*` to Host read endpoints | Read one target STH state | Single owner, no fan-out |
| Host `GET /sequence/:id` | Read sequence metadata | Single STH state read |
| Host `GET /sequence/:id/instances` | Read sequence instance list | Single STH state read |
| Host `GET /sequences` | Read STH sequence list | Single STH state read |
| Host `GET /instances` | Read STH instance list | Single STH state read |
| Host `GET /entities` | Read local STH entities | Single STH state read |
| Host `GET /load-check` | Read local STH load | Single STH state read |
| Host `GET /version`, `/config`, `/status` | Read STH metadata, public config, or status | Single STH state read |
| Host `GET /topics` | Read local topic registry | Single STH state read |
| Instance `GET /` | Read instance info | Single instance owner |
| Instance `GET /health` | Query one instance health/control status | Single instance owner |
| Instance `GET /event/:name` | Read or await one event | Single instance owner, one response |
| Instance `GET /once/:name` | Await one event once | Single instance owner, one response |
| Host `/api/v1/rpc/*` and instance `/rpc/*` | Forward to one exposed instance RPC target | Single selected instance target |

## Manager Multiplex Cases

These routes should remain Manager-owned multiplexing or aggregation points.

| Route or Family | Action | Reason |
| --- | --- | --- |
| Manager `GET /log` | Aggregate logs from all STHs | Multi-source fan-in |
| MultiManager `GET /audit` | Aggregate audit from sub-Managers | Multi-source fan-in |
| Manager `GET /load-stream` | Stream Manager load | Manager-owned continuous stream |
| Manager `GET /topic/:name` | API consumer subscribes to topic | Potentially many providers |
| Manager downstream `/topic/:name` | API provider publishes topic | Potentially many consumers |
| Host `GET /audit` | Continuous STH audit stream | Follow only for one explicitly targeted STH; Manager aggregate must multiplex |
| Host `GET /log` | Continuous STH log stream | Follow only for one explicitly targeted STH; Manager aggregate must multiplex |
| Host `GET /topic/:topic` | Consumer reads local topic | Follow only after one owner is resolved; Manager-level API should multiplex |
| Host downstream `/topic/:topic` | Provider writes local topic | Follow only for one explicit target; Manager-level API should multiplex |
| Instance `GET /stdout`, `/stderr`, `/log`, `/monitoring`, `/output` | Continuous instance streams | Follow for one target; aggregate use should multiplex |
| Instance downstream `/stdin`, `/input` | Streaming input to instance | Follow for one explicit target; topic-like distribution should multiplex |
| Instance `GET /events/:name` | Continuous event stream | Follow for one target; aggregate consumers should multiplex |

## Manager-Owned Cases

These routes should be handled by Manager because Manager owns the state or control operation.

| Route or Family | Action | Reason |
| --- | --- | --- |
| Manager storage `GET /s3` | Read Manager storage index | Manager owns the store index |
| Manager storage `GET /s3/:file` | Read Manager-owned object | Manager owns the stored object unless storage ownership later moves |
| Manager storage `PUT /s3/:file` | Store sequence package in Manager storage | Manager owns sequence package storage |
| Manager storage `DELETE /s3/:file` | Delete Manager storage object or index | Manager owns sequence package storage |
| Manager `GET /sth/:id/info` | Read Manager's connected-STH registry metadata | Manager owns connection registry state |
| Manager `GET /version`, `/config`, `/health` | Read Manager metadata, config, or health | Manager owns the response |
| Manager `GET /list`, `/instances`, `/sequences`, `/all_sequences`, `/entities`, `/topics` | Read Manager aggregate registry views | Manager owns the aggregate registry view |
| Manager `GET /load` | Read Manager process load | Manager owns the response |
| Manager `DELETE /store` | Clear Manager storage index | Manager owns store state |
| Manager `DELETE /sth/:id` | Disconnect STH from Manager registry | Manager owns connection policy |
| Manager `POST /disconnect` | Apply Manager disconnect policy | Manager owns connection policy |

## State-Changing Single-Owner Follow Cases

These routes mutate state or lifecycle and are follow-safe only when Manager has resolved exactly one owning STH or instance. They should never be multiplexed.

| Route or Family | Action | Classification |
| --- | --- | --- |
| Host downstream `/sequence` | Upload or create sequence on one STH | Follow to selected STH only |
| Host downstream `PUT /sequence/:id` | Update sequence on one STH | Follow to owning STH only |
| Host `DELETE /sequence/:id` | Delete sequence on one STH | Follow to owning STH only |
| Host `POST /sequence/:id/start` | Start instance on one STH | Follow to selected or owning STH only |
| Instance `POST /_stop`, `/_kill` | Stop or kill one instance | Follow to owning instance only |
| Instance `POST /_event` | Emit event to one instance | Follow to owning instance only |
| Instance `POST /_monitoring_rate` | Change one instance monitoring rate | Follow to owning instance only |
| Instance `POST /set` | Mutate one instance context or state | Follow to owning instance only |
| Manager-owned storage and control routes | Mutate Manager-owned state | Manager-owned, no follow |

## Tricky Or Bidirectional Cases

These cases need dedicated route policy or protocol-specific implementation.

| Route or Family | Concern | Recommendation |
| --- | --- | --- |
| Host `/platform` duplex | Bidirectional Manager/STH control stream | Use a dedicated verser2 control/stream route, not generic follow |
| Instance `/inout` duplex | Coupled input and output stream | Use a dedicated direct target route; do not Manager-multiplex unless a protocol-specific multiplexer exists |
| Manager `/sth/:id/*` generic proxy | Can include any Host API action | Classify the target path before choosing follow or Manager handling |
| Host `/cpm/*` STH-originated Manager API calls | Some routes are Manager-owned, others can target STH/storage/topic owners | Use the same Manager route classifier |
| Topic provider/consumer pairing | Direct STH-to-STH, API-to-STH, STH-to-API, and many-to-many cases differ | Manager coordinates route ownership and multiplexes whenever there is not exactly one direct peer pair |
| RPC endpoints | Instance-defined semantics are unknown | Follow only after target instance route is selected; do not assume cache or replay safety |

## Direct STH-To-STH Constraint

Direct STH-to-STH payloads must not route through Manager data-plane forwarding. Manager may coordinate discovery, route ownership, topic membership, and route selection. If a request is classified as follow-safe and targets another STH, the STH-originated request should use the target STH route directly until native verser2 follow is available.

For external API clients that enter through Manager, the temporary dummy redirect handler may return the target stream while native verser2 follow is unavailable. This is a Manager API compatibility bridge, not a permitted STH-to-STH data path.

If a route is classified as Manager multiplex, Manager may remain in the stream path because the route semantics require fan-in, fan-out, aggregation, or Manager-owned state.

## Upstream Dependency

Native route-aware follow is tracked in `signicode/verser2#20`: <https://github.com/signicode/verser2/issues/20>.

When that feature is available, replace the dummy internal redirect handler with native verser2 follow behavior for follow-classified routes. The route classifier should remain as the source of truth for deciding whether a route is follow-safe or Manager-multiplexed.
