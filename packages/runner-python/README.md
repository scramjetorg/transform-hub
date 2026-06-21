# @scramjet/runner-python

Python runtime wrapper for `packages/runner`. Do not invoke directly -
the outer runner (`packages/runner`) spawns this via
`python3 -m runner_python <bootConfigPath>`.

## Sequence Entrypoint Contract (Phase 1)

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
| `application/x-ndjson`          | Planned for Phase 3; currently rejected by the input iterator.  |
| Other                           | Raises `ValueError` at iteration time.                          |

### Canonical metadata: `requires` and `provides`

Phase 1 introduces canonical **snake_case** keys for topic metadata in
module-level `requires` and `provides` dicts:

```python
# Canonical (Phase 1) - preferred
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

### Legacy / unsupported APIs

The following legacy APIs are **not** part of the Phase 1 contract and should
not be used in new sequences:

- `scramjet.streams.Stream` globals and scramjet-framework-py module-level helpers for new code. The runtime still uses the installed stream helper internally during this transition.
- `set_health_check` / `set_stop_handler` as module-level globals (use
  `context.set_stop_handler()` instead — the new AppContext surface is
  documented in Phase 2).
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
