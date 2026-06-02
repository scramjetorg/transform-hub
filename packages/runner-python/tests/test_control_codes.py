from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
import base64
import json
import logging
import time
from pathlib import Path
from typing import Any

import pytest

from runner_python.app_context import AppContext
from runner_python.control_codec import ControlFrameDecoder
from runner_python.control_loop import (
    EVENT,
    KILL,
    SET,
    STOP,
    HardKillSignal,
    control_loop,
)


FIXTURE_ROOT = Path(__file__).parent / "parity" / "fixtures"


def encode_control_line(code: int, payload: Any) -> bytes:
    return json.dumps([code, payload], separators=(",", ":")).encode("utf-8")


class ScriptedControlDecoder(ControlFrameDecoder):
    def __init__(self, lines: list[bytes], sleep_when_empty: float = 0.0) -> None:
        super().__init__()
        self._lines = list(lines)
        self._sleep_when_empty = sleep_when_empty

    def readline_crlf(self) -> bytes:
        if not self._lines:
            if self._sleep_when_empty:
                time.sleep(self._sleep_when_empty)
            raise EOFError("control stream closed")

        return self._lines.pop(0)


class RecordingTerminator:
    def __init__(self) -> None:
        self._stop_requested = False
        self.stop_calls: list[dict[str, Any]] = []

    def is_set(self) -> bool:
        return self._stop_requested

    async def stop(self, payload: dict[str, Any]) -> None:
        self.stop_calls.append(payload)


def make_app_context() -> AppContext:
    app_context = AppContext()
    app_context.config.clear()
    app_context.logger.setLevel(logging.INFO)
    return app_context


def load_recorded_control_lines(scenario: str) -> list[bytes]:
    recorded = json.loads((FIXTURE_ROOT / scenario / "recorded.json").read_text(encoding="utf-8"))

    return [
        base64.b64decode(entry["bytes_b64"]).rstrip(b"\r\n")
        for entry in recorded["channels"]["CONTROL"]
        if entry["direction"] == "host-send"
    ]


@pytest.mark.asyncio
async def test_set_updates_app_context_config() -> None:
    app_context = make_app_context()

    await control_loop(
        ScriptedControlDecoder(
            [encode_control_line(SET, {"appConfig": {"mode": "debug", "retries": 2}})]
        ),
        app_context,
        RecordingTerminator(),
    )

    assert app_context.config == {"mode": "debug", "retries": 2}


@pytest.mark.asyncio
async def test_set_updates_logger_level_without_polluting_config() -> None:
    app_context = make_app_context()

    await control_loop(
        ScriptedControlDecoder([encode_control_line(SET, {"logLevel": "DEBUG"})]),
        app_context,
        RecordingTerminator(),
    )

    assert app_context.config == {}
    assert app_context.logger.getEffectiveLevel() == logging.DEBUG


@pytest.mark.asyncio
async def test_kill_raises_hard_kill_signal_immediately() -> None:
    app_context = make_app_context()

    with pytest.raises(HardKillSignal, match="killed"):
        await control_loop(
            ScriptedControlDecoder(
                [
                    encode_control_line(KILL, {}),
                    encode_control_line(SET, {"appConfig": {"mode": "ignored"}}),
                ]
            ),
            app_context,
            RecordingTerminator(),
        )

    assert app_context.config == {}


@pytest.mark.asyncio
async def test_stop_invokes_registered_handlers_with_payload() -> None:
    app_context = make_app_context()
    seen: list[dict[str, Any]] = []

    async def on_stop(payload: dict[str, Any]) -> None:
        seen.append(payload)

    app_context.set_stop_handler(on_stop)

    await control_loop(
        ScriptedControlDecoder(
            [encode_control_line(STOP, {"timeout": 500, "canCallKeepalive": False})]
        ),
        app_context,
        RecordingTerminator(),
    )

    assert seen == [{"timeout": 0.5, "canCallKeepalive": False}]


