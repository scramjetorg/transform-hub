from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Iterable
from typing import Any, cast

from runner_python.utils import maybe_await


logger = logging.getLogger(__name__)

STOP = 4001
KILL = 4002
SET = 4005
EVENT = 5001


class HardKillSignal(Exception):
    pass


def _get_control_line_reader(control_decoder: Any) -> Callable[[], bytes]:
    reader = getattr(control_decoder, "readline_crlf", None)
    if callable(reader):
        return cast(Callable[[], bytes], reader)

    stream = getattr(control_decoder, "stream", None)
    reader = getattr(stream, "readline_crlf", None)
    if callable(reader):
        return cast(Callable[[], bytes], reader)

    raise TypeError(
        "Control decoder must expose readline_crlf() directly or via .stream"
    )


def _normalize_control_line(raw_line: bytes) -> bytes:
    if raw_line.endswith(b"\r\n"):
        return raw_line
    if raw_line.endswith(b"\n"):
        return raw_line[:-1] + b"\r\n"
    return raw_line + b"\r\n"


def _terminator_is_set(terminator: Any) -> bool:
    is_set = getattr(terminator, "is_set", None)
    if callable(is_set):
        return bool(is_set())

    return False


async def _get_frames_async(control_decoder: Any) -> list[tuple[int, Any]]:
    decode_frames = getattr(control_decoder, "decode_control_frames", None)
    if not callable(decode_frames):
        raise TypeError("Control decoder must expose decode_control_frames()")

    decode = cast(Callable[[bytes], Iterable[tuple[int, Any]]], decode_frames)
    raw_line = await asyncio.to_thread(_get_control_line_reader(control_decoder))
    return list(decode(_normalize_control_line(raw_line)))


def _replace_app_config(app_context: Any, app_config: dict[str, Any]) -> None:
    config = getattr(app_context, "config", None)
    if isinstance(config, dict):
        config.clear()
        config.update(app_config)
    else:
        setattr(app_context, "config", dict(app_config))

    if not hasattr(app_context, "_app_config"):
        setattr(app_context, "_app_config", getattr(app_context, "config"))


def _apply_set(app_context: Any, payload: Any) -> None:
    if not isinstance(payload, dict):
        logger.warning(
            "Ignoring malformed SET control payload",
            extra={"payload": payload},
        )
        return

    app_config = payload.get("appConfig")
    if app_config is None:
        app_config = {key: value for key, value in payload.items() if key != "logLevel"}

    if not isinstance(app_config, dict):
        logger.warning(
            "Ignoring malformed SET control payload",
            extra={"payload": payload},
        )
        return

    if app_config:
        _replace_app_config(app_context, app_config)

    log_level = payload.get("logLevel")
    if isinstance(log_level, str):
        for app_logger in (
            getattr(app_context, "logger", None),
            getattr(app_context, "_sequence_logger", None),
        ):
            set_level = getattr(app_logger, "setLevel", None)
            if callable(set_level):
                set_level(log_level)


async def _dispatch_stop(app_context: Any, terminator: Any, payload: Any) -> None:
    if not isinstance(payload, dict):
        logger.warning(
            "Ignoring malformed STOP control payload",
            extra={"payload": payload},
        )
        return

    timeout = payload.get("timeout", 5000)
    if isinstance(timeout, (int, float)) and not isinstance(timeout, bool):
        timeout = timeout / 1000

    stop_payload = {
        "timeout": timeout,
        "canCallKeepalive": payload.get("canCallKeepalive", True),
    }

    handlers = list(getattr(app_context, "_stop_handlers", []))
    if handlers:
        for handler in handlers:
            await maybe_await(handler(stop_payload))
        return

    stop = getattr(terminator, "stop", None)
    if callable(stop):
        await maybe_await(stop(stop_payload))


async def _dispatch_event(app_context: Any, payload: Any) -> None:
    if not isinstance(payload, dict):
        logger.warning(
            "Ignoring malformed EVENT control payload",
            extra={"payload": payload},
        )
        return

    event_name = payload.get("eventName")
    if not isinstance(event_name, str) or len(event_name) == 0:
        logger.warning(
            "Ignoring malformed EVENT control payload",
            extra={"payload": payload},
        )
        return

    emit = getattr(app_context, "emit", None)
    if not callable(emit):
        raise TypeError("App context must expose emit()")

    await maybe_await(emit(event_name, payload.get("message")))


async def control_loop(control_decoder: Any, app_context: Any, terminator: Any) -> None:
    while not _terminator_is_set(terminator):
        try:
            frames = await _get_frames_async(control_decoder)
        except EOFError:
            break

        for code, payload in frames:
            if code == SET:
                _apply_set(app_context, payload)
                continue

            if code == KILL:
                kill_handlers = getattr(app_context, "_kill_handlers", [])
                for handler in list(kill_handlers):
                    await maybe_await(handler())
                raise HardKillSignal("Sequence killed by host")

            if code == STOP:
                await _dispatch_stop(app_context, terminator, payload)
                continue

            if code == EVENT:
                await _dispatch_event(app_context, payload)
                continue

            logger.warning(
                "Ignoring unknown control code",
                extra={"code": code, "payload": payload},
            )
