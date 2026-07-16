---
id: sequences-writing
slug: /sequences/writing
title: Writing sequences for Transform Hub
---

# Writing sequences for Transform Hub

A **sequence** is a deployable unit of work that Scramjet Transform Hub supervises. Sequences can be written in JavaScript (Node.js), TypeScript (Node.js), Bun, or Python. This guide covers the supported application shapes, the canonical `@scramjet/sequence-types` author API, and the contracts required by each runtime.

## Sequence basics

A sequence is an exported function (or array of functions) from a module. The canonical `@scramjet/sequence-types` package exposes the sequence-facing `SequenceAppContext` and application types for readable, writable, transforming, and inert applications. Each application receives the **SequenceAppContext** as `this`, an **input stream** when applicable, and optional **arguments** from the caller.

The named author-facing types are `SequenceApplication`, `SequenceApplicationFunction`, `SequenceReadableApp`, `SequenceWritableApp`, `SequenceTransformApp`, and `SequenceInertApp`. There is no `@scramjet/sequence` package; use `@scramjet/sequence-types` for these contracts.

```
Input → function1 → function2 → … → functionN → Output
```

## Supported runtimes

| Runtime | Identifier | Engine key in package.json |
|---------|-----------|---------------------------|
| Node.js 18+ | `node` | `engines.node` |
| Bun 1.x | `bun` | `engines.bun` |
| Python 3.9+ | `python3` | `engines.python3` |

The platform auto-detects the runtime by inspecting `package.json` engine keys via `selectRuntimeKind()` from `@scramjet/symbols`. Resolution priority is `node` → `bun` → `python3`.

### Node.js / TypeScript sequences

Node.js sequences are the most common. Export a function (or an array of functions) from the module entry point. TypeScript is fully supported — the runner compiles or loads via `ts-node` in development mode.

**Minimal Node.js sequence:**

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

export default async function (this: SequenceAppContext, input: Readable) {
  let count = 0;
  for await (const chunk of input) {
    this.logger.info("received", chunk.toString());
    count++;
  }
  return { processed: count };
}
```

**Pipeline (multi-function sequence):**

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

export default [
  async function (this: SequenceAppContext, input: Readable) {
    // Transform input, return a stream or value
    return input.pipe(new Transform({ objectMode: true, transform(chunk, _, cb) { cb(null, chunk.toString().toUpperCase()); } }));
  },
  async function (this: SequenceAppContext, input: Readable) {
    const lines = [];
    for await (const line of input) lines.push(line);
    return lines;
  },
];
```

### Bun sequences

Bun sequences use the canonical `SequenceAppContext` surface from `@scramjet/sequence-types`. When host channels are required (IN, OUT, LOG), `runner-bun` delegates to the Node runtime. In headless mode (no `instancesServerPort` configured), Bun runs the sequence directly.

**Bun sequence:**

```typescript
import type { SequenceAppContext } from "@scramjet/sequence-types";

// bun-sequence.ts
export default async function (this: SequenceAppContext, input: Readable) {
  for await (const chunk of input) {
    // direct Bun API available here
  }
  return { status: "done" };
}
```

Package the sequence with `"engines": { "bun": ">=1.0" }` in `package.json`.

### Python sequences

Python sequences export a `main()` or `run()` function. The function signature is:

```python
def main(context, input_stream, *args):
```

The `context` object mirrors the `AppContext` interface. The `input_stream` is an async iterable of bytes.

**Python sequence:**

```python
"""my_sequence.py"""
import json

def main(context, input_stream):
    context.logger.info("sequence started")
    total = 0
    async for chunk in input_stream:
        data = json.loads(chunk.decode())
        total += data.get("value", 0)
    context.logger.info(f"total: {total}")
    return {"total": total}
```

Package the sequence with `"engines": { "python3": ">=3.9" }` in `package.json` and set `"main"` to the Python file path.

## SequenceAppContext API

The `SequenceAppContext` interface (defined in `@scramjet/sequence-types`) is the primary interaction surface for sequence authors:

| Method / Property | Purpose |
|-------------------|---------|
| `this.logger` | Structured logger (`IObjectLogger`) |
| `this.config` | Application configuration (partial of `<AppConfigType>`) |
| `this.addStopHandler(fn)` | Register a graceful-stop handler |
| `this.addKillHandler(fn)` | Register a kill handler |
| `this.addMonitoringHandler(fn)` | Register a health-check handler |
| `this.keepAlive(ms?)` | Postpone shutdown timeout |
| `this.end()` | Signal normal completion |
| `this.destroy(error?)` | Signal fatal error |
| `this.emit(event, message)` | Send an event to the host |
| `this.hub` | Hub API client (`HostClient`) |
| `this.hubClient()` | Canonical v2 Hub API fluent client |
| `this.space` | Manager / Space API client |
| `this.spaceClient()` | Canonical v2 Space API fluent client routed through the connected Manager/space proxy |
| `this.instanceId` | Current instance identifier |
| `this.api` | Local API expose surface |
| `this.localStorage` | Key-value local storage |
| `this.exitTimeout` | Milliseconds before force exit (default 10000) |

### Hub and Space API access

Existing sequences can keep using `this.hub` and `this.space`; those properties remain legacy v1-compatible clients for backwards compatibility. New sequence code should prefer `this.hubClient()` and `this.spaceClient()`, which return v2 fluent clients backed by `@scramjet/rest-api2`.

```typescript
import type { AppConfig, SequenceAppContext } from "@scramjet/sequence-types";
import type { HubClient, SpaceClient } from "@scramjet/rest-api2";

type V2Context = SequenceAppContext<AppConfig, unknown, HubClient, SpaceClient>;

export default async function (this: V2Context) {
  const hubHealth = await this.hubClient().health.get();
  const spaceHubs = await this.spaceClient().hubs.get();

  this.logger.info("hub health", hubHealth.body);
  this.logger.info("space hubs", spaceHubs.body.items);
}
```

`hubClient()` is scoped to the current Hub v2 API. `spaceClient()` is scoped to the Manager/Space v2 API and is routed through the Hub's space proxy, so Hub-level and Space-level operations remain separate.

## Input and output

Sequences receive input through the first argument after the context. The input is a `Readable` stream. Sequences can return:

- A **primitive** (string, number, boolean, null) — serialized as NDJSON
- A **stream** — piped through the output channel
- An **object** — serialized as NDJSON
- `void` / `undefined` — no output

See [Sequence lifecycle](sequence-lifecycle.md) for stream and content-type details.
