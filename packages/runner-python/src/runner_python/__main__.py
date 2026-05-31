from __future__ import annotations

# pyright: reportMissingImports=false

# pyright: reportMissingImports=false

import asyncio
import contextlib
import inspect
import json
import logging
import sys
import time
import traceback
from io import DEFAULT_BUFFER_SIZE as CHUNK_SIZE
from pathlib import Path
from typing import Any


def _add_local_packages() -> None:
    package_root = Path(__file__).resolve().parents[2]
    local_packages = package_root / "__pypackages__"

    if local_packages.exists():
        local_packages_path = str(local_packages)
        if local_packages_path not in sys.path:
            sys.path.insert(0, local_packages_path)


_add_local_packages()

from scramjet.streams import Stream

from runner_python.app_context import AppContext
from runner_python.boot_config import load_boot_config
from runner_python.control_codec import ControlFrameDecoder
from runner_python.control_loop import EVENT, HardKillSignal, control_loop
from runner_python.fd_streams import FdStreams, open_fd_streams
from runner_python.handshake import MONITORING, PING, perform_handshake
from runner_python.heartbeat import run_heartbeat
from runner_python.host_channels import HostChannels, connect_host_channels
from runner_python.lifecycle import perform_shutdown
from runner_python.monitoring_codec import MonitoringWriter
from runner_python.output_stream import PANG, forward_output_stream
from runner_python.sequence_loader import SequenceLoadError, SequenceModule, load_sequence


logger = logging.getLogger("runner_python")
_STDIO_GUARDS: list[Any] = []


class LiveControlDecoder:
    def __init__(self, streams: FdStreams) -> None:
        self._decoder = ControlFrameDecoder()
        self._streams = streams

    def decode_control_frames(self, chunk: bytes):
        return self._decoder.decode_control_frames(chunk)

    def readline_crlf(self) -> bytes:
        return self._streams.control_in.readline_crlf()


class DeferredMonitoringWriter:
    def __init__(self, writer: MonitoringWriter) -> None:
        self._writer = writer
        self._deferred: list[tuple[int, Any]] = []

    def write_frame(self, code: int, payload: Any) -> None:
        if code == PING:
            self._writer.write_frame(code, payload)
            return

        if code == MONITORING:
            self._deferred.append((code, payload))
            return

        self._writer.write_frame(code, payload)

    def flush(self) -> None:
        for code, payload in self._deferred:
            self._writer.write_frame(code, payload)
        self._deferred.clear()


class PangSuppressingMonitoringWriter:
    def __init__(self, writer: MonitoringWriter) -> None:
        self._writer = writer

    def write_frame(self, code: int, payload: Any) -> None:
        if code == PANG:
            return
        self._writer.write_frame(code, payload)


class JsonLogHandler(logging.Handler):
    def __init__(self, writer: asyncio.StreamWriter) -> None:
        super().__init__()
        self._writer = writer

    def emit(self, record: logging.LogRecord) -> None:
        try:
            payload = {
                "ts": int(time.time() * 1000),
                "level": record.levelname,
                "from": "PythonRunner",
                "msg": record.getMessage(),
            }
            data = json.dumps(payload, separators=(", ", ": ")).encode("utf-8") + b"\n"
            self._writer.write(data)
        except Exception:
            self.handleError(record)


class RuntimeTerminator:
    def __init__(self, app_context: AppContext, monitoring_writer: MonitoringWriter) -> None:
        self._app_context = app_context
        self._monitoring_writer = monitoring_writer
        self._stopped = asyncio.Event()
        self.exit_code: int | None = None

    def is_set(self) -> bool:
        return self._stopped.is_set()

    async def stop(self, payload: dict[str, Any]) -> None:
        if self._stopped.is_set():
            return

        self._stopped.set()
        timeout_seconds = payload.get("timeout", 0)
        timeout_ms = 0

        if isinstance(timeout_seconds, (int, float)) and not isinstance(timeout_seconds, bool):
            timeout_ms = max(0, int(timeout_seconds * 1000))

        await perform_shutdown(
            self._app_context,
            self._monitoring_writer,
            {
                "timeout": timeout_ms,
                "canCallKeepalive": payload.get("canCallKeepalive", True),
            },
        )
        self.exit_code = 0


