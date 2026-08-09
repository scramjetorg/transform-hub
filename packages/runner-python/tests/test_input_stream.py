from __future__ import annotations

import asyncio

import pytest

from runner_python.input_stream import make_input_stream, read_http_headers


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
    assert b"".join(item for item in items if isinstance(item, (bytes, bytearray))) == payload
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
    assert b"".join(chunk for chunk in chunks if isinstance(chunk, (bytes, bytearray))).decode("utf-8") == "ałb"


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


async def test_json_malformed_raises_json_decode_error() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"not": valid}')
    reader.feed_eof()

    iterator = make_input_stream(reader, "application/json")
    with pytest.raises(ValueError):
        await iterator.__anext__()


async def test_text_x_ndjson_alias_yields_json_values() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a":1}\n{"b":2}\n')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "text/x-ndjson")]

    assert items == [{"a": 1}, {"b": 2}]


# ---------------------------------------------------------------------------
# read_http_headers — HTTP-like input header stripping
# ---------------------------------------------------------------------------


async def test_read_http_headers_parses_and_leaves_body() -> None:
    """Headers are parsed to lower-case keys; body bytes remain for subsequent reads."""
    reader = _make_reader()
    reader.feed_data(
        b"content-type: text/plain\r\n"
        b"content-length: 13\r\n"
        b"\r\n"
        b"Hello, World!"
    )
    reader.feed_eof()

    headers = await read_http_headers(reader)
    body = await reader.read()

    assert headers == {"content-type": "text/plain", "content-length": "13"}
    assert body == b"Hello, World!"


async def test_read_http_headers_body_in_same_buffer() -> None:
    """Body bytes already fed after the \\r\\n\\r\\n separator are preserved."""
    reader = _make_reader()
    reader.feed_data(b"x-custom: value\r\n\r\nremaining body data")
    reader.feed_eof()

    headers = await read_http_headers(reader)
    body = await reader.read()

    assert headers == {"x-custom": "value"}
    assert body == b"remaining body data"


async def test_read_http_headers_eof_before_terminator() -> None:
    """If EOF occurs before headers end, returns empty dict without hanging."""
    reader = _make_reader()
    reader.feed_data(b"content-type: text/plain\r\n")
    reader.feed_eof()

    headers = await read_http_headers(reader)

    assert headers == {}


async def test_read_http_headers_without_blank_line_consumes_incomplete_header_block() -> None:
    """Runtime input framing expects a blank-line header terminator."""
    reader = _make_reader()
    reader.feed_data(b"body-without-header-terminator")
    reader.feed_eof()

    headers = await read_http_headers(reader)
    body = await reader.read()

    assert headers == {}
    assert body == b""


# ---------------------------------------------------------------------------
# application/json — whole-value buffering, single yield
# ---------------------------------------------------------------------------


async def test_json_parses_dict() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a": 1, "b": "x"}')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/json")]
    assert items == [{"a": 1, "b": "x"}]


async def test_json_parses_list() -> None:
    reader = _make_reader()
    reader.feed_data(b"[1, 2, 3]")
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/json")]
    assert items == [[1, 2, 3]]


async def test_json_parses_primitive() -> None:
    reader = _make_reader()
    reader.feed_data(b'"hello"')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/json")]
    assert items == ["hello"]


async def test_json_empty_input_yields_nothing() -> None:
    reader = _make_reader()
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/json")]
    assert items == []


# ---------------------------------------------------------------------------
# application/x-ndjson — line-by-line JSON streaming
# ---------------------------------------------------------------------------


async def test_ndjson_parses_line_by_line() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a": 1}\n{"b": 2}\n{"c": 3}\n')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == [{"a": 1}, {"b": 2}, {"c": 3}]


async def test_ndjson_skips_blank_lines() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a": 1}\n\n\n{"b": 2}\n')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == [{"a": 1}, {"b": 2}]


async def test_ndjson_handles_trailing_line_without_newline() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a": 1}\n{"b": 2}')  # no trailing newline
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == [{"a": 1}, {"b": 2}]


async def test_ndjson_backpressure_lazy_iteration() -> None:
    """The iterator must yield items without eagerly draining the reader."""
    reader = _make_reader()
    reader.feed_data(b'{"first": 1}\n')

    iterator = make_input_stream(reader, "application/x-ndjson")
    first = await asyncio.wait_for(iterator.__anext__(), timeout=1.0)
    assert first == {"first": 1}

    # Feed more and verify the iterator picks it up on demand.
    reader.feed_data(b'{"second": 2}\n')
    reader.feed_eof()

    second = await asyncio.wait_for(iterator.__anext__(), timeout=1.0)
    assert second == {"second": 2}

    with pytest.raises(StopAsyncIteration):
        await iterator.__anext__()


async def test_ndjson_malformed_line_raises_value_error() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"valid": 1}\nnot-json\n{"valid": 2}\n')
    reader.feed_eof()

    iterator = make_input_stream(reader, "application/x-ndjson")
    # First valid item is yielded
    first = await iterator.__anext__()
    assert first == {"valid": 1}
    # Second line is malformed
    with pytest.raises(ValueError, match="malformed NDJSON line"):
        await iterator.__anext__()


async def test_ndjson_malformed_line_with_incomplete_json() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"valid": 1}\n{"broken')
    reader.feed_eof()

    iterator = make_input_stream(reader, "application/x-ndjson")
    first = await iterator.__anext__()
    assert first == {"valid": 1}
    with pytest.raises(ValueError, match="malformed NDJSON line"):
        await iterator.__anext__()


async def test_ndjson_empty_input_yields_nothing() -> None:
    reader = _make_reader()
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == []


async def test_ndjson_parses_primitives() -> None:
    """NDJSON lines can be strings, numbers, nulls, etc."""
    reader = _make_reader()
    reader.feed_data(b'"hello"\n42\nnull\ntrue\n')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == ["hello", 42, None, True]


async def test_ndjson_skips_lines_with_only_whitespace() -> None:
    reader = _make_reader()
    reader.feed_data(b'{"a": 1}\n   \n\t\n{"b": 2}\n')
    reader.feed_eof()

    items = [item async for item in make_input_stream(reader, "application/x-ndjson")]
    assert items == [{"a": 1}, {"b": 2}]
