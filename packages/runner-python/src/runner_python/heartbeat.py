"""Monitoring heartbeat loop for the fd5 monitoring stream.

Emits a MONITORING frame on a steady cadence (default 1s) using composed
monitoring handler results as the payload. Monitoring handlers are registered
via ``add_monitoring_handler()`` or the legacy ``set_health_check()``. The
loop is cancelled by cancelling the surrounding asyncio task.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
from typing import Any

logger = logging.getLogger(__name__)

MONITORING = 3001


async def _resolve_health(app_context: Any) -> dict:
    """Compose monitoring handler results into a health payload.

    Behaviour:
    - Starts with an empty payload.
    - Iterates over ``_monitoring_handlers`` in registration order.
    - Awaits each handler result if it is awaitable.
    - ``bool`` results are wrapped into ``{"healthy": <bool>}``.
    - ``dict`` results are shallow-merged into the accumulating payload.
    - If no handler contributed a ``healthy`` key, ``{"healthy": True}`` is
      used as the fallback.
    """
    handlers = getattr(app_context, "_monitoring_handlers", None)
    if not handlers:
        # No monitoring handlers registered → stable default.
        return {"healthy": True}

    payload: dict[str, Any] = {}
    for handler in handlers:
        result = handler()

        if inspect.isawaitable(result):
            result = await result

        if isinstance(result, bool):
            payload["healthy"] = result
        elif isinstance(result, dict):
            payload.update(result)

    if "healthy" not in payload:
        payload["healthy"] = True

    return payload


async def run_heartbeat(
    monitoring_writer: Any,
    app_context: Any,
    interval: float = 1.0,
) -> None:
    """Emit a MONITORING frame every ``interval`` seconds until cancelled.

    The first frame is emitted ``interval`` seconds after this coroutine
    starts (i.e. after the handshake completes and the loop is scheduled).
    Cancellation propagates via ``asyncio.CancelledError`` and is re-raised
    so callers can ``await`` the task cleanly.
    """
    try:
        while True:
            await asyncio.sleep(interval)
            payload = await _resolve_health(app_context)
            try:
                monitoring_writer.write_frame(MONITORING, payload)
            except (BrokenPipeError, ConnectionResetError):
                # Shutdown may close the monitoring carrier before this task
                # is cancelled. There is nothing useful left to emit.
                return
    except asyncio.CancelledError:
        raise
