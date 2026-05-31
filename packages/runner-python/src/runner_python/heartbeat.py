"""Monitoring heartbeat loop for the fd5 monitoring stream.

Emits a MONITORING frame on a steady cadence (default 1s) using the result
of ``app_context._health_check`` as the payload. The loop is cancelled by
cancelling the surrounding asyncio task.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
from typing import Any

logger = logging.getLogger(__name__)

MONITORING = 3001


async def _resolve_health(app_context: Any) -> dict:
    """Call the AppContext health check, awaiting it if it is a coroutine.

    Normalises bare ``bool`` results into ``{"healthy": <bool>}`` so the
    payload always matches the Node serializer shape.
    """
    health_check = app_context._health_check
    result = health_check()

    if inspect.isawaitable(result):
        result = await result

    if isinstance(result, bool):
        return {"healthy": result}

    return result


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
            monitoring_writer.write_frame(MONITORING, payload)
    except asyncio.CancelledError:
        raise
