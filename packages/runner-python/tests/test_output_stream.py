from __future__ import annotations

# pyright: reportMissingImports=false

import io
import json
from typing import Any, AsyncIterator

import pytest

from runner_python.output_stream import PANG, forward_output_stream


class FakeOutputWriter:
    """Mimics asyncio.StreamWriter's write/drain pair used by forward_output_stream."""

    def __init__(self) -> None:
        self.buffer = bytearray()
        self.drain_calls = 0
        self.write_order: list[int] = []  # length of buffer at each write

    def write(self, data: bytes) -> None:
        self.buffer.extend(data)
        self.write_order.append(len(self.buffer))

    async def drain(self) -> None:
        self.drain_calls += 1


class RecordingMonitoringWriter:
    """Records every monitoring frame in order, with a timestamp counter."""

    def __init__(self) -> None:
        self.frames: list[tuple[int, Any]] = []

    def write_frame(self, code: int, payload: Any) -> None:
        self.frames.append((code, payload))


async def _aiter(items: list[Any]) -> AsyncIterator[Any]:
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_text_plain_encodes_str_as_utf8_with_newline():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    await forward_output_stream(
        _aiter(["hello", "zażółć"]),
        out,
        mon,
        content_type="text/plain",
    )

    assert out.buffer == b"hello\n" + "zażółć\n".encode("utf-8")


@pytest.mark.asyncio
async def test_ndjson_encodes_dict_as_json_line():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    items = [{"a": 1, "b": "x"}, {"n": 2}]

    await forward_output_stream(
        _aiter(items),
        out,
        mon,
        content_type="application/x-ndjson",
    )

    expected = b"".join(
        json.dumps(item, separators=(",", ":")).encode("utf-8") + b"\n"
        for item in items
    )
    assert out.buffer == expected


@pytest.mark.asyncio
async def test_ndjson_byte_for_byte_parity_with_node_json_stringify():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    await forward_output_stream(
        _aiter([{"a": 1, "b": 2}]),
        out,
        mon,
        content_type="application/x-ndjson",
    )

    # Node JSON.stringify({a:1,b:2}) => '{"a":1,"b":2}' - no whitespace.
    assert out.buffer == b'{"a":1,"b":2}\n'


@pytest.mark.asyncio
async def test_raw_bytes_pass_through_unchanged():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    chunks: list[Any] = [b"\x00\x01\x02", b"raw-bytes"]

    await forward_output_stream(
        _aiter(chunks),
        out,
        mon,
        content_type="",
    )

    assert out.buffer == b"\x00\x01\x02raw-bytes"


@pytest.mark.asyncio
async def test_pang_emitted_before_first_output_chunk():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    # Wrap the writer to detect any write that happens before the PANG.
    pang_seen_at_write: list[bool] = []
    original_write = out.write

    def tracking_write(data: bytes) -> None:
        pang_seen_at_write.append(len(mon.frames) > 0)
        original_write(data)

    out.write = tracking_write  # type: ignore[assignment]

    await forward_output_stream(
        _aiter(["x"]),
        out,
        mon,
        provides="topic-a",
        requires="topic-b",
        content_type="text/plain",
    )

    # PANG was sent
    assert mon.frames, "PANG frame must be emitted"
    code, payload = mon.frames[0]
    assert code == PANG
    assert payload == {
        "provides": "topic-a",
        "requires": "topic-b",
        "contentType": "text/plain",
    }

    # Every output chunk happened AFTER PANG was emitted.
    assert pang_seen_at_write and all(pang_seen_at_write)


@pytest.mark.asyncio
async def test_pang_emitted_once_even_for_empty_stream():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    await forward_output_stream(
        _aiter([]),
        out,
        mon,
        provides="p",
        requires="r",
        content_type="application/x-ndjson",
    )

    assert len(mon.frames) == 1
    assert mon.frames[0][0] == PANG
    assert out.buffer == b""


@pytest.mark.asyncio
async def test_text_plain_rejects_non_string_items():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    with pytest.raises(TypeError, match="text/plain"):
        await forward_output_stream(
            _aiter([{"not": "a string"}]),
            out,
            mon,
            content_type="text/plain",
        )


@pytest.mark.asyncio
async def test_drain_called_after_each_write():
    out = FakeOutputWriter()
    mon = RecordingMonitoringWriter()

    await forward_output_stream(
        _aiter(["a", "b", "c"]),
        out,
        mon,
        content_type="text/plain",
    )

    assert out.drain_calls == 3
