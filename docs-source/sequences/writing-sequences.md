---
id: sequences-writing
slug: /sequences/writing
title: Writing sequences for Transform Hub
---

# Writing sequences for Transform Hub

A **sequence** is a deployable unit of work that Scramjet Transform Hub supervises. Sequences can be written in JavaScript (Node.js), TypeScript (Node.js), Bun, or Python. This guide covers how to write sequences in each supported language and what contracts they must satisfy.

## Sequence basics

A sequence is an exported function (or array of functions) from a module. Each function receives the **AppContext** as `this`, an **input stream**, and optional **arguments** from the caller. The return value of each function feeds into the next, forming a processing pipeline.

```
Input → function1 → function2 → … → functionN → Output
```

## Supported runtimes

| Runtime | Identifier | Engine key in package.json |
|---------|-----------|---------------------------|
| Node.js 16+ | `node` | `engines.node` |
| Bun 1.x | `bun` | `engines.bun` |
| Python 3.9+ | `python3` | `engines.python3` |

The platform auto-detects the runtime by inspecting `package.json` engine keys via `selectRuntimeKind()` from `@scramjet/symbols`. Resolution priority is `node` → `bun` → `python3`.

### Node.js / TypeScript sequences

Node.js sequences are the most common. Export a function (or an array of functions) from the module entry point. TypeScript is fully supported — the runner compiles or loads via `ts-node` in development mode.

**Minimal Node.js sequence:**

```typescript
export default async function (this: AppContext, input: Readable) {
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
export default [
  async function (this: AppContext, input: Readable) {
    // Transform input, return a stream or value
    return input.pipe(new Transform({ objectMode: true, transform(chunk, _, cb) { cb(null, chunk.toString().toUpperCase()); } }));
  },
  async function (this: AppContext, input: Readable) {
    const lines = [];
    for await (const line of input) lines.push(line);
    return lines;
  },
];
```

### Bun sequences

Bun sequences use the same `@scramjet/types` `AppContext` interface. When host channels are required (IN, OUT, LOG), `runner-bun` delegates to the Node runtime. In headless mode (no `instancesServerPort` configured), Bun runs the sequence directly.

**Bun sequence:**

```typescript
// bun-sequence.ts
export default async function (this: AppContext, input: Readable) {
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

## AppContext API

The `AppContext` interface (defined in `@scramjet/types`) is the primary interaction surface for sequences:

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
| `this.space` | Manager / Space API client |
| `this.instanceId` | Current instance identifier |
| `this.api` | Local API expose surface |
| `this.localStorage` | Key-value local storage |
| `this.exitTimeout` | Milliseconds before force exit (default 10000) |

## Input and output

Sequences receive input through the first argument after the context. The input is a `Readable` stream. Sequences can return:

- A **primitive** (string, number, boolean, null) — serialized as NDJSON
- A **stream** — piped through the output channel
- An **object** — serialized as NDJSON
- `void` / `undefined` — no output

See [Sequence lifecycle](sequence-lifecycle.md) for stream and content-type details.
