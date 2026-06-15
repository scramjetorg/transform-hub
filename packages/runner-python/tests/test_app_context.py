"""Tests for runner_python.app_context.AppContext.

Mirrors the public API of the current python-runner AppContext:
``set_stop_handler``, ``set_health_check``, ``on``, ``emit``, ``keep_alive``.
"""

from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
from typing import Any

import pytest

from runner_python.app_context import AppContext


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

    expected = {"set_stop_handler", "set_health_check", "on", "emit", "keep_alive"}

    public = {name for name in dir(AppContext) if not name.startswith("_")}

    assert expected.issubset(public)
