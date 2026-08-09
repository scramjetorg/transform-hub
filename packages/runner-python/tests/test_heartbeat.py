from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
import time

import pytest

from runner_python.app_context import AppContext
from runner_python.heartbeat import (
    MONITORING,
    HealthContractError,
    _resolve_health,
    run_heartbeat,
)
from runner_python.monitoring_codec import encode_monitoring_frame


class RecordingWriter:
    """Captures (code, payload, monotonic_timestamp) for each write_frame call."""

    def __init__(self) -> None:
        self.frames: list[tuple[int, object, float]] = []

    def write_frame(self, code: int, payload: object) -> None:
        self.frames.append((code, payload, time.monotonic()))


class ClosedWriter:
    def __init__(self, error: type[OSError]) -> None:
        self.error = error

    def write_frame(self, _code: int, _payload: object) -> None:
        raise self.error("monitoring carrier closed")


@pytest.mark.asyncio
async def test_detailed_health_merges_namespaces_and_validates_duplicates():
    context = AppContext()
    context.add_monitoring_handler(
        lambda: {"healthy": True, "details": {"zeta": {"load": 1}}}
    )
    context.add_monitoring_handler(
        lambda: {"healthy": False, "details": {"alpha": {"load": 2}}}
    )
    assert await _resolve_health(context) == {
        "healthy": False,
        "details": {"alpha": {"load": 2}, "zeta": {"load": 1}},
    }

    duplicate = AppContext()
    duplicate.add_monitoring_handler(lambda: {"healthy": True, "details": {"site": {}}})
    duplicate.add_monitoring_handler(lambda: {"healthy": True, "details": {"site": {}}})
    with pytest.raises(HealthContractError) as error:
        await _resolve_health(duplicate)
    assert error.value.code == "ERR_HEALTH_DETAILS_DUPLICATE_NAMESPACE"


@pytest.mark.asyncio
async def test_malformed_health_is_bounded_and_classified():
    context = AppContext()
    context.add_monitoring_handler(lambda: {"healthy": True, "status": "spoofed"})
    with pytest.raises(HealthContractError) as error:
        await _resolve_health(context)
    assert error.value.code == "ERR_HEALTH_DETAILS_RESERVED_FIELD"

    encoded = encode_monitoring_frame(3001, {"details": {"value": object()}})
    assert len(encoded) < 512
    assert b"ERR_MONITORING_SERIALIZATION" in encoded


@pytest.mark.asyncio
async def test_handler_exception_becomes_classified_frame_and_heartbeat_continues():
    writer = RecordingWriter()
    context = AppContext()
    calls = 0

    def handler():
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("handler exploded")
        return True

    context.add_monitoring_handler(handler)
    task = asyncio.create_task(run_heartbeat(writer, context, interval=0.01))
    await asyncio.sleep(0.035)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert writer.frames[0][1] == {
        "healthy": False,
        "error": {"code": "ERR_HEALTH_HANDLER", "message": "handler exploded"},
    }
    assert any(
        payload == {"healthy": True, "details": {}}
        for _, payload, _ in writer.frames[1:]
    )


@pytest.mark.asyncio
async def test_first_heartbeat_emitted_after_interval_real_time_smoke():
    writer = RecordingWriter()
    app_context = AppContext()

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.2))
    start = time.monotonic()

    # Before the first interval elapses there must be no frames.
    await asyncio.sleep(0.1)
    assert writer.frames == []

    # Wait until just after the first interval.
    await asyncio.sleep(0.2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    code, payload, ts = writer.frames[0]
    assert code == MONITORING
    assert payload == {"healthy": True}
    # The first frame fires approximately one interval after start.
    assert ts - start >= 0.18


@pytest.mark.asyncio
async def test_cadence_emits_five_frames_after_five_requested_intervals():
    """Cadence is defined by requested sleeps, not wall-clock scheduling."""
    writer = RecordingWriter()
    app_context = AppContext()
    requested_intervals: list[float] = []

    async def sleeper(interval: float) -> None:
        requested_intervals.append(interval)
        # Stop before a sixth frame; the first five calls model five elapsed
        # heartbeat intervals without waiting for wall-clock time.
        if len(requested_intervals) == 6:
            raise asyncio.CancelledError

    with pytest.raises(asyncio.CancelledError):
        await run_heartbeat(writer, app_context, interval=1.0, sleeper=sleeper)

    assert requested_intervals[:5] == [1.0] * 5
    assert len(requested_intervals) == 6  # Sixth sleep starts the next cycle.
    assert [frame[0] for frame in writer.frames] == [MONITORING] * 5
    assert [frame[1] for frame in writer.frames] == [{"healthy": True}] * 5


@pytest.mark.asyncio
async def test_cancellation_stops_loop_within_200ms():
    writer = RecordingWriter()
    app_context = AppContext()

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=1.0))
    # Let the loop enter the sleep.
    await asyncio.sleep(0.05)

    cancel_start = time.monotonic()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    elapsed = time.monotonic() - cancel_start

    assert elapsed < 0.2, f"cancellation took {elapsed:.3f}s, expected <200ms"
    # No frame should have been emitted within the first 50ms.
    assert writer.frames == []


