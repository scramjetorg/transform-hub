---
id: sequences-communication
slug: /sequences/communication
title: Choosing a sequence communication path
---

# Choosing a sequence communication path

Choose the narrowest path that matches delivery needs:

| Need | Use | Contract |
|---|---|---|
| Transform a bounded or continuous payload | input/output stream | Backpressure and content type are part of the stream contract. |
| Ask the Hub or Space for current state | `hubClient()` or `spaceClient()` | Request/response; Hub and Space scopes remain distinct. |
| Notify observers | `emit()` or `emitToSpace()` | Transient event; not durable and not proof of delivery. |
| Decouple producers and consumers | Hub/Space topic | Named live route; no persistence or replay. |

## Streams

Streams carry data through the sequence pipeline and can be streamed, paged, or represented by a configured artifact/reference when the result is large. Preserve the declared content type. A consumer disconnect can end the stream; the platform does not provide exactly-once delivery.

## API calls and events

Use the v2 fluent `hubClient()` for current-Hub operations and `spaceClient()` for Manager/Space operations. The legacy `this.hub` and `this.space` properties remain for compatibility. Events are notifications over the monitoring/control path. They are scoped to an instance or Space, transient, and may be lost on disconnect; do not use them as a checkpoint or command queue.

The sequence owns its payload and route policy. The Hub/Manager owns transport and routing. Authentication, authorization, TLS, and public ingress remain deployment responsibilities.

### Request/response and RPC

For a typed request/response call, use the fluent client and inspect the returned envelope:

```typescript
import type { AppConfig, SequenceAppContext } from "@scramjet/sequence-types";
import type { HubClient, SpaceClient } from "@scramjet/rest-api2";

type Context = SequenceAppContext<AppConfig, unknown, HubClient, SpaceClient>;

export async function request(this: Context) {
  const health = await this.hubClient().health.get();
  if (!health.body.healthy) throw new Error("Hub is not ready");
  const inventory = await this.spaceClient().instances.get();
  return { hub: health.body, instances: inventory.body.items.length };
}
```

An exposed instance endpoint is reached through the instance RPC route. The v2 `RpcRequest` shape
contains (`method`, `path`, optional `headers` and `body`) and the `RpcResponse` shape returns
`status`, `headers`, and an optional `body`; use the Manager/Space-prefixed route when the instance
belongs to another Hub:

```bash
curl --fail --request POST \
  'http://manager.example/api/v2/spaces/space-1/hubs/hub-2/instances/instance-7/rpc/health' \
  -H 'content-type: application/json' \
  --data '{"method":"GET","path":"/health"}'
```

This is ordinary request/response traffic. It is not event delivery, topic publication, or a
durable command queue.

For installed execution, use the [Filtering local object data for a consumer Process Adapter workflow](../examples/local-object-filter-to-consumer.md#install-and-connect-the-deliverable-with-the-process-adapter), then refer to the [canonical installed Process Adapter example baseline](setup-and-run.md#installed-process-adapter-example-baseline). Maintainers may use `npm run test:sequence-appcontext` as optional local AppContext evidence; it does not replace the installed workflow or prove adapter visibility and consumer durability.
