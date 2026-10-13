"""Runtime-conformance tests for the hosted Python wrapper."""

from __future__ import annotations

import logging
import importlib
import asyncio

import pytest

from runner_python.app_context import AppContext
from runner_python.verser2_runtime import (
    PythonHubClient,
    PythonSequenceApiExposure,
    create_python_hub_v2_client,
)

runner_main = importlib.import_module("runner_python.__main__")


class RecordingBroker:
    def __init__(self) -> None:
        self.requests: list[dict] = []
        self.response = {"status": 200}

    async def request(self, **kwargs):
        self.requests.append(kwargs)
        return self.response


class RecordingJSONResponse:
    status = 200
    headers = {"content-type": "application/json"}
    request_id = "request-v2"

    async def json(self):
        return {"sequenceId": "sequence", "items": []}


class RecordingMonitoringWriter:
    def __init__(self) -> None:
        self.frames: list[tuple[int, object]] = []

    def write_frame(self, code, payload) -> None:
        self.frames.append((code, payload))


def test_health_details_and_structured_logs_are_observable(caplog) -> None:
    ctx = AppContext()
    ctx.set_health_check(lambda: {"healthy": False, "details": {"reason": "draining"}})

    with caplog.at_level(logging.INFO):
        ctx.logger.info("health changed", extra={"details": {"reason": "draining"}})

    assert ctx._health_check() == {
        "healthy": False,
        "details": {"reason": "draining"},
    }
    assert caplog.records[-1].message == "health changed"
    assert caplog.records[-1].details == {"reason": "draining"}


def test_lifecycle_and_scoped_events_remain_chainable() -> None:
    ctx = AppContext()
    received: list[object] = []

    ctx.add_stop_handler(lambda: received.append("stop"))
    ctx.add_kill_handler(lambda: received.append("kill"))
    ctx.on("space-event", lambda payload: received.append(payload))
    ctx.emit_to_space("space-event", {"scope": "space"})

    assert ctx.end() is ctx
    assert ctx.destroy(RuntimeError("boom")) is ctx
    assert received == [{"scope": "space"}]


async def test_end_requests_external_runtime_termination() -> None:
    writer = RecordingMonitoringWriter()
    ctx = runner_main._build_sequence_context(
        writer,
        logging.getLogger("conformance.lifecycle"),
        {},
        "INFO",
    )
    terminator = runner_main.RuntimeTerminator(ctx, writer)
    ctx.bind_terminator(lambda payload: asyncio.create_task(terminator.stop(payload)))

    assert ctx.end() is ctx
    await asyncio.sleep(0)
    await asyncio.sleep(0)

    assert terminator.is_set() is True
    assert terminator.exit_code == 0
    assert terminator.outcome == "ended"
    assert writer.frames[-1] == (3006, {"outcome": "ended"})
    assert any(code == 3006 for code, _payload in writer.frames)


async def test_destroy_requests_external_runtime_termination() -> None:
    writer = RecordingMonitoringWriter()
    ctx = runner_main._build_sequence_context(
        writer,
        logging.getLogger("conformance.destroy"),
        {},
        "INFO",
    )
    terminator = runner_main.RuntimeTerminator(ctx, writer)
    ctx.bind_terminator(lambda payload: asyncio.create_task(terminator.stop(payload)))

    assert ctx.destroy(RuntimeError("boom")) is ctx
    await asyncio.sleep(0)
    await asyncio.sleep(0)

    assert terminator.is_set() is True
    assert terminator.exit_code == 1
    assert terminator.outcome == "errored"
    terminal = writer.frames[-1]
    assert terminal[0] == 3006
    assert isinstance(terminal[1], dict)
    assert terminal[1]["outcome"] == "errored"
    assert terminal[1]["sequenceError"]["name"] == "RuntimeError"
    assert terminal[1]["sequenceError"]["message"] == "boom"


async def test_hosted_python_context_exposes_scoped_hub_and_space_transport_clients() -> (
    None
):
    broker = RecordingBroker()
    hub = PythonHubClient(broker, "hub.internal")
    space = hub.scoped("space.internal")
    ctx = runner_main._build_sequence_context(
        RecordingMonitoringWriter(),
        logging.getLogger("conformance"),
        {},
        "INFO",
        hub,
        space,
    )

    await ctx.hub.get("/status")
    await ctx.space.get("/hubs")

    assert broker.requests == [
        {
            "method": "GET",
            "url": "http://hub.internal/api/v1/status",
            "headers": None,
            "body": None,
        },
        {
            "method": "GET",
            "url": "http://space.internal/api/v2/hubs",
            "headers": None,
            "body": None,
        },
    ]


def test_hosted_python_context_exposes_sequence_api() -> None:
    exposure = PythonSequenceApiExposure()
    ctx = runner_main._build_sequence_context(
        RecordingMonitoringWriter(),
        logging.getLogger("conformance"),
        {},
        "INFO",
        api_exposure=exposure,
    )

    app = object()
    assert ctx.api.attach(app) is app
    assert exposure.app is app


async def test_hub_client_v2_view_is_injected_without_replacing_v1_or_space() -> None:
    broker = RecordingBroker()
    legacy_hub = PythonHubClient(broker, "hub.internal")
    v2_hub = create_python_hub_v2_client(legacy_hub)
    space = legacy_hub.scoped("space.internal")
    broker.response = RecordingJSONResponse()
    ctx = runner_main._build_sequence_context(
        RecordingMonitoringWriter(),
        logging.getLogger("conformance.v2"),
        {},
        "INFO",
        legacy_hub,
        space,
        hub_client_v2=v2_hub,
    )
    control_ctx = runner_main._build_control_context(
        ctx, logging.getLogger("conformance.v2.control")
    )

    assert ctx.hub is legacy_hub
    assert ctx.space is space
    assert ctx.hub_client() is v2_hub
    assert control_ctx.hub_client() is v2_hub
    response = await control_ctx.hub_client().sequence("sequence").manifest()
    assert response.status == 200
    assert response.body == {"sequenceId": "sequence", "items": []}
    assert broker.requests == [
        {
            "method": "GET",
            "url": "http://hub.internal/api/v2/sequences/sequence/manifest",
            "headers": None,
            "body": None,
        }
    ]


def test_context_hub_client_accessor_requires_an_injected_v2_view() -> None:
    ctx = runner_main._build_sequence_context(
        RecordingMonitoringWriter(), logging.getLogger("conformance.no-v2"), {}, "INFO"
    )
    with pytest.raises(RuntimeError, match="not configured"):
        ctx.hub_client()
