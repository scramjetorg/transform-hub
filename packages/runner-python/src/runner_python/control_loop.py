from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Iterable
from typing import Any, cast

from runner_python.utils import maybe_await


logger = logging.getLogger(__name__)

_LOG_LEVELS = {
    "FATAL": logging.FATAL,
    "ERROR": logging.ERROR,
    "WARN": logging.WARNING,
    "INFO": logging.INFO,
    "DEBUG": logging.DEBUG,
    "TRACE": 5,
}
logging.addLevelName(_LOG_LEVELS["TRACE"], "TRACE")

STOP = 4001
KILL = 4002
SET = 4005
EVENT = 5001
MANIFEST_RESULT = 4006


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
    async_reader = getattr(control_decoder, "readline_crlf_async", None)
    if callable(async_reader):
        raw_line = await async_reader()
    else:
        raw_line = await asyncio.to_thread(_get_control_line_reader(control_decoder))
    return list(decode(_normalize_control_line(raw_line)))


class StartupControlReader:
    """The sole fd4 reader, separating early replies from deferred controls."""

    def __init__(self, decoder: Any, manifest_client: Any) -> None:
        self.decoder = decoder
        self.manifest_client = manifest_client
        self.controls: asyncio.Queue[tuple[int, Any] | BaseException] = asyncio.Queue()
        self.early_kill = asyncio.Event()
        self._pump_task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._pump_task is None:
            self._pump_task = asyncio.create_task(self._pump())

    async def _pump(self) -> None:
        try:
            while True:
                for code, payload in await _get_frames_async(self.decoder):
                    if code == MANIFEST_RESULT:
                        self.manifest_client.handle_result(payload)
                    else:
                        await self.controls.put((code, payload))
                        if code == KILL:
                            self.early_kill.set()
        except asyncio.CancelledError:
            raise
        except BaseException as error:
            self.manifest_client.reject_pending(error)
            await self.controls.put(error)

    async def next_frame(self) -> tuple[int, Any]:
        item = await self.controls.get()
        if isinstance(item, BaseException):
            raise item
        return item

    async def close(self) -> None:
        if self._pump_task is not None and not self._pump_task.done():
            self._pump_task.cancel()
        if self._pump_task is not None:
            try:
                await self._pump_task
            except (asyncio.CancelledError, EOFError):
                pass
        self.manifest_client.reject_pending(EOFError("control reader stopped"))


async def _dispatch_kill(app_context: Any) -> None:
    kill_handlers = getattr(app_context, "_kill_handlers", [])
    for handler in list(kill_handlers):
        await maybe_await(handler())


async def run_initializer_with_control(
    reader: StartupControlReader, initializer: Any, app_context: Any
) -> Any:
    """Let early KILL interrupt initialization without activating other controls."""
    initialize_task = asyncio.create_task(initializer())
    kill_task = asyncio.create_task(reader.early_kill.wait())
    try:
        done, _ = await asyncio.wait(
            {initialize_task, kill_task}, return_when=asyncio.FIRST_COMPLETED
        )
        if kill_task in done and reader.early_kill.is_set():
            try:
                await _dispatch_kill(app_context)
            finally:
                initialize_task.cancel()
                try:
                    await initialize_task
                except asyncio.CancelledError:
                    pass
            raise HardKillSignal("Sequence killed during initialization")
        return await initialize_task
    finally:
        kill_task.cancel()
        try:
            await kill_task
        except asyncio.CancelledError:
            pass


def _replace_app_config(app_context: Any, app_config: dict[str, Any]) -> None:
    config = getattr(app_context, "config", None)
    if isinstance(config, dict):
        config.clear()
        config.update(app_config)
    else:
        setattr(app_context, "config", dict(app_config))

    if not hasattr(app_context, "_app_config"):
        setattr(app_context, "_app_config", getattr(app_context, "config"))


def _active_loggers(app_context: Any) -> Iterable[logging.Logger]:
    seen: set[int] = set()

    def add(candidate: Any) -> Iterable[logging.Logger]:
        if isinstance(candidate, logging.Logger) and id(candidate) not in seen:
            seen.add(id(candidate))
            yield candidate

    yield from add(getattr(app_context, "logger", None))
    yield from add(getattr(app_context, "_sequence_logger", None))

    # The live runtime uses this namespace for its control, runtime, sequence,
    # and application loggers. Include already-created descendants so SET also
    # reaches module loggers that have selected an explicit level.
    for name, candidate in logging.Logger.manager.loggerDict.items():
        if not name.startswith("runner_python"):
            continue
        if isinstance(candidate, logging.Logger):
            yield from add(candidate)


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
    if isinstance(log_level, str) and log_level in _LOG_LEVELS:
        for app_logger in _active_loggers(app_context):
            app_logger.setLevel(_LOG_LEVELS[log_level])


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
            if isinstance(control_decoder, StartupControlReader):
                frames = [await control_decoder.next_frame()]
            else:
                frames = await _get_frames_async(control_decoder)
        except EOFError:
            break

        for code, payload in frames:
            if code == SET:
                _apply_set(app_context, payload)
                continue

            if code == KILL:
                await _dispatch_kill(app_context)
                raise HardKillSignal("Sequence killed by host")

            if code == STOP:
                await _dispatch_stop(app_context, terminator, payload)
                continue

            if code == EVENT:
                await _dispatch_event(app_context, payload)
                continue

            if code == MANIFEST_RESULT:
                manifest_api = getattr(app_context, "_manifest_api", None)
                if manifest_api is not None:
                    manifest_api.handle_result(payload)
                continue

            logger.warning(
                "Ignoring unknown control code",
                extra={"code": code, "payload": payload},
            )