def _write_boot_error(message: str) -> None:
    sys.stderr.write(message + "\n")
    sys.stderr.flush()


def _configure_logging(log_writer: asyncio.StreamWriter, level_name: str) -> logging.Logger:
    level = getattr(logging, level_name.upper(), logging.INFO)
    handler = JsonLogHandler(log_writer)
    runtime_logger = logging.getLogger("runner_python.runtime")
    runtime_logger.handlers.clear()
    runtime_logger.addHandler(handler)
    runtime_logger.setLevel(level)
    runtime_logger.propagate = False
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return runtime_logger


def _maybe_await(result: Any):
    if inspect.isawaitable(result):
        return result
    return None


def _wrap_stop_handler(handler: Any):
    try:
        signature = inspect.signature(handler)
    except (TypeError, ValueError):
        signature = None

    positional_params = []
    has_varargs = False
    if signature is not None:
        for parameter in signature.parameters.values():
            if parameter.kind == inspect.Parameter.VAR_POSITIONAL:
                has_varargs = True
            if parameter.kind in (
                inspect.Parameter.POSITIONAL_ONLY,
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
            ):
                positional_params.append(parameter)

    async def wrapped(payload: dict[str, Any]) -> None:
        timeout_ms = payload.get("timeout", 0)
        timeout_seconds = 0.0
        if isinstance(timeout_ms, (int, float)) and not isinstance(timeout_ms, bool):
            timeout_seconds = timeout_ms / 1000

        normalized_payload = {
            "timeout": timeout_seconds,
            "canCallKeepalive": bool(payload.get("canCallKeepalive", True)),
        }

        if signature is not None and not has_varargs and len(positional_params) <= 1:
            result = handler(normalized_payload)
        else:
            result = handler(
                normalized_payload["timeout"],
                normalized_payload["canCallKeepalive"],
            )

        awaited = _maybe_await(result)
        if awaited is not None:
            await awaited

    return wrapped


def _build_sequence_context(
    monitoring_writer: MonitoringWriter,
    runtime_logger: logging.Logger,
    app_config: dict[str, Any],
    log_level: str,
) -> AppContext:
    app_context = AppContext()
    app_context.logger = runtime_logger
    app_context.logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    app_context.config.clear()
    app_context.config.update(app_config)
    app_context._app_config = app_context.config

    def emit(event_name: str, message: Any = "") -> None:
        monitoring_writer.write_frame(
            EVENT,
            {
                "eventName": event_name,
                "message": message,
            },
        )

    def set_stop_handler(handler: Any) -> None:
        app_context._stop_handlers.append(_wrap_stop_handler(handler))

    app_context.emit = emit  # type: ignore[assignment]
    app_context.set_stop_handler = set_stop_handler  # type: ignore[assignment]
    return app_context


def _build_control_context(shared_context: AppContext, control_logger: logging.Logger) -> AppContext:
    control_context = AppContext()
    control_context._emitter = shared_context._emitter
    control_context.config = shared_context.config
    control_context._app_config = shared_context._app_config
    control_context.logger = control_logger
    control_context._stop_handlers = []

    def emit(event_name: str, message: Any = "") -> None:
        shared_context._emitter.emit(event_name, message)

    control_context.emit = emit  # type: ignore[assignment]
    return control_context


def _get_input_content_type(sequence: SequenceModule) -> str:
    requires = getattr(sequence.module, "requires", None)
    if isinstance(requires, dict):
        content_type = requires.get("contentType")
        if isinstance(content_type, str) and content_type:
            return content_type
    return "text/plain"


def _build_input_stream(input_reader: asyncio.StreamReader, content_type: str) -> Stream:
    if content_type == "application/octet-stream":
        return Stream.read_from(input_reader, chunk_size=CHUNK_SIZE)

    stream = Stream.read_from(input_reader)

    return stream.decode("utf-8")


