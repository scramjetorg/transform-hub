"""AppContext mirroring the current python-runner AppContext semantics.

This is the user-facing object passed as ``self`` to sequence functions. It
exposes a minimal stable surface: stop handler registration, health check
override, an event emitter (backed by ``pyee``), and a ``keep_alive`` hook.

BPMux clients (hub/space) and localStorage are intentionally not implemented
here - those are Node-only features delegated through the outer runner.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

from pyee.asyncio import AsyncIOEventEmitter

logger = logging.getLogger(__name__)


class AppContext:
    """User-facing app context for a running Python sequence."""

    def __init__(self) -> None:
        self._emitter = AsyncIOEventEmitter()
        self._stop_handlers: list[Callable] = []
        self._health_check: Callable[[], dict] = lambda: {"healthy": True}
        self._keep_alive_timeout: int = 0
        self.config: dict[str, Any] = {}
        self._app_config = self.config
        self.logger = logging.getLogger("runner_python.app_context")
        self.logger.setLevel(logging.INFO)

    def set_stop_handler(self, handler: Callable) -> None:
        """Register a stop handler to be called on STOP control code."""
        self._stop_handlers.append(handler)

    def set_health_check(self, health_check: Callable[[], dict]) -> None:
        """Override the default health check function."""
        self._health_check = health_check

    def on(self, event_name: str, handler: Callable) -> None:
        """Register an event handler on the monitoring channel."""
        self._emitter.on(event_name, handler)

    def emit(self, event_name: str, message: Any = "") -> None:
        """Emit an event through the monitoring channel."""
        self._emitter.emit(event_name, message)

    async def keep_alive(self, timeout: int = 0) -> None:
        """Reset the stop timer with a new timeout in milliseconds."""
        self._keep_alive_timeout = timeout
