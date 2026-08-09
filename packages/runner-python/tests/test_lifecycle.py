from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
import base64
import json
from pathlib import Path
from typing import Any

import pytest

from runner_python.app_context import AppContext
from runner_python.lifecycle import SEQUENCE_STOPPED, perform_shutdown


EVENT = 5001
FIXTURE_ROOT = Path(__file__).parent / "parity" / "fixtures"


class RecordingMonitoringWriter:
    def __init__(self, timeline: list[tuple[Any, ...]] | None = None) -> None:
        self.frames: list[tuple[int, Any]] = []
        self.timeline = timeline

    def write_frame(self, code: int, payload: Any) -> None:
        self.frames.append((code, payload))
        if self.timeline is not None:
            self.timeline.append(("monitoring", code, payload))


class ResetMonitoringWriter:
    def __init__(self, error: type[OSError]) -> None:
        self.error = error

    def write_frame(self, _code: int, _payload: Any) -> None:
        raise self.error("monitoring carrier closed")


class RecordingTextStream:
    def __init__(self, label: str, timeline: list[tuple[Any, ...]]) -> None:
        self.label = label
        self.timeline = timeline

    def write(self, data: str) -> None:
        self.timeline.append((self.label, data))


def load_recorded_monitoring_codes(scenario: str) -> list[int]:
    recorded = json.loads(
        (FIXTURE_ROOT / scenario / "recorded.json").read_text(encoding="utf-8")
    )

    return [
        json.loads(base64.b64decode(entry["bytes_b64"]).decode("utf-8"))[0]
        for entry in recorded["channels"]["MONITORING"]
        if entry["direction"] == "host-recv"
    ]


def make_app_context() -> AppContext:
    return AppContext()


@pytest.mark.asyncio
async def test_perform_shutdown_delivers_stop_payload_to_handler_unchanged() -> None:
    ctx = make_app_context()
    seen: list[dict[str, Any]] = []
    writer = RecordingMonitoringWriter()

    async def on_stop(payload: dict[str, Any]) -> None:
        seen.append(payload)

    ctx.set_stop_handler(on_stop)

    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 5000, "canCallKeepalive": True},
    )

    assert seen == [{"timeout": 5000, "canCallKeepalive": True}]
    assert writer.frames[-1] == (SEQUENCE_STOPPED, {})


@pytest.mark.parametrize("error", [BrokenPipeError, ConnectionResetError])
@pytest.mark.asyncio
async def test_perform_shutdown_tolerates_closed_monitoring_carrier(error) -> None:
    await perform_shutdown(
        AppContext(), ResetMonitoringWriter(error), {"timeout": 0}
    )


@pytest.mark.asyncio
async def test_perform_shutdown_keep_alive_within_timeout_defers_sequence_stopped() -> None:
    ctx = make_app_context()
    writer = RecordingMonitoringWriter()

    async def on_stop(_payload: dict[str, Any]) -> None:
        await asyncio.sleep(0.005)
        await ctx.keep_alive(50)

    ctx.set_stop_handler(on_stop)

    start = asyncio.get_running_loop().time()
    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 20, "canCallKeepalive": True},
    )
    elapsed = asyncio.get_running_loop().time() - start

    assert elapsed >= 0.04
    assert ctx._keep_alive_timeout == 50
    assert writer.frames == [(SEQUENCE_STOPPED, {})]


@pytest.mark.asyncio
async def test_perform_shutdown_keep_alive_accepts_milliseconds_keyword() -> None:
    ctx = make_app_context()
    writer = RecordingMonitoringWriter()

    async def on_stop(_payload: dict[str, Any]) -> None:
        await asyncio.sleep(0.005)
        await ctx.keep_alive(milliseconds=50)

    ctx.add_stop_handler(on_stop)

    start = asyncio.get_running_loop().time()
    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 20, "canCallKeepalive": True},
    )
    elapsed = asyncio.get_running_loop().time() - start

    assert elapsed >= 0.04
    assert ctx._keep_alive_timeout == 50
    assert writer.frames == [(SEQUENCE_STOPPED, {})]


