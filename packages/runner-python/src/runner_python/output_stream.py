"""Forward the sequence's output stream to the host OUT channel.

Encodes each item according to the sequence's declared ``contentType``:

- ``text/plain``: items must be ``str``; encoded as UTF-8 + ``\n``.
- ``application/x-ndjson``: items are serialized with ``json.dumps`` using
  ``separators=(",", ":")`` for byte-for-byte parity with Node's
  ``JSON.stringify`` + ``\n``.
- otherwise: raw passthrough (``bytes`` as-is; ``str`` encoded as UTF-8;
  anything else JSON-serialized without a trailing newline).

Before the first output chunk is written, a single ``PANG`` (3012) monitoring
frame is emitted carrying ``{provides, requires, contentType}``.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator

from runner_python.input_stream import is_ndjson_content_type

logger = logging.getLogger(__name__)

PANG = 3012


async def forward_output_stream(
    seq_iter: AsyncIterator[Any],
    output_writer: asyncio.StreamWriter,
    monitoring_writer: Any,  # MonitoringWriter-compatible: .write_frame(code, payload)
    provides: str = "",
    requires: str = "",
    content_type: str = "",
) -> None:
    """Forward sequence output to the host OUT channel.

    Emits a PANG monitoring frame describing the stream's metadata before any
    output chunk is written, then iterates over ``seq_iter`` and writes each
    item encoded for ``content_type``.
    """
    monitoring_writer.write_frame(
        PANG,
        {
            "provides": provides,
            "requires": requires,
            "contentType": content_type,
        },
    )

    async for item in seq_iter:
        if content_type == "text/plain":
            if not isinstance(item, str):
                raise TypeError(
                    f"Expected str for text/plain, got {type(item).__name__}"
                )
            output_writer.write(item.encode("utf-8") + b"\n")
        elif is_ndjson_content_type(content_type):
            line = json.dumps(item, separators=(",", ":"), ensure_ascii=False)
            output_writer.write(line.encode("utf-8") + b"\n")
        else:
            if isinstance(item, bytes):
                data = item
            elif isinstance(item, str):
                data = item.encode("utf-8")
            else:
                data = json.dumps(
                    item, separators=(",", ":"), ensure_ascii=False
                ).encode("utf-8")
            output_writer.write(data)

        await output_writer.drain()
