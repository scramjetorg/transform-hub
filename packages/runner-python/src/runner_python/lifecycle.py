from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Any

from runner_python.utils import maybe_await

logger = logging.getLogger(__name__)

SEQUENCE_STOPPED = 3006


class _KeepAliveState:
    def __init__(self, deadline: float) -> None:
        self.deadline = deadline
        self.deferred = False
        self.updated = asyncio.Event()

    def extend(self, loop: asyncio.AbstractEventLoop, timeout_ms: int) -> None:
        now = loop.time()
        if now >= self.deadline:
            return

        new_deadline = now + (max(0, timeout_ms) / 1000.0)
        if new_deadline <= self.deadline:
            return

        self.deadline = new_deadline
        self.deferred = True
        self.updated.set()


def _normalize_stop_payload(stop_payload: dict[str, Any]) -> tuple[dict[str, Any], int, bool]:
    payload = dict(stop_payload)

    if "timeout" not in payload:
        payload["timeout"] = 5000
    if "canCallKeepalive" not in payload:
        payload["canCallKeepalive"] = True

    try:
        timeout_ms = max(0, int(payload["timeout"]))
    except (TypeError, ValueError):
        timeout_ms = 5000

    return payload, timeout_ms, bool(payload["canCallKeepalive"])


async def _run_stop_handler(handler: Any, stop_payload: dict[str, Any]) -> None:
    try:
        await maybe_await(handler(dict(stop_payload)))
    except Exception as exc:
        logger.error("Stop handler error: %s", exc)


async def _wait_for_shutdown_window(
    tasks: list[asyncio.Task[None]],
    state: _KeepAliveState,
    loop: asyncio.AbstractEventLoop,
) -> None:
    while True:
        pending = [task for task in tasks if not task.done()]
        now = loop.time()

        if not pending and (not state.deferred or now >= state.deadline):
            return

        if pending and now >= state.deadline:
            return

        timeout = max(0.0, state.deadline - now)
        if timeout == 0:
            return

        state_waiter = asyncio.create_task(state.updated.wait())
        waiters: set[asyncio.Task[Any]] = set(pending)
        waiters.add(state_waiter)

        done, _pending = await asyncio.wait(
            waiters,
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )

        if state_waiter in done:
            state.updated.clear()
        else:
            state_waiter.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await state_waiter

        if not done:
            return


async def _wait_for_task_or_deadline(
    task: asyncio.Task[None],
    state: _KeepAliveState,
    loop: asyncio.AbstractEventLoop,
) -> None:
    while not task.done():
        now = loop.time()
        if now >= state.deadline:
            return

        timeout = max(0.0, state.deadline - now)
        if timeout == 0:
            return

        state_waiter = asyncio.create_task(state.updated.wait())
        done, _pending = await asyncio.wait(
            {task, state_waiter},
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )

        if state_waiter in done:
            state.updated.clear()
        else:
            state_waiter.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await state_waiter

        if not done:
            return


async def perform_shutdown(
    app_context: Any,
    monitoring_writer: Any,
    stop_payload: dict[str, Any],
) -> None:
    payload, timeout_ms, can_call_keepalive = _normalize_stop_payload(stop_payload)
    loop = asyncio.get_running_loop()
    state = _KeepAliveState(loop.time() + (timeout_ms / 1000.0))

    original_keep_alive = getattr(app_context, "keep_alive", None)
    restore_keep_alive = hasattr(app_context, "keep_alive")

    async def tracked_keep_alive(timeout: int = 0, *, milliseconds: int = 0) -> Any:
        effective_timeout = milliseconds if milliseconds else timeout
        result = None
        if callable(original_keep_alive):
            result = await maybe_await(original_keep_alive(timeout, milliseconds=milliseconds))

        if can_call_keepalive:
            try:
                keep_alive_timeout = int(effective_timeout)
            except (TypeError, ValueError):
                keep_alive_timeout = 0

            state.extend(loop, keep_alive_timeout)

        return result

    setattr(app_context, "keep_alive", tracked_keep_alive)

    try:
        tasks: list[asyncio.Task[None]] = []
        for handler in list(getattr(app_context, "_stop_handlers", [])):
            task = asyncio.create_task(_run_stop_handler(handler, payload))
            tasks.append(task)
            await _wait_for_task_or_deadline(task, state, loop)

        await _wait_for_shutdown_window(tasks, state, loop)
    finally:
        if restore_keep_alive:
            setattr(app_context, "keep_alive", original_keep_alive)
        else:
            delattr(app_context, "keep_alive")

    monitoring_writer.write_frame(SEQUENCE_STOPPED, {})