@pytest.mark.asyncio
async def test_stop_uses_terminator_when_no_handlers_are_registered() -> None:
    terminator = RecordingTerminator()

    await control_loop(
        ScriptedControlDecoder(
            [encode_control_line(STOP, {"timeout": 250, "canCallKeepalive": True})]
        ),
        make_app_context(),
        terminator,
    )

    assert terminator.stop_calls == [{"timeout": 0.25, "canCallKeepalive": True}]


@pytest.mark.asyncio
async def test_event_dispatches_via_app_context_emit() -> None:
    app_context = make_app_context()
    seen: list[Any] = []

    app_context.on("echo", lambda payload: seen.append(payload))

    await control_loop(
        ScriptedControlDecoder(
            [encode_control_line(EVENT, {"eventName": "echo", "message": {"text": "from-host"}})]
        ),
        app_context,
        RecordingTerminator(),
    )

    assert seen == [{"text": "from-host"}]


@pytest.mark.asyncio
async def test_event_without_message_dispatches_none_for_parity() -> None:
    app_context = make_app_context()
    seen: list[Any] = []

    app_context.on("tick", lambda payload: seen.append(payload))

    await control_loop(
        ScriptedControlDecoder([encode_control_line(EVENT, {"eventName": "tick"})]),
        app_context,
        RecordingTerminator(),
    )

    assert seen == [None]


@pytest.mark.asyncio
async def test_unknown_control_code_logs_structured_warning_and_continues(
    caplog: pytest.LogCaptureFixture,
) -> None:
    app_context = make_app_context()
    seen: list[Any] = []
    caplog.set_level(logging.WARNING)

    app_context.on("echo", lambda payload: seen.append(payload))

    await control_loop(
        ScriptedControlDecoder(
            [
                encode_control_line(9999, {"raw": True}),
                encode_control_line(EVENT, {"eventName": "echo", "message": "ok"}),
            ]
        ),
        app_context,
        RecordingTerminator(),
    )

    assert seen == ["ok"]
    assert len(caplog.records) == 1
    assert caplog.records[0].message == "Ignoring unknown control code"
    assert getattr(caplog.records[0], "code") == 9999
    assert getattr(caplog.records[0], "payload") == {"raw": True}


@pytest.mark.asyncio
async def test_stop_payload_matches_recorded_fixture_timeout_and_keepalive_fields() -> None:
    app_context = make_app_context()
    seen: list[dict[str, Any]] = []

    app_context.set_stop_handler(lambda payload: seen.append(payload))

    await control_loop(
        ScriptedControlDecoder(load_recorded_control_lines("stop-handler")[1:]),
        app_context,
        RecordingTerminator(),
    )

    assert seen == [{"timeout": 0.5, "canCallKeepalive": False}]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "scenario,expected_event,expected_stop,expect_kill",
    [
        ("control-set", None, None, False),
        ("control-kill", None, None, True),
        ("event-emit-receive", {"text": "from-host"}, None, False),
        ("stop-handler", None, {"timeout": 0.5, "canCallKeepalive": False}, False),
    ],
)
async def test_parity_replay_control_frames_match_recorded_behaviour(
    scenario: str,
    expected_event: dict[str, Any] | None,
    expected_stop: dict[str, Any] | None,
    expect_kill: bool,
    caplog: pytest.LogCaptureFixture,
) -> None:
    app_context = make_app_context()
    stop_calls: list[dict[str, Any]] = []
    events: list[Any] = []
    caplog.set_level(logging.WARNING)

    app_context.set_stop_handler(lambda payload: stop_calls.append(payload))
    app_context.on("echo", lambda payload: events.append(payload))

    if expect_kill:
        with pytest.raises(HardKillSignal):
            await control_loop(
                ScriptedControlDecoder(load_recorded_control_lines(scenario)),
                app_context,
                RecordingTerminator(),
            )
    else:
        await control_loop(
            ScriptedControlDecoder(load_recorded_control_lines(scenario)),
            app_context,
            RecordingTerminator(),
        )

    warning_codes = [
        getattr(record, "code")
        for record in caplog.records
        if record.message == "Ignoring unknown control code"
    ]

    assert warning_codes == [4000]

    if expected_event is not None:
        assert events == [expected_event]

    if expected_stop is not None:
        assert stop_calls == [expected_stop]