def _build_runtime_pangs(sequence: SequenceModule, result: Any) -> list[dict[str, str]]:
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


def _get_output_content_type(sequence: SequenceModule, result: Any) -> str:
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


async def _resolve_sequence_result(result: Any) -> Any:
    current = result
    while (
        inspect.isawaitable(current)
        and not inspect.isasyncgen(current)
        and not hasattr(current, "__aiter__")
    ):
        current = await current
    return current


def _as_output_stream(result: Any) -> Any:
    if result is None:
        return None
    if hasattr(result, "__aiter__"):
        return result
    return Stream.from_iterable([result])


async def _open_host_streams(host_channels: HostChannels):
    input_reader, input_writer = await asyncio.open_connection(sock=host_channels.input_sock)
    _output_reader, output_writer = await asyncio.open_connection(sock=host_channels.output_sock)
    _log_reader, log_writer = await asyncio.open_connection(sock=host_channels.log_sock)
    return input_reader, input_writer, output_writer, log_writer


async def _close_writer(writer: asyncio.StreamWriter | None) -> None:
    if writer is None:
        return
    writer.close()
    try:
        await writer.wait_closed()
    except Exception:
        pass


async def _run_sequence_output(
    result: Any,
    sequence: SequenceModule,
    output_writer: asyncio.StreamWriter,
    monitoring_writer: MonitoringWriter,
) -> None:
    resolved = await _resolve_sequence_result(result)
    output_stream = _as_output_stream(resolved)

    if output_stream is None:
        return

    content_type = _get_output_content_type(sequence, resolved)

    if content_type == "application/x-ndjson":
        async for item in output_stream:
            output_writer.write(json.dumps(item).encode("utf-8") + b"\n")
            await output_writer.drain()
        return

    await forward_output_stream(
        output_stream,
        output_writer,
        PangSuppressingMonitoringWriter(monitoring_writer),
        content_type=content_type,
    )


