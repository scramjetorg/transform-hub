from __future__ import annotations

# pyright: reportMissingImports=false

import asyncio
import time

import pytest

from runner_python.app_context import AppContext
from runner_python.heartbeat import MONITORING, run_heartbeat


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
async def test_first_heartbeat_emitted_after_interval():
    writer = RecordingWriter()
    app_context = AppContext()

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.2)
    )
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
async def test_cadence_five_frames_under_100ms_drift_per_frame():
    """5 frames over 5s with <100ms drift per frame."""
    writer = RecordingWriter()
    app_context = AppContext()

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=1.0)
    )
    start = time.monotonic()

    # Wait until 5 frames have arrived (or timeout safety net at 6.5s).
    deadline = start + 6.5
    while len(writer.frames) < 5 and time.monotonic() < deadline:
        await asyncio.sleep(0.05)

    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 5, (
        f"expected at least 5 frames, got {len(writer.frames)}"
    )

    # Each frame i (1-indexed) should land near start + i*1.0s within 100ms.
    for i in range(5):
        expected = start + (i + 1) * 1.0
        actual = writer.frames[i][2]
        drift = abs(actual - expected)
        assert drift < 0.1, (
            f"frame {i + 1} drift {drift:.3f}s exceeds 100ms "
            f"(expected ~{expected:.3f}, got {actual:.3f})"
        )


@pytest.mark.asyncio
async def test_cancellation_stops_loop_within_200ms():
    writer = RecordingWriter()
    app_context = AppContext()

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=1.0)
    )
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

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    code, payload, _ = writer.frames[0]
    assert code == MONITORING
    assert payload == {"healthy": False, "reason": "down"}


@pytest.mark.asyncio
async def test_payload_wraps_bool_health_check_result():
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: False)

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False}


@pytest.mark.asyncio
async def test_async_health_check_is_awaited():
    writer = RecordingWriter()
    app_context = AppContext()

    async def async_health():
        await asyncio.sleep(0)
        return {"healthy": True, "async": True}

    app_context.set_health_check(async_health)

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True, "async": True}


@pytest.mark.asyncio
async def test_default_interval_is_one_second():
    """Sanity: default keyword argument must remain 1.0s."""
    import inspect as _inspect

    sig = _inspect.signature(run_heartbeat)
    assert sig.parameters["interval"].default == 1.0


# --- Monitoring handler composition tests ---

@pytest.mark.asyncio
async def test_monitoring_handler_payload_composition():
    """Single monolithic handler returning dict should be used as payload."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.add_monitoring_handler(lambda: {"healthy": True, "load": 0.5})

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True, "load": 0.5}


@pytest.mark.asyncio
async def test_async_monitoring_handler_is_awaited():
    """Async monitoring handlers should be awaited and their result merged."""
    writer = RecordingWriter()
    app_context = AppContext()

    async def async_mon():
        await asyncio.sleep(0)
        return {"healthy": True, "async": True}

    app_context.add_monitoring_handler(async_mon)

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": True, "async": True}


@pytest.mark.asyncio
async def test_bool_monitoring_handler_result():
    """Bool monitoring handler result should be wrapped to {'healthy': bool}."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.add_monitoring_handler(lambda: False)

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False}


@pytest.mark.asyncio
async def test_multiple_monitoring_handlers_merge():
    """Multiple handlers should merge in registration order."""
    writer = RecordingWriter()
    app_context = AppContext()

    app_context.add_monitoring_handler(lambda: {"healthy": True, "load": 0.3})
    app_context.add_monitoring_handler(lambda: {"load": 0.8, "cpu": 50})

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    # Second handler overwrites load, adds cpu
    assert payload == {"healthy": True, "load": 0.8, "cpu": 50}


@pytest.mark.asyncio
async def test_legacy_set_health_check_still_works():
    """Existing set_health_check must produce the same heartbeat payload."""
    writer = RecordingWriter()
    app_context = AppContext()
    app_context.set_health_check(lambda: {"healthy": False, "reason": "draining"})

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    assert payload == {"healthy": False, "reason": "draining"}


@pytest.mark.asyncio
async def test_no_monitoring_handlers_falls_back_to_default():
    """Without handlers, heartbeat should emit default {'healthy': True}."""
    writer = RecordingWriter()
    app_context = AppContext()
    # Ensure no handlers and no overridden _health_check
    app_context._monitoring_handlers.clear()

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
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

    task = asyncio.create_task(
        run_heartbeat(writer, app_context, interval=0.1)
    )
    await asyncio.sleep(0.15)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

    assert len(writer.frames) >= 1
    _, payload, _ = writer.frames[0]
    # Full dict from the health check is returned, not just {"healthy": True}
    assert payload == {"healthy": True, "custom": "ok"}
