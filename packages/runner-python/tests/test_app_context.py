"""Tests for runner_python.app_context.AppContext.

Mirrors the public API of the current python-runner AppContext:
``set_stop_handler``, ``set_health_check``, ``on``, ``emit``, ``keep_alive``.
"""

from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
import importlib
import logging
from typing import Any

import pytest

from runner_python.app_context import AppContext

runner_main = importlib.import_module("runner_python.__main__")


class RecordingMonitoringWriter:
    def __init__(self) -> None:
        self.frames: list[tuple[int, Any]] = []

    def write_frame(self, code: int, payload: Any) -> None:
        self.frames.append((code, payload))


def test_default_health_check_returns_healthy_true() -> None:
    ctx = AppContext()

    assert ctx._health_check() == {"healthy": True}
    assert ctx.hub is None


def test_set_stop_handler_registers_handler() -> None:
    ctx = AppContext()

    def handler() -> None:
        pass

    ctx.set_stop_handler(handler)

    assert ctx._stop_handlers == [handler]


def test_set_stop_handler_appends_multiple() -> None:
    ctx = AppContext()
    calls: list[str] = []

    def h1() -> None:
        calls.append("h1")

    def h2() -> None:
        calls.append("h2")

    ctx.set_stop_handler(h1)
    ctx.set_stop_handler(h2)

    assert ctx._stop_handlers == [h1, h2]


def test_set_health_check_overrides_default() -> None:
    ctx = AppContext()

    def custom() -> dict:
        return {"healthy": False, "reason": "draining"}

    ctx.set_health_check(custom)

    assert ctx._health_check() == {"healthy": False, "reason": "draining"}


def test_on_registers_handler_on_emitter() -> None:
    ctx = AppContext()
    received: list[Any] = []

    def handler(payload: Any) -> None:
        received.append(payload)

    ctx.on("ping", handler)
    ctx._emitter.emit("ping", "pong")

    assert received == ["pong"]


def test_emit_invokes_handlers_in_registration_order() -> None:
    ctx = AppContext()
    order: list[str] = []

    ctx.on("evt", lambda _data: order.append("first"))
    ctx.on("evt", lambda _data: order.append("second"))
    ctx.on("evt", lambda _data: order.append("third"))

    ctx.emit("evt", {"value": 1})

    assert order == ["first", "second", "third"]


def test_emit_passes_message_payload_to_handlers() -> None:
    ctx = AppContext()
    seen: list[Any] = []

    ctx.on("data", lambda payload: seen.append(payload))

    ctx.emit("data", {"x": 42})

    assert seen == [{"x": 42}]


def test_emit_defaults_message_to_empty_string() -> None:
    ctx = AppContext()
    seen: list[Any] = []

    ctx.on("tick", lambda payload: seen.append(payload))

    ctx.emit("tick")

    assert seen == [""]


@pytest.mark.asyncio
async def test_keep_alive_records_timeout() -> None:
    ctx = AppContext()

    assert ctx._keep_alive_timeout == 0

    await ctx.keep_alive(500)

    assert ctx._keep_alive_timeout == 500


