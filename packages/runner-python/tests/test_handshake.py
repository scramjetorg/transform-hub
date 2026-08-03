from __future__ import annotations

# pyright: reportMissingImports=false

import base64
import io
import json
import time
from pathlib import Path
from typing import Any

import pytest

from runner_python.boot_config import BootConfig
from runner_python.control_codec import ControlFrameDecoder
from runner_python.handshake import (
    HandshakeError,
    HandshakeResult,
    HandshakeTimeoutError,
    perform_handshake,
)
from runner_python.monitoring_codec import MonitoringWriter


PING = 3000
PONG = 4000
MONITORING = 3001
GOLDEN_FIXTURE = (
    Path(__file__).parent / "parity" / "fixtures" / "happy-path" / "recorded.json"
)


def make_boot_config(**overrides: Any) -> BootConfig:
    payload = {
        "sequencePath": "/tmp/sequence.py",
        "instanceId": "capture-happy-path",
        "instancesServerPort": 13000,
        "instancesServerHost": "127.0.0.1",
        "sequenceInfo": {"id": "happy-path"},
    }
    payload.update(overrides)
    return BootConfig(**payload)


def encode_control_line(code: int, payload: Any) -> bytes:
    return json.dumps([code, payload], separators=(",", ":")).encode("utf-8")


def load_golden_ping_bytes() -> bytes:
    recorded = json.loads(GOLDEN_FIXTURE.read_text(encoding="utf-8"))
    return base64.b64decode(recorded["channels"]["MONITORING"][0]["bytes_b64"])


def normalize_ping_bytes(frame_bytes: bytes) -> bytes:
    code, payload = json.loads(frame_bytes)
    payload["payload"]["system"]["processPID"] = "<pid>"
    normalized = json.dumps([code, payload], separators=(",", ":"), ensure_ascii=False)
    return normalized.encode("utf-8") + b"\r\n"


class RecordingMonitoringWriter:
    def __init__(self, event_log: list[tuple[str, float]]) -> None:
        self.event_log = event_log
        self.frames: list[tuple[int, Any]] = []
        self._stream = io.BytesIO()
        self._writer = MonitoringWriter(self._stream)

    def write_frame(self, code: int, payload: Any) -> None:
        self.event_log.append((f"monitoring:{code}", time.monotonic()))
        self.frames.append((code, payload))
        self._writer.write_frame(code, payload)

    @property
    def raw_frames(self) -> list[bytes]:
        return self._stream.getvalue().splitlines(keepends=True)


class ScriptedControlDecoder(ControlFrameDecoder):
    def __init__(
        self,
        lines: list[bytes],
        event_log: list[tuple[str, float]],
        sleep_when_empty: float = 0.05,
        sleep_before_return: float = 0.0,
    ) -> None:
        super().__init__()
        self._lines = list(lines)
        self._event_log = event_log
        self._sleep_when_empty = sleep_when_empty
        self._sleep_before_return = sleep_before_return

    def readline_crlf(self) -> bytes:
        if not self._lines:
            time.sleep(self._sleep_when_empty)
            raise EOFError("control stream closed before handshake frame arrived")

        line = self._lines.pop(0)
        self._event_log.append(("control-read", time.monotonic()))

        if self._sleep_before_return:
            time.sleep(self._sleep_before_return)

        return line


@pytest.mark.asyncio
async def test_handshake_sends_ping_matching_golden_fixture_bytes() -> None:
    event_log: list[tuple[str, float]] = []
    writer = RecordingMonitoringWriter(event_log)
    control_decoder = ScriptedControlDecoder(
        [encode_control_line(PONG, {"appConfig": {}, "args": [], "logLevel": "INFO"})],
        event_log,
    )

    result = await perform_handshake(writer, control_decoder, make_boot_config())

    assert result == HandshakeResult(appConfig={}, args=[], logLevel="INFO")
    assert [code for code, _ in writer.frames] == [PING, MONITORING]

    ping_code, ping_payload = json.loads(writer.raw_frames[0])
    assert ping_code == PING
    assert ping_payload["id"] == "capture-happy-path"
    assert ping_payload["sequenceInfo"] == {"id": "happy-path"}
    assert isinstance(ping_payload["payload"]["system"]["processPID"], str)
    assert ping_payload["payload"]["system"]["processPID"].isdigit()

    assert normalize_ping_bytes(writer.raw_frames[0]) == normalize_ping_bytes(
        load_golden_ping_bytes()
    )


