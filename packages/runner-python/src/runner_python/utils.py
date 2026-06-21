from __future__ import annotations

import inspect
from collections.abc import Iterable, Mapping
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
from typing import TYPE_CHECKING, Any

from runner_python.input_stream import read_http_headers

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
    headers = await read_http_headers(reader)
    content_type = headers.get("content-type", default_content_type)

    if content_type == "application/octet-stream":
        while True:
            chunk = await reader.read(CHUNK_SIZE)
            if not chunk:
                return
            yield chunk

    if content_type == "text/plain":
        while True:
            line = await reader.readline()
            if not line:
                return
            yield line.decode("utf-8")

    raise ValueError(f"unsupported content_type: {content_type!r}")


def _topic_from_meta(meta: dict[str, Any]) -> str:
    """Extract the topic name from a ``requires``/``provides`` metadata dict.

    Tries canonical snake_case key ``topic`` first, then falls back to
    legacy camelCase keys.
    """
    topic = meta.get("topic")
    if isinstance(topic, str) and topic:
        return topic
    # Legacy fallback — the dict may use the key matching the parent attr.
    topic = meta.get("requires", meta.get("provides", ""))
    if isinstance(topic, str):
        return topic
    return ""


def _pang_from_meta(kind: str, meta: dict[str, Any]) -> dict[str, str] | None:
    topic = _topic_from_meta(meta)
    if not topic:
        return None
    return {kind: topic, "contentType": _content_type_from_meta(meta)}


def _content_type_from_meta(meta: dict[str, Any]) -> str:
    """Extract content type from a ``requires``/``provides`` metadata dict.

    Tries canonical snake_case key ``content_type`` first, then legacy
    ``contentType``.
    """
    ct = meta.get("content_type")
    if isinstance(ct, str) and ct:
        return ct
    ct = meta.get("contentType", "")
    if isinstance(ct, str):
        return ct
    return ""


def build_runtime_pangs(sequence: SequenceModule, result: Any) -> list[dict[str, str]]:
    pangs: list[dict[str, str]] = []
    result_content_type = getattr(result, "content_type", "")
    if not isinstance(result_content_type, str):
        result_content_type = ""

    result_provides = getattr(result, "provides", None)
    if isinstance(result_provides, str):
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

    result_requires = getattr(result, "requires", None)
    if isinstance(result_requires, str):
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
        # Legacy camelCase fallback.
        content_type = requires.get("contentType")
        if isinstance(content_type, str) and content_type:
            return content_type
    return "text/plain"


def get_output_content_type(sequence: SequenceModule, result: Any) -> str:
    content_type = getattr(result, "content_type", None)
    if not isinstance(content_type, str) or not content_type:
        provides = getattr(sequence.module, "provides", None)
        if isinstance(provides, dict):
            # Canonical snake_case (Phase 1).
            raw_content_type = provides.get("content_type")
            if isinstance(raw_content_type, str):
                content_type = raw_content_type
            else:
                # Legacy camelCase fallback.
                raw_content_type = provides.get("contentType")
                if isinstance(raw_content_type, str):
                    content_type = raw_content_type

    if content_type in {"application/octet-stream", "application/x-ndjson"}:
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