@pytest.mark.asyncio
async def test_keep_alive_resets_stop_timer_with_mock_clock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify keep_alive(ms) updates the stop timeout; clock is mocked
    so the test does not actually sleep."""

    ctx = AppContext()
    slept_for: list[float] = []

    async def fake_sleep(delay: float) -> None:
        slept_for.append(delay)

    # Mock clock - patch asyncio.sleep on the module under test in case
    # the implementation evolves to use it for the stop timer.
    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    await ctx.keep_alive(0)
    assert ctx._keep_alive_timeout == 0

    await ctx.keep_alive(1500)
    assert ctx._keep_alive_timeout == 1500

    # Calling again resets the timer to the new value.
    await ctx.keep_alive(250)
    assert ctx._keep_alive_timeout == 250


def test_public_api_matches_current_python_runner() -> None:
    """Lock the public surface against the current python-runner AppContext."""

    expected = {
        "set_stop_handler", "set_health_check", "on", "emit", "keep_alive",
        "add_stop_handler", "add_kill_handler", "add_monitoring_handler",
        "end", "destroy", "emit_to_space", "describe", "save",
    }

    public = {name for name in dir(AppContext) if not name.startswith("_")}

    assert expected.issubset(public)


# --- New Node-style API parity tests ---

def test_add_stop_handler_registers_handler() -> None:
    ctx = AppContext()

    def handler() -> None:
        pass

    assert ctx.add_stop_handler(handler) is ctx

    assert handler in ctx._stop_handlers
    # Same internal list as set_stop_handler
    assert ctx._stop_handlers == [handler]


def test_add_stop_handler_appends_multiple() -> None:
    ctx = AppContext()
    calls: list[str] = []

    def h1() -> None:
        calls.append("h1")

    def h2() -> None:
        calls.append("h2")

    ctx.add_stop_handler(h1)
    ctx.add_stop_handler(h2)

    assert ctx._stop_handlers == [h1, h2]


def test_add_kill_handler_stores_handler() -> None:
    ctx = AppContext()

    def handler() -> None:
        pass

    assert ctx.add_kill_handler(handler) is ctx

    assert ctx._kill_handlers == [handler]


def test_add_kill_handler_appends_multiple() -> None:
    ctx = AppContext()
    order: list[str] = []

    def h1() -> None:
        order.append("h1")

    def h2() -> None:
        order.append("h2")

    ctx.add_kill_handler(h1)
    ctx.add_kill_handler(h2)

    assert ctx._kill_handlers == [h1, h2]
    assert len(ctx._kill_handlers) == 2


def test_add_monitoring_handler_stores_handler() -> None:
    ctx = AppContext()

    def handler() -> dict:
        return {"healthy": True}

    assert ctx.add_monitoring_handler(handler) is ctx

    assert ctx._monitoring_handlers == [handler]


def test_add_monitoring_handler_appends_multiple() -> None:
    ctx = AppContext()
    handlers = [lambda: {"a": 1}, lambda: {"b": 2}]

    for h in handlers:
        ctx.add_monitoring_handler(h)

    assert len(ctx._monitoring_handlers) == 2


def test_set_health_check_populates_monitoring_handlers() -> None:
    """Legacy set_health_check should also populate monitoring handlers."""
    ctx = AppContext()

    def custom() -> dict:
        return {"healthy": False, "reason": "draining"}

    ctx.set_health_check(custom)

    # Must also be in monitoring handlers (adapted path)
    assert custom in ctx._monitoring_handlers
    assert ctx._monitoring_handlers == [custom]


def test_set_health_check_replaces_monitoring_handlers() -> None:
    """Calling set_health_check should clear prior monitoring handlers."""
    ctx = AppContext()

    ctx.add_monitoring_handler(lambda: {"a": 1})

    def replacement() -> dict:
        return {"healthy": True}

    ctx.set_health_check(replacement)

    assert ctx._monitoring_handlers == [replacement]


def test_end_marks_ended_state() -> None:
    ctx = AppContext()

    assert ctx._ended is False
    assert ctx.end() is ctx
    assert ctx._ended is True


def test_destroy_without_error() -> None:
    ctx = AppContext()

    assert ctx._destroyed is False
    assert ctx._destroy_error is None

    assert ctx.destroy() is ctx

    assert ctx._destroyed is True
    assert ctx._destroy_error is None


def test_destroy_with_error() -> None:
    ctx = AppContext()
    error = ValueError("something broke")

    ctx.destroy(error)

    assert ctx._destroyed is True
    assert ctx._destroy_error is error


def test_emit_to_space_invokes_emitter() -> None:
    ctx = AppContext()
    received: list[str] = []

    ctx.on("space-event", lambda payload: received.append(payload))

    assert ctx.emit_to_space("space-event", "hello-space") is ctx

    assert received == ["hello-space"]


def test_emit_to_space_defaults_message_to_empty_string() -> None:
    ctx = AppContext()
    received: list[str] = []

    ctx.on("tick", lambda payload: received.append(payload))

    ctx.emit_to_space("tick")

    assert received == [""]


def test_built_sequence_context_sets_instance_id() -> None:
    writer = RecordingMonitoringWriter()
    logger = logging.getLogger("test_built_sequence_context_sets_instance_id")

    ctx = runner_main._build_sequence_context(
        writer,
        logger,
        {"mode": "test"},
        "INFO",
        instance_id="instance-123",
    )

    assert ctx.instance_id == "instance-123"
    assert ctx.config == {"mode": "test"}


def test_built_sequence_context_emit_writes_host_scope_event() -> None:
    writer = RecordingMonitoringWriter()
    logger = logging.getLogger("test_built_sequence_context_emit")
    ctx = runner_main._build_sequence_context(writer, logger, {}, "INFO", instance_id="i")

    assert ctx.emit("done", {"ok": True}) is ctx

    assert writer.frames == [(5001, {"eventName": "done", "message": {"ok": True}})]


def test_built_sequence_context_emit_to_space_writes_space_scope_event() -> None:
    writer = RecordingMonitoringWriter()
    logger = logging.getLogger("test_built_sequence_context_emit_to_space")
    ctx = runner_main._build_sequence_context(writer, logger, {}, "INFO", instance_id="i")

    assert ctx.emit_to_space("broadcast", "payload") is ctx

    assert writer.frames == [
        (5001, {"eventName": "broadcast", "message": "payload", "scope": "space"})
    ]


def test_describe_stores_definition() -> None:
    ctx = AppContext()

    assert ctx._last_definition is None

    assert ctx.describe({"key": "value"}) is ctx

    assert ctx._last_definition == {"key": "value"}


def test_save_stores_state() -> None:
    ctx = AppContext()

    assert ctx._last_saved_state is None

    assert ctx.save({"counter": 42}) is ctx

    assert ctx._last_saved_state == {"counter": 42}


def test_initial_state_defaults_to_none() -> None:
    ctx = AppContext()

    assert ctx.initial_state is None


def test_local_storage_is_none() -> None:
    ctx = AppContext()

    assert ctx.local_storage is None


def test_instance_id_defaults_to_none() -> None:
    ctx = AppContext()

    assert ctx.instance_id is None


def test_instance_id_can_be_set_directly() -> None:
    ctx = AppContext()

    ctx.instance_id = "inst-123"

    assert ctx.instance_id == "inst-123"


@pytest.mark.asyncio
async def test_keep_alive_accepts_milliseconds_keyword() -> None:
    ctx = AppContext()

    await ctx.keep_alive(milliseconds=750)

    assert ctx._keep_alive_timeout == 750


@pytest.mark.asyncio
async def test_keep_alive_milliseconds_takes_precedence() -> None:
    """When both timeout and milliseconds are provided, milliseconds wins."""
    ctx = AppContext()

    await ctx.keep_alive(100, milliseconds=500)

    assert ctx._keep_alive_timeout == 500


@pytest.mark.asyncio
async def test_keep_alive_timeout_positional_still_works() -> None:
    ctx = AppContext()

    await ctx.keep_alive(300)

    assert ctx._keep_alive_timeout == 300
