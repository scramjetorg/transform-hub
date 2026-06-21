# @scramjet/runner-python

Python runtime wrapper for `packages/runner`. Do not invoke directly -
the outer runner (`packages/runner`) spawns this via
`python3 -m runner_python <bootConfigPath>`.

## Sequence Entrypoint Contract

### Primary entrypoint: `main(context, input_stream, *args)`

The sequence module must expose a callable `main` as its primary entrypoint:

```python
def main(context, input_stream, *args) -> Any:
    ...
```

or as an async coroutine:

```python
async def main(context, input_stream, *args) -> Any:
    ...
```

**Parameters:**

| Parameter      | Type           | Description                                          |
|----------------|----------------|------------------------------------------------------|
| `context`      | `AppContext`   | Runtime context (config, logger, events, lifecycle). |
| `input_stream` | `Stream`       | Input data stream (decoded per `requires` metadata). |
| `*args`        | `tuple`        | Additional arguments from the hub configuration.     |

### Transitional fallback: `run(context, input_stream, *args)`

`run` is accepted as a transitional fallback when `main` is not present. New
sequences should use `main`; `run` will remain supported during a deprecation
window.

### Precedence rules

| `main` exists | `main` callable | `run` exists | `run` callable | Result                                  |
|---------------|-----------------|--------------|----------------|-----------------------------------------|
| No            | —               | Yes          | Yes            | `run` used (fallback, `entrypoint_name` = `"run"`) |
| Yes           | No              | Yes          | Yes            | **Error** — non-callable `main` is never silently ignored |
| Yes           | Yes             | Yes          | Yes/No         | `main` used (precedence, `entrypoint_name` = `"main"`) |
| Yes           | Yes             | No           | —              | `main` used                              |
| No            | —               | No           | —              | `SequenceLoadError`                      |
| No            | —               | Yes          | No             | `SequenceLoadError`                      |

### Result shapes (supported)

The entrypoint may return any of the following. The runtime normalises the
result into output frames:

| Return shape          | Behaviour                                                     |
|-----------------------|---------------------------------------------------------------|
| `None`                | No output (sequence is a sink).                               |
| `str`                 | Encoded as UTF-8 and forwarded.                               |
| `bytes`               | Forwarded as raw binary.                                      |
| JSON-serializable     | Serialised with `json.dumps` and forwarded.                   |
| Sync iterable         | Iterated item by item (each item normalised per above).       |
| Async iterable        | Iterated item by item with backpressure.                      |
| Awaitable             | Resolved before normalisation (unwraps one level).            |

### Input stream expectations

The input stream is decoded according to the `requires` metadata on the module
or the upstream content-type header:

| Content type                    | Behaviour                                                       |
|---------------------------------|-----------------------------------------------------------------|
| `text/plain` (default)          | UTF-8 decoded, split on `\n`. Yields `str` lines.               |
| `application/octet-stream`      | Raw bytes, no decoding or line splitting. Yields `bytes` chunks.|
| `application/json`              | Buffers all input, parses as JSON, yields the parsed value once.|
| `application/x-ndjson`, `text/x-ndjson` | Line-by-line JSON parsing, streaming with backpressure. Blank |
|                                 | lines are skipped. Malformed lines raise ``ValueError``.        |
| Other                           | Raises ``ValueError`` at iteration time.                        |

Runtime input from the host is expected to include the HTTP-like header block
terminator (`\r\n\r\n`). Raw no-header bodies are not supported by the runtime
wrapper input-framing path.

Output content-type metadata affects binary and NDJSON framing. Plain text
output chunks are forwarded exactly by the runtime path for backward-compatible
sequence behavior.

### Canonical metadata: `requires` and `provides`

Use canonical **snake_case** keys for topic metadata in module-level
`requires` and `provides` dicts:

```python
# Canonical - preferred
requires = {"topic": "my-input", "content_type": "application/x-ndjson"}
provides = {"topic": "my-output", "content_type": "application/octet-stream"}
```

Legacy camelCase keys remain supported:

```python
# Legacy - still accepted
requires = {"requires": "my-input", "contentType": "application/x-ndjson"}
provides = {"provides": "my-output", "contentType": "application/octet-stream"}
```

When both conventions are present in the same dict, snake_case takes
precedence.

The `topic` value maps to the monitoring PANG payload's `provides`/`requires`
field. The `content_type` value determines input/output content-type handling.

## AppContext

The `context` argument is a Python `AppContext` with Node-style API names adapted
to snake_case.

### Public fields

| Field | Behaviour |
|-------|-----------|
| `context.config` | Mutable application configuration. Host `SET` control messages replace/update this dict. |
| `context.instance_id` | Current instance id from the boot config. |
| `context.logger` | Runtime logger forwarded to the host log stream. Host `SET` `logLevel` updates this logger. |
| `context.hub` / `context.api` | Verser2-backed hub client and ASGI exposure handle when configured; otherwise `None`. |
| `context.initial_state` | Present for parity; currently defaults to `None`. |
| `context.local_storage` | Present for parity; currently `None` because Python local storage is not wired. |

### Lifecycle and monitoring

Use `add_stop_handler`, `add_kill_handler`, and `add_monitoring_handler` for new
code:

```python
async def main(context, input_stream):
    context.add_monitoring_handler(lambda: {"healthy": True})

    async def on_stop(payload):
        await context.keep_alive(milliseconds=500)

    context.add_stop_handler(on_stop)
```

- `keep_alive(milliseconds=...)` extends the STOP shutdown window while STOP
  handlers are running. Positional `keep_alive(timeout)` remains accepted for
  transitional compatibility.
- `add_monitoring_handler(fn)` contributes heartbeat payload fields. Boolean
  results become `{"healthy": bool}` and dict results are shallow-merged.
- `set_health_check(fn)` and `set_stop_handler(fn)` remain aliases for
  compatibility, but new code should prefer `add_monitoring_handler` and
  `add_stop_handler`.
- `end()` and `destroy(error=None)` mark local context state only; they are safe
  to call but do not currently terminate the instance by themselves.

### Events

`context.on(event_name, handler)` registers local event handlers. `context.emit`
emits an instance event on the monitoring channel, and `context.emit_to_space`
emits the same event payload with `scope: "space"`. A distinct Python space
transport is not implemented yet.

### ASGI exposure

When the sequence is started with an expose path and verser2 runtime config,
`context.api` is a `PythonSequenceApiExposure`. Attach an ASGI 3 app from
`main()`:

```python
async def app(scope, receive, send):
    await send({"type": "http.response.start", "status": 200, "headers": []})
    await send({"type": "http.response.body", "body": b"ok"})

async def main(context, input_stream):
    if context.api:
        context.api.attach(app)
```

The runtime binds the attached app to the verser2 Guest after sequence startup.

### Legacy / unsupported APIs

The following legacy APIs are **not** part of the primary sequence contract and
should not be used in new sequences:

- `scramjet.streams.Stream` globals and scramjet-framework-py module-level helpers for new code. The runtime still uses the installed stream helper internally during this transition.
- `set_health_check` / `set_stop_handler` as module-level globals (use
  context lifecycle methods instead).
- Legacy metadata shapes using only `provides`/`requires` as strings (still
  best-effort compatible but not the primary contract).

## Development

```bash
# Install dependencies
npm install
npm run install:deps

# Run tests
npm test

# Build
npm run build
```

See `packages/runner` for the outer runner that spawns this runtime.
