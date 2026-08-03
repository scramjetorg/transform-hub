from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator, Protocol, Union


class _AsyncByteReader(Protocol):
    async def read(self, n: int = -1) -> bytes: ...


async def read_http_headers(reader: asyncio.StreamReader) -> dict[str, str]:
    """Read HTTP-like headers from *reader*, consuming up to ``\r\n\r\n``.

    Returns a ``{name: value}`` dict with lower-cased keys.  Any bytes
    after the blank-line terminator remain in the reader's internal buffer
    for subsequent reads.

    If EOF is reached before the blank-line terminator is found, returns an
    empty dict without raising (no hang).
    """
    headers: dict[str, str] = {}
    while True:
        line = await reader.readline()
        if not line:
            # EOF before headers complete.
            return {}
        line = line.rstrip(b"\r\n")
        if not line:
            # Blank line -> end of headers.
            return headers
        if b":" in line:
            name, _, value = line.partition(b":")
            headers[name.strip().decode("utf-8").lower()] = (
                value.strip().decode("utf-8")
            )


_CHUNK_SIZE = 4096


def is_ndjson_content_type(content_type: str) -> bool:
    return content_type.lower().endswith("x-ndjson")


async def make_input_stream(
    reader: _AsyncByteReader,
    content_type: str = "text/plain",
) -> AsyncIterator[Union[str, bytes, Any]]:
    """Decode the input byte stream according to ``content_type``.

    - ``text/plain``: yields ``str`` values split on ``\\n`` and decoded as UTF-8.
      Bytes are buffered across reads so multi-byte UTF-8 sequences that
      straddle chunk boundaries are decoded correctly.
    - ``application/octet-stream``: yields raw ``bytes`` chunks, exactly as
      received. No line splitting, no decoding.
    - ``application/json``: buffers all input, parses as JSON, yields the
      parsed value once.  JSON documents are whole-value by nature so full
      buffering is required.
    - ``application/x-ndjson``: reads line-by-line, parsing each non-empty
      line as JSON.  Blank lines are skipped.  Malformed lines raise
      ``ValueError`` with a useful message.  Streaming/backpressure is
      preserved — no full buffering.

    Any other content type raises ``ValueError``.
    """
    if content_type == "application/octet-stream":
        async for chunk in _iter_raw(reader):
            yield chunk
        return

    if content_type in ("text/plain",):
        async for line in _iter_text_lines(reader):
            yield line
        return

    if content_type == "application/json":
        async for value in _iter_json(reader):
            yield value
        return

    if is_ndjson_content_type(content_type):
        async for value in _iter_ndjson_lines(reader):
            yield value
        return

    raise ValueError(f"unsupported content_type: {content_type!r}")


async def _iter_raw(reader: _AsyncByteReader) -> AsyncIterator[bytes]:
    while True:
        chunk = await reader.read(_CHUNK_SIZE)
        if not chunk:
            return
        yield chunk


async def _iter_text_lines(reader: _AsyncByteReader) -> AsyncIterator[str]:
    buffer = bytearray()
    while True:
        chunk = await reader.read(_CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)
        while True:
            newline_index = buffer.find(b"\n")
            if newline_index == -1:
                break
            line_bytes = bytes(buffer[:newline_index])
            del buffer[: newline_index + 1]
            yield line_bytes.decode("utf-8")

    if buffer:
        yield bytes(buffer).decode("utf-8")


async def _iter_json(reader: _AsyncByteReader) -> AsyncIterator[Any]:
    """Read all bytes, parse as JSON, yield the parsed value once.

    JSON documents are whole-value by nature, so full buffering is required.
    This is intentional and documented; it does not affect text/binary
    streaming behavior.
    """
    buffer = bytearray()
    while True:
        chunk = await reader.read(_CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)

    if buffer:
        yield json.loads(bytes(buffer).decode("utf-8"))


async def _iter_ndjson_lines(reader: _AsyncByteReader) -> AsyncIterator[Any]:
    """Read NDJSON (newline-delimited JSON) line by line.

    Each non-empty line is parsed as JSON and yielded.  Blank lines are
    skipped.  Malformed lines raise ``ValueError`` with a useful message.
    Streaming/backpressure is preserved — no full buffering.
    """
    buffer = bytearray()
    while True:
        chunk = await reader.read(_CHUNK_SIZE)
        if not chunk:
            break
        buffer.extend(chunk)
        while True:
            newline_index = buffer.find(b"\n")
            if newline_index == -1:
                break
            line_bytes = bytes(buffer[:newline_index])
            del buffer[: newline_index + 1]
            line = line_bytes.decode("utf-8").strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"malformed NDJSON line: {exc}"
                ) from exc

    # Trailing data without a newline.
    if buffer:
        line = bytes(buffer).decode("utf-8").strip()
        if line:
            try:
                yield json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f"malformed NDJSON line: {exc}"
                ) from exc
