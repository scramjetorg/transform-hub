from __future__ import annotations

import asyncio

import pytest

from runner_python.input_stream import make_input_stream


def _make_reader() -> asyncio.StreamReader:
    return asyncio.StreamReader()


async def test_text_plain_yields_lines_as_strings() -> None:
    reader = _make_reader()
    reader.feed_data(b"hello\nworld\nfoo\n")
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "text/plain")]

    assert items == ["hello", "world", "foo"]
    assert all(isinstance(item, str) for item in items)


async def test_text_plain_handles_utf8_multibyte_within_line() -> None:
    reader = _make_reader()
    # "héllo" and "świat" each contain multi-byte UTF-8 characters.
    reader.feed_data("héllo\nświat\n".encode("utf-8"))
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "text/plain")]

    assert items == ["héllo", "świat"]


async def test_octet_stream_yields_raw_bytes_without_line_splitting() -> None:
    reader = _make_reader()
    payload = b"\x00\x01\n\x02\x03\n\x04"  # contains newlines that MUST NOT split
    reader.feed_data(payload)
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/octet-stream")]

    assert all(isinstance(item, (bytes, bytearray)) for item in items)
    # All raw bytes preserved - newlines NOT used as boundaries.
    assert b"".join(items) == payload
    # And the bytes must NOT be decoded into a string.
    assert not any(isinstance(item, str) for item in items)


async def test_octet_stream_reassembles_utf8_multibyte_across_chunk_boundary() -> None:
    reader = _make_reader()

    # "ł" in UTF-8 is b"\xc5\x82" - split across two feeds to force the
    # iterator to yield two distinct chunks straddling a multi-byte char.
    async def producer() -> None:
        reader.feed_data(b"a\xc5")
        await asyncio.sleep(0.01)
        reader.feed_data(b"\x82b")
        await asyncio.sleep(0.01)
        reader.feed_eof()

    producer_task = asyncio.create_task(producer())
    try:
        chunks = [item async for item in make_input_stream(reader, "application/octet-stream")]
    finally:
        await producer_task

    # Got at least two chunks (split across boundary) and reassembly decodes cleanly.
    assert len(chunks) >= 2
    assert b"".join(chunks).decode("utf-8") == "ałb"


async def test_text_plain_terminates_on_eof_without_trailing_newline() -> None:
    reader = _make_reader()
    reader.feed_data(b"line1\nline2")  # no trailing newline on last line
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "text/plain")]

    assert items == ["line1", "line2"]


async def test_backpressure_lazy_iteration_does_not_prebuffer() -> None:
    """The iterator must not eagerly drain the reader past what was requested."""
    reader = _make_reader()
    # Feed only one line so far; the iterator must yield it without blocking
    # waiting for the rest.
    reader.feed_data(b"first\n")

    iterator = make_input_stream(reader, "text/plain")
    first = await asyncio.wait_for(iterator.__anext__(), timeout=1.0)
    assert first == "first"

    # Now feed more and verify the iterator picks it up on demand.
    reader.feed_data(b"second\n")
    reader.feed_eof()

    second = await asyncio.wait_for(iterator.__anext__(), timeout=1.0)
    assert second == "second"

    with pytest.raises(StopAsyncIteration):
        await iterator.__anext__()


async def test_unknown_content_type_is_rejected() -> None:
    reader = _make_reader()
    reader.feed_data(b"a\nb\n")
    reader.feed_eof()

    iterator = make_input_stream(reader, "application/x-unknown")
    with pytest.raises(ValueError, match="content_type"):
        await iterator.__anext__()