async def main() -> int:
    try:
        boot_config = load_boot_config(sys.argv)
    except SystemExit as exc:
        return int(exc.code or 0)
    except Exception as exc:
        _write_boot_error(f"Boot config error: {exc}")
        return 2

    try:
        streams = open_fd_streams()
        detach_stdout = getattr(streams.stdout, "detach", None)
        if callable(detach_stdout):
            with contextlib.suppress(Exception):
                _STDIO_GUARDS.append(detach_stdout())
        detach_stderr = getattr(streams.stderr, "detach", None)
        if callable(detach_stderr):
            with contextlib.suppress(Exception):
                _STDIO_GUARDS.append(detach_stderr())
        reconfigure_stdout = getattr(sys.stdout, "reconfigure", None)
        if callable(reconfigure_stdout):
            with contextlib.suppress(Exception):
                reconfigure_stdout(line_buffering=True, write_through=True)
        reconfigure_stderr = getattr(sys.stderr, "reconfigure", None)
        if callable(reconfigure_stderr):
            with contextlib.suppress(Exception):
                reconfigure_stderr(line_buffering=True, write_through=True)
    except Exception as exc:
        _write_boot_error(f"FD stream error: {exc}")
        return 2

    host_channels: HostChannels | None = None
    input_writer: asyncio.StreamWriter | None = None
    output_writer: asyncio.StreamWriter | None = None
    log_writer: asyncio.StreamWriter | None = None
    sequence: SequenceModule | None = None
    heartbeat_task: asyncio.Task[None] | None = None
    control_task: asyncio.Task[None] | None = None
    sequence_task: asyncio.Task[None] | None = None

    try:
        try:
            host_channels = await connect_host_channels(boot_config)
            input_reader, input_writer, output_writer, log_writer = await _open_host_streams(host_channels)
        except Exception as exc:
            _write_boot_error(f"Host channel error: {exc}")
            return 2

        runtime_logger = _configure_logging(log_writer, boot_config.logLevel)
        control_logger = logging.getLogger("runner_python.control")
        control_logger.handlers = runtime_logger.handlers.copy()
        control_logger.setLevel(runtime_logger.level)
        control_logger.propagate = False

        monitoring_writer = MonitoringWriter(streams.monitoring_out)
        handshake_writer = DeferredMonitoringWriter(monitoring_writer)
        control_decoder = LiveControlDecoder(streams)

        try:
            handshake_result = await perform_handshake(handshake_writer, control_decoder, boot_config)
        except Exception as exc:
            logger.error("Handshake error: %s", exc)
            return 2

        try:
            sequence = load_sequence(boot_config.sequencePath, boot_config.pythonPath)
        except SequenceLoadError as exc:
            logger.error("Sequence load error: %s", exc)
            return 1

        sequence_context = _build_sequence_context(
            monitoring_writer,
            runtime_logger,
            dict(handshake_result.appConfig),
            handshake_result.logLevel,
        )
        control_context = _build_control_context(sequence_context, control_logger)
        terminator = RuntimeTerminator(sequence_context, monitoring_writer)
        input_stream = _build_input_stream(input_reader, _get_input_content_type(sequence))

        monitoring_writer.write_frame(PANG, {"requires": "", "contentType": ""})

        try:
            raw_result = sequence.run(sequence_context, input_stream, *handshake_result.args)
        except Exception:
            handshake_writer.flush()
            with contextlib.suppress(Exception):
                sys.stdout.flush()
            with contextlib.suppress(Exception):
                sys.stderr.flush()
            traceback.print_exc()
            return 1

        for payload in _build_runtime_pangs(sequence, raw_result):
            monitoring_writer.write_frame(PANG, payload)

        handshake_writer.flush()

        control_task = asyncio.create_task(control_loop(control_decoder, control_context, terminator))
        heartbeat_task = asyncio.create_task(run_heartbeat(monitoring_writer, sequence_context))
        sequence_task = asyncio.create_task(
            _run_sequence_output(raw_result, sequence, output_writer, monitoring_writer)
        )

        active_tasks: set[asyncio.Task[Any]] = {control_task, sequence_task}

        while active_tasks:
            done, active_tasks = await asyncio.wait(
                active_tasks,
                return_when=asyncio.FIRST_COMPLETED,
            )

            if control_task in done:
                control_exception = control_task.exception()
                if isinstance(control_exception, HardKillSignal):
                    return 137
                if control_exception is not None:
                    raise control_exception
                if sequence_task.done() and terminator.exit_code is not None:
                    return terminator.exit_code

            if sequence_task in done:
                sequence_exception = sequence_task.exception()
                if sequence_exception is not None:
                    with contextlib.suppress(Exception):
                        sys.stdout.flush()
                    with contextlib.suppress(Exception):
                        sys.stderr.flush()
                    traceback.print_exception(sequence_exception)
                    return 1
                if terminator.is_set() and not control_task.done():
                    try:
                        await asyncio.wait_for(control_task, timeout=1)
                    except asyncio.TimeoutError:
                        pass
                    except HardKillSignal:
                        return 137
                    if control_task.done():
                        control_exception = control_task.exception()
                        if isinstance(control_exception, HardKillSignal):
                            return 137
                        if control_exception is not None:
                            raise control_exception
                return terminator.exit_code or 0

        return terminator.exit_code or 0
    except HardKillSignal:
        return 137
    finally:
        if sequence_task is not None and not sequence_task.done():
            sequence_task.cancel()
            try:
                await sequence_task
            except (asyncio.CancelledError, Exception):
                pass

        if control_task is not None and not control_task.done():
            control_task.cancel()
            try:
                await control_task
            except (asyncio.CancelledError, Exception):
                pass

        if heartbeat_task is not None:
            heartbeat_task.cancel()
            try:
                await heartbeat_task
            except (asyncio.CancelledError, Exception):
                pass

        if sequence is not None:
            sequence.cleanup()

        await _close_writer(input_writer)
        await _close_writer(output_writer)
        await _close_writer(log_writer)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
