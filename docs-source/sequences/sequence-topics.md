---
id: sequences-topics
slug: /sequences/topics
title: Topics, data routing, and sequence metadata
---

# Topics, data routing, and sequence metadata

## Topics

Topics are named data channels that sequences can publish to or subscribe from independently of the main input/output stream. They enable decoupled data flows between sequences and external systems.

### Creating a topic

Topics are created through the Hub API or programmatically:

```
POST /api/v1/topic
Content-Type: application/json

{
  "name": "sensor-readings",
  "contentType": "application/x-ndjson"
}
```

### Publishing to a topic

Sequences can send data to a topic using the `AppContext` hub client:

```typescript
await this.hub.sendTopic("sensor-readings", {
  sensor: "temperature",
  value: 22.5,
  unit: "celsius",
});
```

In Python:

```python
await context.hub.send_topic("sensor-readings", {
    "sensor": "temperature",
    "value": 22.5,
    "unit": "celsius",
})
```

### Subscribing to a topic

A sequence can receive topic data as its input by specifying the topic name when starting the sequence instance:

```
POST /api/v1/sequence/:id/start
Content-Type: application/json

{
  "topic": "sensor-readings"
}
```

When started with a topic subscription, the sequence input stream contains the topic messages.

### Topic metadata

Topics have associated metadata:

- **`name`**: Unique topic identifier within the Hub scope
- **`contentType`**: MIME type for the topic data
- **`created`**: ISO timestamp of creation

## Sequence metadata

Each sequence package includes metadata that the platform uses for routing, runtime selection, and configuration. The metadata lives in the sequence's `package.json`.

### Required fields

```json
{
  "name": "@my-org/my-sequence",
  "version": "1.0.0",
  "main": "dist/index.js",
  "engines": {
    "node": ">=16"
  }
}
```

- **`main`**: Entry point for the sequence (JS/TS/Python file)
- **`engines`**: Declares required runtimes; at least one engine key must match a supported runtime

### Optional fields

```json
{
  "scramjet": {
    "sequence": {
      "type": "python",
      "entrypoint": "main",
      "args": ["--flag"],
      "config": {
        "inputContentType": "application/x-ndjson",
        "outputContentType": "application/x-ndjson"
      }
    }
  }
}
```

### Auto-detected metadata

The platform infers runtime kind from engine keys using this priority (defined in `selectRuntimeKind()` from `@scramjet/symbols`):

1. `engines.node` → runtime `node`
2. `engines.bun` → runtime `bun`
3. `engines.python3` → runtime `python3`

If multiple engines are declared, the first matching supported runtime wins.

### Function introspection

The runner auto-detects sequence function metadata:

- Number of functions in the exported array
- Function parameter names
- Return type hints (where available)

This information is sent to the host via `DESCRIBE` frames and is available through the API.

## Data routing

Data flows through sequences along these paths:

```
External source
      │
      ▼
  [Topic] ──▶ Sequence input stream
                  │
                  ▼
            [AppContext]
                  │
                  ▼
            Functions (chain)
                  │
                  ▼
            Output stream ──▶ Host / API consumer
```

### Input sources

A sequence input can originate from:

1. An **API call** — data sent when the instance is started
2. A **topic subscription** — data routed from a named topic
3. A **preceding sequence** — output of one sequence chained to another
4. **STDIN** — in process-adapter mode

### Output destinations

Sequence output can go to:

1. **API response** — retrieved by the caller
2. **Topic publication** — explicitly sent via `hub.sendTopic()`
3. **Another sequence** — via topic subscription chains
