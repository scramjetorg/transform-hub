"""Focused tests for ``runner_python.utils`` topic metadata and content-type helpers.

Phase 1 contract: canonical snake_case ``requires``/``provides`` metadata
with keys ``topic`` and ``content_type`` supplements the legacy camelCase
keys while preserving backward compatibility.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from runner_python.sequence_loader import SequenceModule
from runner_python.utils import (
    as_output_stream,
    build_runtime_pangs,
    get_input_content_type,
    get_output_content_type,
)


# ---------------------------------------------------------------------------
# Helpers — build minimal SequenceModule stubs for unit tests
# ---------------------------------------------------------------------------


def _make_module(attrs: dict[str, Any]) -> Any:
    class FakeModule:
        pass

    mod = FakeModule()
    for key, value in attrs.items():
        setattr(mod, key, value)
    return mod


def _make_sequence(
    module_attrs: dict[str, Any] | None = None,
) -> SequenceModule:
    return SequenceModule(
        module=_make_module(module_attrs or {}),
        run=lambda ctx, inp, *args: None,
        sequence_dir="/tmp",
        entrypoint_name="main",
        _original_cwd="/",
    )


# ---------------------------------------------------------------------------
# get_input_content_type — canonical snake_case and legacy camelCase
# ---------------------------------------------------------------------------


def test_input_content_type_canonical_snake_case() -> None:
    seq = _make_sequence(
        {"requires": {"topic": "in-topic", "content_type": "application/x-ndjson"}}
    )
    assert get_input_content_type(seq) == "application/x-ndjson"


def test_input_content_type_legacy_camelcase() -> None:
    seq = _make_sequence(
        {"requires": {"requires": "in-topic", "contentType": "application/octet-stream"}}
    )
    assert get_input_content_type(seq) == "application/octet-stream"


def test_input_content_type_defaults_to_text_plain() -> None:
    seq = _make_sequence({})
    assert get_input_content_type(seq) == "text/plain"


def test_input_content_type_canonical_takes_precedence() -> None:
    """snake_case content_type wins over contentType when both are set."""
    seq = _make_sequence(
        {
            "requires": {
                "topic": "in-topic",
                "content_type": "application/x-ndjson",
                "contentType": "text/plain",
            }
        }
    )
    assert get_input_content_type(seq) == "application/x-ndjson"


# ---------------------------------------------------------------------------
# get_output_content_type — canonical snake_case and legacy camelCase
# ---------------------------------------------------------------------------


def test_output_content_type_from_provides_snake_case() -> None:
    seq = _make_sequence(
        {"provides": {"topic": "out-topic", "content_type": "application/x-ndjson"}}
    )
    assert get_output_content_type(seq, None) == "application/x-ndjson"


def test_output_content_type_from_provides_legacy() -> None:
    seq = _make_sequence(
        {"provides": {"provides": "out-topic", "contentType": "application/octet-stream"}}
    )
    assert get_output_content_type(seq, None) == "application/octet-stream"


def test_output_content_type_from_result_content_type() -> None:
    class FakeResult:
        content_type = "application/x-ndjson"

    seq = _make_sequence({})
    assert get_output_content_type(seq, FakeResult()) == "application/x-ndjson"


def test_output_content_type_accepts_text_x_ndjson_alias() -> None:
    seq = _make_sequence({"provides": {"topic": "out", "content_type": "text/x-ndjson"}})
    assert get_output_content_type(seq, None) == "text/x-ndjson"


def test_output_content_type_canonical_takes_precedence() -> None:
    """snake_case content_type wins over contentType when both are set."""
    seq = _make_sequence(
        {
            "provides": {
                "topic": "out-topic",
                "content_type": "application/x-ndjson",
                "contentType": "text/plain",
            }
        }
    )
    assert get_output_content_type(seq, None) == "application/x-ndjson"


def test_output_content_type_returns_empty_for_unsupported() -> None:
    seq = _make_sequence(
        {"provides": {"topic": "out", "content_type": "text/plain"}}
    )
    assert get_output_content_type(seq, None) == ""


# ---------------------------------------------------------------------------
# build_runtime_pangs — canonical snake_case topic metadata
# ---------------------------------------------------------------------------


def test_pang_provides_snake_case() -> None:
    seq = _make_sequence(
        {"provides": {"topic": "my-topic", "content_type": "application/x-ndjson"}}
    )
    pangs = build_runtime_pangs(seq, None)
    assert len(pangs) == 1
    assert pangs[0]["provides"] == "my-topic"
    assert pangs[0]["contentType"] == "application/x-ndjson"


def test_pang_requires_snake_case() -> None:
    seq = _make_sequence(
        {"requires": {"topic": "input-topic", "content_type": "application/octet-stream"}}
    )
    pangs = build_runtime_pangs(seq, None)
    assert len(pangs) == 1
    assert pangs[0]["requires"] == "input-topic"
    assert pangs[0]["contentType"] == "application/octet-stream"


def test_pang_both_provides_and_requires_snake_case() -> None:
    seq = _make_sequence(
        {
            "provides": {"topic": "out-topic", "content_type": "application/x-ndjson"},
            "requires": {"topic": "in-topic", "content_type": "text/plain"},
        }
    )
    pangs = build_runtime_pangs(seq, None)
    assert len(pangs) == 2
    provides_pang = next(p for p in pangs if "provides" in p)
    requires_pang = next(p for p in pangs if "requires" in p)
    assert provides_pang["provides"] == "out-topic"
    assert provides_pang["contentType"] == "application/x-ndjson"
    assert requires_pang["requires"] == "in-topic"
    assert requires_pang["contentType"] == "text/plain"


def test_pang_legacy_camelcase_still_works() -> None:
    """Legacy {provides/requires, contentType} keys remain supported."""
    seq = _make_sequence(
        {
            "provides": {"provides": "legacy-topic", "contentType": "application/octet-stream"},
            "requires": {"requires": "legacy-in", "contentType": "text/plain"},
        }
    )
    pangs = build_runtime_pangs(seq, None)
    assert len(pangs) == 2
    provides_pang = next(p for p in pangs if "provides" in p)
    requires_pang = next(p for p in pangs if "requires" in p)
    assert provides_pang["provides"] == "legacy-topic"
    assert provides_pang["contentType"] == "application/octet-stream"
    assert requires_pang["requires"] == "legacy-in"
    assert requires_pang["contentType"] == "text/plain"


def test_pang_no_metadata_yields_empty_topic() -> None:
    seq = _make_sequence({})
    pangs = build_runtime_pangs(seq, None)
    assert pangs == []


def test_pang_snake_case_takes_precedence_over_legacy() -> None:
    """snake_case topic/content_type beats legacy camelCase when both present."""
    seq = _make_sequence(
        {
            "provides": {
                "topic": "snake-topic",
                "content_type": "application/x-ndjson",
                "provides": "legacy-topic",
                "contentType": "text/plain",
            }
        }
    )
    pangs = build_runtime_pangs(seq, None)
    assert len(pangs) == 1
    assert pangs[0]["provides"] == "snake-topic"
    assert pangs[0]["contentType"] == "application/x-ndjson"


def test_pang_empty_dict_no_keys_does_not_produce_pang() -> None:
    """A metadata dict without topic keys is content-type-only and emits no PANG."""
    seq = _make_sequence({"provides": {}})
    assert build_runtime_pangs(seq, None) == []


def test_pang_content_type_only_no_topic_does_not_produce_pang() -> None:
    seq = _make_sequence({"requires": {"content_type": "text/plain"}})
    assert build_runtime_pangs(seq, None) == []


def test_pang_empty_topic_with_legacy_topic_uses_legacy_fallback() -> None:
    seq = _make_sequence(
        {"provides": {"topic": "", "provides": "legacy", "content_type": "text/plain"}}
    )
    assert build_runtime_pangs(seq, None) == [
        {"provides": "legacy", "contentType": "text/plain"}
    ]


def test_pang_empty_topic_without_legacy_topic_does_not_produce_pang() -> None:
    seq = _make_sequence({"provides": {"topic": "", "content_type": "text/plain"}})
    assert build_runtime_pangs(seq, None) == []


async def test_as_output_stream_iterates_sync_iterables_item_by_item() -> None:
    output = as_output_stream(["a", "b"])
    assert [item async for item in output] == ["a", "b"]


async def test_as_output_stream_treats_string_as_single_item() -> None:
    output = as_output_stream("ab")
    assert [item async for item in output] == ["ab"]


async def test_headered_input_accepts_text_x_ndjson_alias() -> None:
    reader = asyncio.StreamReader()
    reader.feed_data(b"content-type: text/x-ndjson\r\n\r\n" b'{"a":1}\n')
    reader.feed_eof()

    assert [item async for item in _iter_headered_input(reader, "text/plain")] == [
        {"a": 1}
    ]


async def test_as_output_stream_none_returns_none() -> None:
    assert as_output_stream(None) is None


async def test_as_output_stream_bytes_wraps_single_item() -> None:
    output = as_output_stream(b"\x00\x01\x02")
    assert [item async for item in output] == [b"\x00\x01\x02"]


async def test_as_output_stream_dict_wraps_single_item() -> None:
    output = as_output_stream({"key": "value"})
    assert [item async for item in output] == [{"key": "value"}]


async def test_as_output_stream_list_is_iterated_but_returns_single_item() -> None:
    """A list is a sync iterable, so as_output_stream iterates it item by item."""
    output = as_output_stream([1, 2, 3])
    assert [item async for item in output] == [1, 2, 3]


async def test_as_output_stream_passes_async_iterable_through() -> None:
    async def _agen():
        for i in range(3):
            yield i

    output = as_output_stream(_agen())
    assert [item async for item in output] == [0, 1, 2]


async def test_as_output_stream_async_generator_passes_through() -> None:
    async def _gen():
        yield "a"
        yield "b"

    output = as_output_stream(_gen())
    assert [item async for item in output] == ["a", "b"]


# ---------------------------------------------------------------------------
# _iter_headered_input — header-path content-type delegation
# ---------------------------------------------------------------------------

from runner_python.utils import _iter_headered_input  # noqa: E402


async def test_headered_input_text_plain() -> None:
    reader = asyncio.StreamReader()
    reader.feed_data(b"content-type: text/plain\r\n\r\nhello\nworld\n")
    reader.feed_eof()

    items = [item async for item in _iter_headered_input(reader, "text/plain")]
    # readline() includes trailing \n for backward compat with Stream sequences
    assert items == ["hello\n", "world\n"]


async def test_headered_input_json() -> None:
    reader = asyncio.StreamReader()
    reader.feed_data(b"content-type: application/json\r\n\r\n{\"a\": 1}")
    reader.feed_eof()

    items = [item async for item in _iter_headered_input(reader, "text/plain")]
    assert items == [{"a": 1}]


async def test_headered_input_ndjson() -> None:
    reader = asyncio.StreamReader()
    reader.feed_data(b"content-type: application/x-ndjson\r\n\r\n{\"a\": 1}\n{\"b\": 2}\n")
    reader.feed_eof()

    items = [item async for item in _iter_headered_input(reader, "text/plain")]
    assert items == [{"a": 1}, {"b": 2}]


async def test_headered_input_octet_stream() -> None:
    reader = asyncio.StreamReader()
    reader.feed_data(b"content-type: application/octet-stream\r\n\r\n\x00\x01\x02")
    reader.feed_eof()

    items = [item async for item in _iter_headered_input(reader, "text/plain")]
    assert items == [b"\x00\x01\x02"]


async def test_headered_input_default_content_type() -> None:
    """When no content-type header is present, the default is used."""
    reader = asyncio.StreamReader()
    reader.feed_data(b"\r\nhello\nworld\n")  # headers block consumed as empty
    reader.feed_eof()

    items = [item async for item in _iter_headered_input(reader, "text/plain")]
    # readline() includes trailing \n for backward compat
    assert items == ["hello\n", "world\n"]