@pytest.mark.asyncio
async def test_perform_shutdown_emits_sequence_stopped_at_timeout_without_cancelling_handler() -> None:
    ctx = make_app_context()
    writer = RecordingMonitoringWriter()
    started = asyncio.Event()
    finished = asyncio.Event()
    cancelled = False

    async def on_stop(_payload: dict[str, Any]) -> None:
        nonlocal cancelled
        started.set()
        try:
            await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            cancelled = True
            raise
        finally:
            finished.set()

    ctx.set_stop_handler(on_stop)

    start = asyncio.get_running_loop().time()
    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 20, "canCallKeepalive": True},
    )
    elapsed = asyncio.get_running_loop().time() - start

    assert started.is_set()
    assert elapsed >= 0.015
    assert writer.frames == [(SEQUENCE_STOPPED, {})]

    await asyncio.wait_for(finished.wait(), timeout=0.2)

    assert cancelled is False


@pytest.mark.asyncio
async def test_perform_shutdown_runs_multiple_handlers_before_sequence_stopped() -> None:
    ctx = make_app_context()
    timeline: list[tuple[Any, ...]] = []
    writer = RecordingMonitoringWriter(timeline)
    first_started = asyncio.Event()

    async def first_handler(_payload: dict[str, Any]) -> None:
        timeline.append(("handler", "first"))
        first_started.set()

    async def second_handler(_payload: dict[str, Any]) -> None:
        await first_started.wait()
        timeline.append(("handler", "second"))

    ctx.set_stop_handler(first_handler)
    ctx.set_stop_handler(second_handler)

    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 20, "canCallKeepalive": False},
    )

    assert timeline == [
        ("handler", "first"),
        ("handler", "second"),
        ("monitoring", SEQUENCE_STOPPED, {}),
    ]


@pytest.mark.asyncio
async def test_perform_shutdown_starts_handlers_in_registration_order() -> None:
    ctx = make_app_context()
    writer = RecordingMonitoringWriter()
    order: list[str] = []
    release_first = asyncio.Event()
    second_started = asyncio.Event()

    async def first_handler(_payload: dict[str, Any]) -> None:
        order.append("first-start")
        await release_first.wait()
        order.append("first-end")

    async def second_handler(_payload: dict[str, Any]) -> None:
        order.append("second-start")
        second_started.set()

    ctx.set_stop_handler(first_handler)
    ctx.set_stop_handler(second_handler)

    shutdown_task = asyncio.create_task(
        perform_shutdown(
            ctx,
            writer,
            {"timeout": 50, "canCallKeepalive": False},
        )
    )

    await asyncio.sleep(0.005)

    assert order == ["first-start"]
    assert second_started.is_set() is False

    release_first.set()
    await shutdown_task

    assert order == ["first-start", "first-end", "second-start"]
    assert writer.frames[-1] == (SEQUENCE_STOPPED, {})


@pytest.mark.asyncio
async def test_stdout_and_stderr_written_during_stop_are_forwarded_before_sequence_stopped() -> None:
    ctx = make_app_context()
    timeline: list[tuple[Any, ...]] = []
    writer = RecordingMonitoringWriter(timeline)
    stdout = RecordingTextStream("stdout", timeline)
    stderr = RecordingTextStream("stderr", timeline)

    async def on_stop(_payload: dict[str, Any]) -> None:
        stdout.write("stdout-before-stop")
        stderr.write("stderr-before-stop")

    ctx.set_stop_handler(on_stop)

    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 20, "canCallKeepalive": False},
    )

    assert timeline == [
        ("stdout", "stdout-before-stop"),
        ("stderr", "stderr-before-stop"),
        ("monitoring", SEQUENCE_STOPPED, {}),
    ]


@pytest.mark.asyncio
async def test_stop_handler_lifecycle_order_matches_recorded_fixture() -> None:
    ctx = make_app_context()
    writer = RecordingMonitoringWriter()
    recorded_codes = load_recorded_monitoring_codes("stop-handler")
    expected_tail = recorded_codes[-2:]

    async def on_stop(payload: dict[str, Any]) -> None:
        writer.write_frame(
            EVENT,
            {
                "eventName": "stop-handler-ran",
                "message": {
                    "timeout": payload["timeout"],
                    "canCallKeepalive": payload["canCallKeepalive"],
                },
            },
        )

    ctx.set_stop_handler(on_stop)

    await perform_shutdown(
        ctx,
        writer,
        {"timeout": 500, "canCallKeepalive": False},
    )

    assert [code for code, _payload in writer.frames] == expected_tail
