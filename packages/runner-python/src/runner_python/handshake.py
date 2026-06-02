from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any, Callable, cast


logger = logging.getLogger(__name__)

PING = 3000
PONG = 4000
MONITORING = 3001


class HandshakeTimeoutError(Exception):
    pass


class HandshakeError(Exception):
    pass


@dataclass(slots=True)
class HandshakeResult:
    appConfig: dict
    args: list
    logLevel: str


def _build_ping_payload(boot_config: Any) -> dict[str, Any]:
    sequence_info = getattr(boot_config, "sequenceInfo", None)
    if not isinstance(sequence_info, dict):
        sequence_info = {}

    instance_id = getattr(boot_config, "instanceId", None)
    if not isinstance(instance_id, str):
        instance_id = ""

    return {
        "payload": {
            "system": {
                "processPID": str(os.getpid()),
            }
        },
        "sequenceInfo": sequence_info,
        "id": instance_id,
    }


def _normalize_pong_payload(payload: Any) -> HandshakeResult:
    if not isinstance(payload, dict):
        raise HandshakeError(
            f"PONG payload must be an object, got {type(payload).__name__}"
        )

    app_config = payload.get("appConfig", {})
    if not isinstance(app_config, dict):
        raise HandshakeError("PONG field 'appConfig' must be an object")

    args = payload.get("args", [])
    if not isinstance(args, list):
        raise HandshakeError("PONG field 'args' must be a list")

    log_level = payload.get("logLevel", "INFO")
    if not isinstance(log_level, str) or len(log_level) == 0:
        raise HandshakeError("PONG field 'logLevel' must be a non-empty string")

    return HandshakeResult(
        appConfig=app_config,
        args=args,
        logLevel=log_level,
    )


def _get_control_line_reader(control_decoder: Any) -> Callable[[], bytes]:
    reader = getattr(control_decoder, "readline_crlf", None)
    if callable(reader):
        return cast(Callable[[], bytes], reader)

    stream = getattr(control_decoder, "stream", None)
    reader = getattr(stream, "readline_crlf", None)
    if callable(reader):
        return cast(Callable[[], bytes], reader)

    raise HandshakeError(
        "Control decoder must expose readline_crlf() directly or via .stream"
    )


async def _read_control_frame_async(
    control_decoder: Any,
    deadline: float,
) -> tuple[int, Any] | None:
    loop = asyncio.get_running_loop()
    remaining = deadline - loop.time()
    if remaining <= 0:
        return None

    try:
        raw_line = await asyncio.wait_for(
            asyncio.to_thread(_get_control_line_reader(control_decoder)),
            timeout=remaining,
        )
    except asyncio.TimeoutError:
        return None
    except EOFError:
        return None

    decoded = list(control_decoder.decode_control_frames(raw_line + b"\r\n"))
    if not decoded:
        raise HandshakeError("Malformed control frame during handshake")

    return decoded[0]


async def perform_handshake(
    monitoring_writer: Any,
    control_decoder: Any,
    boot_config: Any,
    timeout: float = 5.0,
) -> HandshakeResult:
    monitoring_writer.write_frame(PING, _build_ping_payload(boot_config))

    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout

    while True:
        frame = await _read_control_frame_async(control_decoder, deadline)
        if frame is None:
            raise HandshakeTimeoutError("Handshake timed out waiting for PONG")

        code, payload = frame
        if code != PONG:
            continue

        result = _normalize_pong_payload(payload)
        monitoring_writer.write_frame(MONITORING, {"healthy": True})
        return result
