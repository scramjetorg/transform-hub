---
id: examples-python-log-processor
slug: /examples/python-log-processor
title: Python log processor sequence
---

# Python log processor sequence

Build a Python Sequence that accepts newline-delimited JSON (NDJSON) log records and emits an NDJSON summary after its input stream closes.

## Prerequisites

You need Python 3.9 or later, Node.js and npm to install the published Hub and CLI commands, and `curl` plus `node` for the readiness check. Keep the Sequence project separate from the directory where the Hub stores uploaded archives.

Create `log_processor.py` in your Sequence project:

```python
"""log_processor.py"""
from collections import Counter

requires = {"content_type": "application/x-ndjson"}
provides = {"content_type": "application/x-ndjson"}


async def main(context, input_stream):
    counts = Counter()
    total = 0

    async for record in input_stream:
        severity = str(record.get("severity", "INFO")).upper()
        counts[severity] += 1
        total += 1

    summary = {
        "total_lines": total,
        "by_severity": dict(counts),
    }
    context.logger.info("log processing complete", extra={"total": total})
    return summary
```

The Python runtime calls `main(context, input_stream)`. With `application/x-ndjson`, `input_stream` yields parsed JSON values one line at a time. The module metadata declares NDJSON for both input and output, and the returned dictionary is serialized as one NDJSON output record.

Create `package.json` beside the Python file:

```json
{
  "name": "log-processor",
  "version": "1.0.0",
  "main": "log_processor.py",
  "engines": {
    "python3": ">=3.9"
  }
}
```

Declare only `engines.python3` for this package. The Hub selects `runner-python` from that key; declaring `node` or `bun` as well would select a different runtime.

This example uses only the Python standard library. When your Sequence needs third-party packages, add a `requirements.txt` in the package root:

```text
# Example: requests>=2.32,<3
```

The Python runner installs dependencies from `requirements.txt` at startup when the file is present. Pin the runtime dependencies your Sequence needs and include the file in the archive.

## Package the Sequence

Follow the [installed Sequence setup and run guide](../sequences/setup-and-run.md) for the complete walkthrough.

### Packaging terminal

```sh
npm install -g @scramjet/sth @scramjet/cli
si sequence pack . -o log-processor.tar.gz
```

Run the command from the Sequence project directory. The archive must contain `package.json`, `log_processor.py`, and `requirements.txt` when you use dependencies.

## Start the Hub in the foreground

### Foreground Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process \
  --hostname 127.0.0.1 \
  --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

Leave this terminal running. The Process Adapter runs the Python runner as a child process on this machine, so Python 3.9 or later and any requirements needed at startup must be available to the Hub host.

## Wait for readiness

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

## Deploy and start

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./log-processor.tar.gz
```

`si sequence deploy` uploads the archive and starts an Instance. Record the returned Instance ID for the next commands.

## Send NDJSON input

### Send-input terminal

```sh
printf '%s\n' \
  '{"severity":"INFO","message":"request started"}' \
  '{"severity":"ERROR","message":"connection refused"}' \
  '{"severity":"WARN","message":"retry attempt 1"}' | \
  si instance input <instance-id> --content-type application/x-ndjson --end
```

`--end` closes the input stream so the Sequence can return its summary.

## Inspect output

### Output terminal

```sh
si instance stdout <instance-id>
```

The output is an NDJSON record with `total_lines` and `by_severity` counts.

## Local verification (optional)

Before packaging, you can check that the entry module compiles in your own project:

```sh
python3 -m py_compile log_processor.py
```

## What this demonstrates

You can package a Python runtime Sequence, deploy it to an installed Hub, send NDJSON log records to its Instance, and inspect the transformed NDJSON summary on the output stream. A successful run shows the NDJSON summary with line counts and severity breakdown.
