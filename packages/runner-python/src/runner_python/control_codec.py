from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from dataclasses import dataclass, field
from typing import Any


logger = logging.getLogger(__name__)


def _decode_frame(frame: bytes) -> tuple[int, Any] | None:
    try:
        frame_text = frame.decode("utf-8")
        payload = json.loads(frame_text)

        if not isinstance(payload, list) or len(payload) != 2:
            raise ValueError("control frame must be a JSON array [code, payload]")

        code, data = payload

        if not isinstance(code, int) or isinstance(code, bool):
            raise ValueError("control frame code must be an integer")

        return code, data
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        logger.warning(
            "Skipping malformed control frame",
            extra={
                "frame": frame.decode("utf-8", errors="replace"),
                "error": str(exc),
            },
        )
        return None


@dataclass(slots=True)
class ControlFrameDecoder:
    _buffer: bytearray = field(default_factory=bytearray)

    def decode_control_frames(self, chunk: bytes) -> Iterator[tuple[int, Any]]:
        self._buffer.extend(chunk)

        while True:
            delimiter_index = self._buffer.find(b"\r\n")
            if delimiter_index == -1:
                return

            frame = bytes(self._buffer[:delimiter_index])
            del self._buffer[: delimiter_index + 2]

            decoded = _decode_frame(frame)
            if decoded is not None:
                yield decoded

def decode_control_frames(buffer: bytes) -> Iterator[tuple[int, Any]]:
    decoder = ControlFrameDecoder()
    yield from decoder.decode_control_frames(buffer)