@pytest.mark.asyncio
async def test_handshake_succeeds_with_lf_terminated_pong() -> None:
    event_log: list[tuple[str, float]] = []
    writer = RecordingMonitoringWriter(event_log)
    control_decoder = ScriptedControlDecoder(
        [
            encode_control_line(PONG, {"appConfig": {}, "args": [], "logLevel": "INFO"})
            + b"\n"
        ],
        event_log,
    )

    result = await perform_handshake(writer, control_decoder, make_boot_config())

    assert result == HandshakeResult(appConfig={}, args=[], logLevel="INFO")
    assert [code for code, _ in writer.frames] == [PING, MONITORING]


@pytest.mark.asyncio
async def test_handshake_forwards_topic_rename_fields() -> None:
    writer = RecordingMonitoringWriter([])
    control_decoder = ScriptedControlDecoder(
        [encode_control_line(PONG, {"appConfig": {}, "args": [], "logLevel": "INFO"})],
        [],
    )

    await perform_handshake(
        writer,
        control_decoder,
        make_boot_config(inputTopic="names-in", outputTopic="names-out"),
    )

    _code, ping_payload = writer.frames[0]

    assert ping_payload["payload"]["inputTopic"] == "names-in"
    assert ping_payload["payload"]["outputTopic"] == "names-out"


@pytest.mark.asyncio
async def test_pong_normalizes_app_config_args_and_log_level() -> None:
    writer = RecordingMonitoringWriter([])
    control_decoder = ScriptedControlDecoder(
        [encode_control_line(PONG, {"appConfig": {"mode": "test"}})],
        [],
    )

    result = await perform_handshake(writer, control_decoder, make_boot_config())

    assert result == HandshakeResult(
        appConfig={"mode": "test"},
        args=[],
        logLevel="INFO",
    )


@pytest.mark.asyncio
async def test_first_monitoring_frame_is_emitted_only_after_pong() -> None:
    event_log: list[tuple[str, float]] = []
    writer = RecordingMonitoringWriter(event_log)
    control_decoder = ScriptedControlDecoder(
        [encode_control_line(PONG, {"appConfig": {}, "args": []})],
        event_log,
        sleep_before_return=0.001,
    )

    await perform_handshake(writer, control_decoder, make_boot_config())

    assert [name for name, _ in event_log] == [
        "monitoring:3000",
        "control-read",
        "monitoring:3001",
    ]

    pong_received_at = next(ts for name, ts in event_log if name == "control-read")
    first_healthy_at = next(ts for name, ts in event_log if name == "monitoring:3001")

    assert first_healthy_at > pong_received_at


@pytest.mark.asyncio
async def test_handshake_timeout_raises_named_error() -> None:
    writer = RecordingMonitoringWriter([])
    control_decoder = ScriptedControlDecoder([], [], sleep_when_empty=0.05)

    with pytest.raises(HandshakeTimeoutError, match="PONG"):
        await perform_handshake(
            writer,
            control_decoder,
            make_boot_config(),
            timeout=0.01,
        )

    assert [code for code, _ in writer.frames] == [PING]


@pytest.mark.asyncio
async def test_malformed_pong_is_rejected_with_structured_error() -> None:
    writer = RecordingMonitoringWriter([])
    control_decoder = ScriptedControlDecoder(
        [encode_control_line(PONG, {"appConfig": {}, "args": "not-a-list"})],
        [],
    )

    with pytest.raises(HandshakeError, match="args"):
        await perform_handshake(writer, control_decoder, make_boot_config())

    assert [code for code, _ in writer.frames] == [PING]
