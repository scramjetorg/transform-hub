"""Monitoring frame encoder for the fd5 monitoring stream.

Serializes ``[code, payload]`` to a CRLF-terminated JSON array, matching the
byte-for-byte format produced by the Node serializer.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def encode_monitoring_frame(code: int, payload: Any) -> bytes:
    """Encode a monitoring frame as a CRLF-terminated JSON array.

    Uses ``json.dumps`` with ``separators=(",", ":")`` and
    ``ensure_ascii=False`` so the output matches Node's ``JSON.stringify``
    byte-for-byte (no inter-token whitespace, raw UTF-8 for non-ASCII).
    """
    frame = json.dumps([code, payload], separators=(",", ":"), ensure_ascii=False)
    return frame.encode("utf-8") + b"\r\n"


class MonitoringWriter:
    """Writes monitoring frames to the fd5 monitoring stream.

    Each ``write_frame`` call writes one encoded frame and flushes the
    underlying stream immediately - frames are never aggregated.
    """

    def __init__(self, stream: Any) -> None:
        self._stream = stream

    def write_frame(self, code: int, payload: Any) -> None:
        """Encode and write a single monitoring frame, flushing immediately."""
        data = encode_monitoring_frame(code, payload)
        self._stream.write(data)
        self._stream.flush()
