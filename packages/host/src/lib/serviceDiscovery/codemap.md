# packages/host/src/lib/serviceDiscovery/

## Responsibility

Topic-based pub/sub service discovery for the Host node. Manages topic lifecycle (create, delete, route), content-type validation, stream pipelining, and Manager topic info synchronization.

## Modules

### `sd-adapter.ts` — `ServiceDiscovery` class (186 lines)

Central service discovery facade. Key responsibilities:
- **Topic CRUD**: `createTopicIfNotExist()`, `deleteTopic()`, `getTopic()`, `getTopics()`.
- **Stream routing**: `getData()` returns a topic stream, `routeTopicToStream()` pipes a topic to a writable target, `routeStreamToTopic()` pipes a readable source into a topic.
- **CPM integration**: `setConnector()` wires an optional `CPMConnector` for Manager integration. `update()` sends topic state changes (add/remove) to the Manager via `cpmConnector.sendTopicInfo()`.
- Topics are stored in a `TopicsMap` controller. Each topic is represented by a `Topic` instance (a `Transform` stream).
- Host identity: `hostName` is used to set the `StreamOrigin` on newly created topics (`{ id: hostName, type: "hub" }`).

### `topicRouter.ts` — `TopicRouter` class (180 lines)

REST API handler for topic endpoints, registered on the host's `APIExpose` surface:
- `GET /topics` — lists all topics.
- `POST /topics` — creates a topic with body `{ id, content-type }`. Validates content-type and topic ID format.
- `DELETE /topics/:topic` — removes a topic by ID.
- `DOWNSTREAM /topic/:topic` — accepts incoming data streams to a topic. Supports an optional `cpm` header to differentiate local vs. CPM-originated streams.
- `UPSTREAM /topic/:topic` — provides a readable topic stream to consumers.

All handlers validate content-type against the `isContentType()` allowlist and topic IDs against `TopicId.validate()`.

### `topic.ts` — `Topic` class (160 lines)

Core topic stream implementation extending `Transform`. Each `Topic`:
- Has an `id` (`TopicId`), `contentType`, `origin` (`StreamOrigin`), and `state` (`TopicState`).
- Supports `acceptPipe(Readable)` for queueing incoming data sources; pipes are consumed sequentially.
- Has flow control via custom `_transform()`, `resume()`, `pause()`, and `destroy()` that update stream state.
- Does NOT support `end()` — topics are long-lived and must be explicitly deleted.
- Has an `xndjson` exception handler: if content-type is `application/x-ndjson`, automatically appends a trailing newline if the last chunk lacks one.

### `topicsController.ts` — `TopicsMap` class (37 lines)

Internal `Map<string, Topic>` wrapper. Provides `set`, `get`, `has`, `delete`, and a `topics` getter that returns serialized topic summaries (`id`, `contentType`, `state`). The `delete` method also calls `topic.unpipe()` to clean up stream connections.

### `topicId.ts` — `TopicId` class (19 lines)

Thin value object wrapping a topic name string with validation. `TopicId.validate()` checks the name matches `/^[A-Za-z0-9_.+-]+$/`.

### `contentType.ts` — `isContentType()` (10 lines)

Type guard that validates a string is one of the allowed content types: `text/x-ndjson`, `application/x-ndjson`, `text/plain`, `application/octet-stream`.

## Integration Points

- `ServiceDiscovery` is consumed by the `Host` class and wired to the API expose surface via `TopicRouter`.
- `ServiceDiscovery.setConnector()` integrates with `CPMConnector` (in `../cpm-connector.ts`) for Manager topic synchronization.
- Content types and topic IDs are validated against types from `@scramjet/types`.
- Stream states reference `@scramjet/symbols` (`ReadableState`, `WritableState`, `WorkState`).
