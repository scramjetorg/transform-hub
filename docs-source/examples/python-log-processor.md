---
id: examples-python-log-processor
slug: /examples/python-log-processor
title: Python log processor sequence
---

# Python log processor sequence

This example shows a Python sequence that consumes structured log lines, filters by severity, and produces summary statistics. It demonstrates the Python runtime API and topic-based output.

```python
"""log_processor.py"""
import json
from datetime import datetime

SEVERITY_ORDER = {"DEBUG": 0, "INFO": 1, "WARN": 2, "ERROR": 3, "FATAL": 4}


def get_severity_value(severity: str) -> int:
    return SEVERITY_ORDER.get(severity.upper(), -1)


async def main(context, input_stream):
    context.logger.info("log processor started")

    stats = {
        "total_lines": 0,
        "by_severity": {"DEBUG": 0, "INFO": 0, "WARN": 0, "ERROR": 0, "FATAL": 0},
        "error_samples": [],
        "min_severity": "DEBUG",
        "max_severity": "DEBUG",
    }
    min_val = float("inf")
    max_val = -1

    async for chunk in input_stream:
        try:
            entry = json.loads(chunk.decode().strip())
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            context.logger.warn("skipping malformed entry", {"error": str(e)})
            continue

        stats["total_lines"] += 1
        severity = entry.get("severity", "INFO").upper()
        stats["by_severity"][severity] += 1

        sev_val = get_severity_value(severity)
        if sev_val < min_val:
            min_val = sev_val
            stats["min_severity"] = severity
        if sev_val > max_val:
            max_val = sev_val
            stats["max_severity"] = severity

        # Collect error samples for reporting
        if severity == "ERROR" and len(stats["error_samples"]) < 5:
            stats["error_samples"].append({
                "message": entry.get("message", ""),
                "timestamp": entry.get("timestamp", datetime.utcnow().isoformat()),
            })

    context.logger.info("processing complete", {"total": stats["total_lines"]})

    # Emit summary event
    context.emit("processing-complete", stats)

    return stats
```

## Package the Python example

**package.json:**

```json
{
  "name": "@example/log-processor",
  "version": "1.0.0",
  "main": "log_processor.py",
  "engines": {
    "python3": ">=3.9"
  }
}
```

**requirements.txt:**

```
pyee>=12,<13
```

Build and pack the directory containing `log_processor.py`, `package.json`, and
`requirements.txt`. The Process Adapter requires Python `>=3.9` on the Hub host and the Python
runtime dependency (`pyee>=12,<13`) available to the deployed sequence. Install the dependency
according to the Python packaging workflow used by the target installation before packing; do not
rely on an operator's source checkout.

## Optional maintainer evidence: hub harness

```python
"""test_log_processor.py"""
import pytest
from scramjet.sequence_test import create_hub_harness
from io import BytesIO


@pytest.mark.asyncio
async def test_log_processor():
    harness = create_hub_harness()

    # Load the sequence
    from log_processor import main

    # Create mock input
    input_data = (
        b'{"severity":"INFO","message":"ok"}\n'
        b'{"severity":"ERROR","message":"fail"}\n'
    )

    # Run the sequence (adapt for async Python test)
    await main(harness.context, BytesIO(input_data))

    # Assertions
    harness.assert.called(method="POST", path="/api/v1/topic")
    # Inspect lifecycle/capture helpers exposed by the harness version in use.

    harness.close()
```

## Installed Process Adapter workflow

Use the canonical [Set up and run an installed Sequence](../sequences/setup-and-run.md) guide for
CLI installation, Hub readiness, and the package lifecycle. This example uses a loopback Hub at
`127.0.0.1:8000`, a separate `sequence-store/` directory, no source or data mount, and
`application/x-ndjson` input:

### Packaging terminal

```sh
npm install -g @scramjet/sth @scramjet/cli
# Ensure Python >=3.9 and the requirements.txt dependency are available to the runner host.
python3 -m pip install -r requirements.txt
si sequence pack . -o log-processor.tar.gz
```

### Hub terminal

```sh
mkdir -p sequence-store
sth --runtime-adapter process --hostname 127.0.0.1 --port 8000 \
  --sequences-root "$PWD/sequence-store"
```

### Readiness terminal

```sh
timeout 60s sh -c '
  until curl --fail --silent http://127.0.0.1:8000/api/v1/status |
    node -e "let s=\"\"; process.stdin.on(\"data\", c => s += c).on(\"end\", () => process.exit(JSON.parse(s).ready === true ? 0 : 1))";
  do :; done
'
```

### Deploy/start terminal

```sh
si config set apiUrl http://127.0.0.1:8000
si sequence deploy ./log-processor.tar.gz
printf '%s\n' \
  '{"severity":"INFO","message":"request started"}' \
  '{"severity":"ERROR","message":"connection refused"}' \
  '{"severity":"WARN","message":"retry attempt 1"}' | \
  si instance input <instance-id>
si instance info <instance-id>
si instance stdout <instance-id>
si instance log <instance-id>
```

Success is an instance listed by `si instance list` and output containing `total_lines: 3`,
`INFO: 1`, `WARN: 1`, `ERROR: 1`, `min_severity: "INFO"`, and `max_severity: "ERROR"`; the
`processing-complete` event is also logged by the sequence. For Docker or Kubernetes, select the
corresponding adapter and provide its runner image, network, storage, and Python runtime setup;
the process workflow runs the Runner as a host child process and has no container mounts.
