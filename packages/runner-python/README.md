# @scramjet/runner-python

Python runtime wrapper for executing Scramjet Transform Sequences through `packages/runner`. This package implements the Python runtime contract — sequence loading, input/output stream processing, AppContext lifecycle, and host-channel communication.

## Entrypoint contract

Python sequences export a `main()` or `run()` callable. `main` is the primary entrypoint; `run` is a transitional fallback for existing sequences.

```python
async def main(context, input_stream, *args):
    ...
```

**Precedence:**

| Module has | Loader behavior |
|------------|----------------|
| `main` only | `main` is used as entrypoint |
| `run` only | `run` is used as transitional fallback |
| Both `main` and `run` | `main` takes precedence |
| `main` exists but is not callable | `SequenceLoadError` raised (even if `run` is available) |
| Neither `main` nor `run` callable | `SequenceLoadError` raised |

The loaded callable is exposed as `SequenceModule.run` for internal consistency, regardless of which name was originally exported. `SequenceModule.entrypoint_name` reflects the actual source name (`"main"` or `"run"`).

Function signature:
- `context` — [`AppContext`](#appcontext-api) instance with Node-style snake_case lifecycle API.
- `input_stream` — async iterable. The yielded item type depends on the effective content-type of the input channel: `str` for `text/plain`, `bytes` for `application/octet-stream`, parsed JSON values for `application/json` and `application/x-ndjson`. See [Input content types](#input-content-types).
- `*args` — optional positional arguments passed by the caller.

## Result shapes

The sequence function can return:

| Shape | Behavior |
|-------|----------|
| `None` | No output emitted; sequence completes normally. |
| `str` | Encoded as UTF-8 bytes and forwarded to the OUT channel. |
| `bytes` | Forwarded directly to the OUT channel. |
| JSON-serializable value (dict, list, number, bool) | Serialized as compact JSON and forwarded to the OUT channel. |
| Sync iterable (`Iterable`) | Each item resolved and forwarded; items follow the same serialization rules. |
| Async iterable (`AsyncIterable`) | Each item awaited and forwarded; items follow the same serialization rules. |
| Async generator | Same as async iterable; individual yields are forwarded. |
| Awaitable | Awaited, then the resolved value is forwarded following the same rules. |

Result normalization is handled by `resolve_sequence_result`/`as_output_stream` in `runner_python.utils`.

## Input content types

Input data is parsed from the host-channel stream according to the effective content-type (set via metadata or default):

| Content-type | Parsing behavior |
|---|---|
| `text/plain` (default) | Lines read as UTF-8 decoded strings; trailing `\n` preserved for backward compatibility with `scramjet.streams.Stream` sequences. |
| `application/octet-stream` | Raw binary chunk reads with no encoding conversion. |
| `application/json` | Full-buffer JSON parse; single value yielded. |
| `application/x-ndjson` | Streaming line-by-line JSON parse; blank lines skipped; malformed lines raise `ValueError`. `text/x-ndjson` accepted as alias. |

Content-type detection: the HTTP-like header block at the start of the host input stream is parsed for a `content-type` header. If absent, the runtime falls back to the content-type declared in the sequence metadata.

## Canonical metadata

Sequences declare topic and content-type metadata via module-level `requires` and `provides` dict attributes:

```python
"""my_sequence.py"""

requires = {"topic": "in-topic", "content_type": "application/x-ndjson"}
provides = {"topic": "out-topic", "content_type": "application/json"}

async def main(context, input_stream):
    ...
```

The runtime reads `requires` and `provides` from the sequence module via `getattr`. When a sequence result has legacy `.requires` / `.provides` attributes (from `scramjet.streams.Stream`), those take precedence over the module-level declarations. For new sequences, module-level attributes are the primary metadata mechanism; returned values from the entrypoint function are output data, not metadata.

| Key | Purpose | Precedence |
|-----|---------|------------|
| `requires.topic` | Input topic name | Overrides camelCase legacy key; empty string means no topic. |
| `requires.content_type` | Expected input content-type | Overrides camelCase `requires.contentType`. |
| `provides.topic` | Output topic name | Overrides camelCase legacy key; empty string means no topic. |
| `provides.content_type` | Advertised output content-type | Overrides camelCase `provides.contentType`. |

When both snake_case and legacy camelCase keys are present, snake_case takes precedence.

## AppContext API

The `context` object passed to the sequence function provides a Node-style lifecycle API with snake_case method names. All methods return the context instance for chaining where safe.

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `config` | `dict` | Application configuration from boot config (`AppConfig`). |
| `instance_id` | `str \| None` | Current instance identifier from boot config. |
| `logger` | `logging.Logger` | Structured logger wired to the runner's JSON log handler. |
| `api` | `Any \| None` | ASGI app exposure surface; `None` unless ASGI app attached. |
| `hub` | `Any \| None` | Legacy v1 Hub API client (`None` if verser2 not configured). |
| `initial_state` | `Any` | Initial state from boot config, if any. |
| `local_storage` | `None` | **Deferred**: always `None`; Python runtime protocol does not support BPMux/localStorage. |

### Lifecycle methods

| Method | Purpose |
|--------|---------|
| `add_stop_handler(fn)` | Register a stop handler called on STOP control code. Chainable. |
| `add_kill_handler(fn)` | Register a kill handler called before hard-kill signal. Chainable. |
| `add_monitoring_handler(fn)` | Register a health-check callback. Return value merged into monitoring frames. Chainable. |
| `set_health_check(fn)` | Legacy alias for `add_monitoring_handler`. Chainable. |
| `keep_alive(milliseconds=0)` | Postpone shutdown timeout. `milliseconds` keyword takes precedence over legacy positional `timeout`. Chainable. |
| `end()` | Signal normal completion. Sets internal state marker. Chainable. |
| `destroy(error=None)` | Signal fatal error with optional exception. Sets internal state marker. Chainable. |

**Note:** `end()` and `destroy()` set internal state markers but do not terminate the sequence process directly. Runtime lifecycle termination is driven by STOP/KILL control codes through `perform_shutdown` and `HardKillSignal`. Sequence code can call these safely for state tracking.

### Monitoring

Monitoring handlers compose into periodic heartbeat frames:

- Handlers are called in registration order.
- `True`/`False` return values are wrapped as `{"healthy": bool}`.
- `dict` return values are shallow-merged.
- When no handlers are registered, heartbeat emits `{"healthy": True}`.

### Events

| Method | Purpose |
|--------|---------|
| `on(event_name, handler)` | Subscribe to a named instance event. |
| `emit(event_name, message=None)` | Emit a host-scoped event to the STH host. |
| `emit_to_space(event_name, message=None)` | Emit a space-scoped event. **Local-only**: maps to same local event emitter as `emit`; no space protocol distinction exists in the current Python runtime. |

### State persistence

| Method | Purpose |
|--------|---------|
| `describe(definition)` | Record a sequence state definition (opaque dict). |
| `save(state)` | Record a saved state snapshot (opaque dict). |

## Legacy unsupported boundary

Best-effort compatibility for old Python sequences is isolated in `runner_python.legacy`:

- Legacy camelCase metadata keys (`requires`, `provides`, `contentType`) are parsed as fallbacks when no canonical snake_case key is present.
- Stream-like result attributes (`result.provides`, `result.requires`, `result.content_type`) are accepted but deprecated.
- Module-global old framework APIs (e.g., `scramjet.streams.Stream`, global health/stop helpers) are **not** recreated. Sequences using those APIs should migrate to the new `main(context, input_stream)` contract.

The legacy boundary is unsupported and intentionally narrow. Sequences relying on old `scramjet-framework-py` patterns beyond the attribute-level fallbacks may not work correctly.

## See also

- [Writing sequences](../../sequences/writing-sequences.md) for language-agnostic sequence development guide.
- [Sequence lifecycle](../../sequences/sequence-lifecycle.md) for stream and content-type details.
- [Sequence monitoring](../../sequences/sequence-monitoring.md) for heartbeat and health check protocol.
- [Sequence topics](../../sequences/sequence-topics.md) for topic metadata conventions.

## Install

```bash
npm install @scramjet/runner-python
```

## Import

```typescript
import { /* ... */ } from "@scramjet/runner-python";
```

## Documentation

See the [package docs](../../docs-source/README.md) for full documentation.

---

<!-- Generated by scripts/docs.js from docs-source/readmes/packages/runner-python.md. Do not edit this file directly. -->