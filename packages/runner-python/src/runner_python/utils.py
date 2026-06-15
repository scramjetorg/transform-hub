from __future__ import annotations

import inspect
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
        if isinstance(provides, dict) and "provides" in provides:
            pangs.append(
                {
                    "provides": str(provides.get("provides", "")),
                    "contentType": str(provides.get("contentType", "")),
                }
            )

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
        if isinstance(requires, dict) and "requires" in requires:
            pangs.append(
                {
                    "requires": str(requires.get("requires", "")),
                    "contentType": str(requires.get("contentType", "")),
                }
            )

    return pangs


def get_input_content_type(sequence: SequenceModule) -> str:
    requires = getattr(sequence.module, "requires", None)
    if isinstance(requires, dict):
        content_type = requires.get("contentType")
        if isinstance(content_type, str) and content_type:
            return content_type
    return "text/plain"


def get_output_content_type(sequence: SequenceModule, result: Any) -> str:
    content_type = getattr(result, "content_type", None)
    if not isinstance(content_type, str) or not content_type:
        provides = getattr(sequence.module, "provides", None)
        if isinstance(provides, dict):
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
    return Stream.from_iterable([result])
