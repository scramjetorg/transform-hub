from __future__ import annotations

import inspect
from collections.abc import Iterable, Mapping
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
from typing import TYPE_CHECKING, Any

from runner_python.input_stream import make_input_stream, is_ndjson_content_type, read_http_headers
from runner_python.legacy import (
    legacy_content_type_from_meta,
    legacy_result_attr,
    legacy_topic_from_meta,
)

if TYPE_CHECKING:
    from runner_python.sequence_loader import SequenceModule
    from scramjet.streams import Stream


async def maybe_await(result: Any) -> Any:
    if inspect.isawaitable(result):
        return await result

    return result


def build_input_stream(reader: Any, content_type: str) -> Stream:
    from scramjet.streams import Stream

    return Stream.from_iterable(_iter_headered_input(reader, content_type))


async def _iter_headered_input(reader: Any, default_content_type: str):
    """Read HTTP-like headers from *reader*, then parse the body according
    to ``content-type``.

    The content type is taken from the ``content-type`` header (if
    present), falling back to *default_content_type*.

    ``text/plain`` and ``application/octet-stream`` preserve the original
    line-oriented / raw-chunk behaviour (including trailing ``\\n`` on text
    lines for backward compatibility with ``scramjet.streams.Stream``
    sequences).  ``application/json`` and ``application/x-ndjson`` delegate
    to :func:`make_input_stream` for unified parsing.
    """
    headers = await read_http_headers(reader)
    content_type = headers.get("content-type", default_content_type)

    if content_type == "application/octet-stream":
        while True:
            chunk = await reader.read(CHUNK_SIZE)
            if not chunk:
                return
            yield chunk
        return  # not reached, but explicit

    if content_type == "text/plain":
        while True:
            line = await reader.readline()
            if not line:
                return
            yield line.decode("utf-8")
        return  # not reached, but explicit

    if content_type == "application/json" or is_ndjson_content_type(content_type):
        async for item in make_input_stream(reader, content_type):
            yield item
        return

    raise ValueError(f"unsupported content_type: {content_type!r}")


def _topic_from_meta(kind: str, meta: dict[str, Any]) -> str:
    """Extract the topic name from a ``requires``/``provides`` metadata dict.

    Tries canonical snake_case key ``topic`` first, then falls back to the
    unsupported legacy key matching ``kind`` (``requires`` or ``provides``).
    """
    topic = meta.get("topic")
    if isinstance(topic, str) and topic:
        return topic
    return legacy_topic_from_meta(meta, kind)


def _pang_from_meta(kind: str, meta: dict[str, Any]) -> dict[str, str] | None:
    topic = _topic_from_meta(kind, meta)
    if not topic:
        return None
    return {kind: topic, "contentType": _content_type_from_meta(meta)}


def _content_type_from_meta(meta: dict[str, Any]) -> str:
    """Extract content type from a ``requires``/``provides`` metadata dict.

    Tries canonical snake_case key ``content_type`` first, then legacy
    unsupported legacy ``contentType``.
    """
    ct = meta.get("content_type")
    if isinstance(ct, str) and ct:
        return ct
    return legacy_content_type_from_meta(meta)


def build_runtime_pangs(sequence: SequenceModule, result: Any) -> list[dict[str, str]]:
    pangs: list[dict[str, str]] = []
    result_content_type = legacy_result_attr(result, "content_type")

    result_provides = legacy_result_attr(result, "provides")
    if result_provides:
        pangs.append(
            {
                "provides": result_provides,
                "contentType": result_content_type,
            }
        )
    else:
        provides = getattr(sequence.module, "provides", None)
        if isinstance(provides, dict):
            # Canonical snake_case (Phase 1) and legacy camelCase keys.
            pang = _pang_from_meta("provides", provides)
            if pang is not None:
                pangs.append(pang)

    result_requires = legacy_result_attr(result, "requires")
    if result_requires:
        pangs.append(
            {
                "requires": result_requires,
                "contentType": result_content_type,
            }
        )
    else:
        requires = getattr(sequence.module, "requires", None)
        if isinstance(requires, dict):
            pang = _pang_from_meta("requires", requires)
            if pang is not None:
                pangs.append(pang)

    return pangs


def get_input_content_type(sequence: SequenceModule) -> str:
    requires = getattr(sequence.module, "requires", None)
    if isinstance(requires, dict):
        # Canonical snake_case (Phase 1).
        content_type = requires.get("content_type")
        if isinstance(content_type, str) and content_type:
            return content_type
        # Unsupported legacy camelCase fallback, isolated in legacy.py.
        content_type = legacy_content_type_from_meta(requires)
        if content_type:
            return content_type
    return "text/plain"


def get_output_content_type(sequence: SequenceModule, result: Any) -> str:
    content_type = legacy_result_attr(result, "content_type")
    if not content_type:
        provides = getattr(sequence.module, "provides", None)
        if isinstance(provides, dict):
            # Canonical snake_case (Phase 1).
            raw_content_type = provides.get("content_type")
            if isinstance(raw_content_type, str):
                content_type = raw_content_type
            else:
                # Unsupported legacy camelCase fallback, isolated in legacy.py.
                content_type = legacy_content_type_from_meta(provides)

    if not isinstance(content_type, str):
        return ""

    if content_type == "application/octet-stream" or is_ndjson_content_type(content_type):
        return content_type

    return ""


async def resolve_sequence_result(result: Any) -> Any:
    current = result
    while (
        inspect.isawaitable(current)
        and not inspect.isasyncgen(current)
        and not hasattr(current, "__aiter__")
    ):
        current = await current
    return current


def as_output_stream(result: Any) -> Any:
    from scramjet.streams import Stream

    if result is None:
        return None
    if hasattr(result, "__aiter__"):
        return result
    if isinstance(result, Iterable) and not isinstance(
        result, (str, bytes, bytearray, Mapping)
    ):
        return _iter_sync_output(result)
    return Stream.from_iterable([result])


async def _iter_sync_output(result: Iterable[Any]):
    for item in result:
        yield item