@pytest.mark.parametrize("error", [BrokenPipeError, ConnectionResetError])
@pytest.mark.asyncio
async def test_closed_monitoring_carrier_stops_heartbeat_cleanly(error):
    task = asyncio.create_task(
        run_heartbeat(ClosedWriter(error), AppContext(), interval=0)
    )

    await asyncio.wait_for(task, timeout=0.2)
    assert task.exception() is None


@pytest.mark.asyncio
async def test_payload_contains_health_check_result_dict():
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: {"healthy": False, "reason": "down"})

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    code, payload, _ = writer.frames[0]
    assert code == MONITORING
    assert payload == {"healthy": False, "details": {"legacy": {"reason": "down"}}}


@pytest.mark.asyncio
async def test_payload_wraps_bool_health_check_result():
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: False)

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False, "details": {"legacy": {}}}


@pytest.mark.asyncio
async def test_async_health_check_is_awaited():
    writer = RecordingWriter()
    app_context = AppContext()

    async def async_health():
        await asyncio.sleep(0)
        return {"healthy": True, "async": True}

    app_context.set_health_check(async_health)

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True, "details": {"legacy": {"async": True}}}


@pytest.mark.asyncio
async def test_default_interval_is_one_second():
    """Sanity: default keyword argument must remain 1.0s."""
    import inspect as _inspect

    sig = _inspect.signature(run_heartbeat)
    assert sig.parameters["interval"].default == 1.0
    assert sig.parameters["sleeper"].default is asyncio.sleep


# --- Monitoring handler composition tests ---


@pytest.mark.asyncio
async def test_monitoring_handler_payload_composition():
    """Single monolithic handler returning dict should be used as payload."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.add_monitoring_handler(lambda: {"healthy": True, "load": 0.5})

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload["healthy"] is False
    assert payload["error"]["code"] == "ERR_HEALTH_DETAILS_INVALID"


@pytest.mark.asyncio
async def test_async_monitoring_handler_is_awaited():
    """Async monitoring handlers should be awaited and their result merged."""
    writer = RecordingWriter()
    app_context = AppContext()

    async def async_mon():
        await asyncio.sleep(0)
        return {"healthy": True, "async": True}

    app_context.add_monitoring_handler(async_mon)

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload["healthy"] is False
    assert payload["error"]["code"] == "ERR_HEALTH_DETAILS_INVALID"


@pytest.mark.asyncio
async def test_bool_monitoring_handler_result():
    """Bool monitoring handler result should be wrapped to {'healthy': bool}."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.add_monitoring_handler(lambda: False)

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False, "details": {}}


@pytest.mark.asyncio
async def test_multiple_monitoring_handlers_merge():
    """Multiple handlers should merge in registration order."""
    writer = RecordingWriter()
    app_context = AppContext()

    app_context.add_monitoring_handler(lambda: {"healthy": True, "load": 0.3})
    app_context.add_monitoring_handler(lambda: {"load": 0.8, "cpu": 50})

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload["healthy"] is False
    assert payload["error"]["code"] == "ERR_HEALTH_DETAILS_INVALID"


@pytest.mark.asyncio
async def test_legacy_set_health_check_still_works():
    """Existing set_health_check must produce the same heartbeat payload."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: {"healthy": False, "reason": "draining"})

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False, "details": {"legacy": {"reason": "draining"}}}


@pytest.mark.asyncio
async def test_no_monitoring_handlers_falls_back_to_default():
    """Without handlers, heartbeat should emit default {'healthy': True}."""
    writer = RecordingWriter()
    app_context = AppContext()
    # Ensure no handlers and no overridden _health_check
    app_context._monitoring_handlers.clear()

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True}


@pytest.mark.asyncio
async def test_existing_health_check_tests_pass():
    """Regression: all existing set_health_check test scenarios still pass
    via the adapted monitoring-handler path."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: {"healthy": True, "custom": "ok"})

    task = asyncio.create_task(run_heartbeat(writer, app_context, interval=0.1))
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True, "details": {"legacy": {"custom": "ok"}}}
