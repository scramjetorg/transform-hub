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
    """User-facing app context for a running Python sequence.

    Provides Node-style lifecycle API with snake_case methods:
    - Stop/kill/monitoring handler registration
    - Event emitter (on/emit/emit_to_space)
    - keep_alive, end, destroy lifecycle hooks
    - describe/save state helpers
    - Fields: config, instance_id, logger, api, hub, initial_state, local_storage
    """

    def __init__(self) -> None:
        self._emitter = AsyncIOEventEmitter()
        self._stop_handlers: list[Callable] = []
        self._health_check: Callable[[], dict] = lambda: {"healthy": True}
        self._keep_alive_timeout: int = 0
        self._kill_handlers: list[Callable] = []
        self._monitoring_handlers: list[Callable] = []
        self._ended: bool = False
        self._destroyed: bool = False
        self._destroy_error: BaseException | None = None
        self._last_definition: Any = None
        self._last_saved_state: Any = None

        # Public fields
        self.config: dict[str, Any] = {}
        self._app_config = self.config
        self.instance_id: str | None = None
        self.hub: Any | None = None
        self.api: Any | None = None
        self.initial_state: Any = None
        self.local_storage: None = None
        self.logger = logging.getLogger("runner_python.app_context")
        self.logger.setLevel(logging.INFO)

    # --- Stop handlers ---

    def set_stop_handler(self, handler: Callable) -> "AppContext":
        """Register a stop handler to be called on STOP control code.

        Legacy alias - identical behavior to ``add_stop_handler``.
        """
        self._stop_handlers.append(handler)
        return self

    def add_stop_handler(self, handler: Callable) -> "AppContext":
        """Register a stop handler (Node-style alias for ``set_stop_handler``)."""
        self._stop_handlers.append(handler)
        return self

    # --- Kill handlers ---

    def add_kill_handler(self, handler: Callable) -> "AppContext":
        """Register a kill handler called before hard-kill signal."""
        self._kill_handlers.append(handler)
        return self

    # --- Monitoring / health ---

    def set_health_check(self, health_check: Callable[[], dict]) -> "AppContext":
        """Override the default health check function.

        Legacy alias - adapted to populate ``_monitoring_handlers`` so
        heartbeat composition works uniformly. Clears any prior monitoring
        handlers and registers ``health_check`` as the sole handler.
        """
        self._health_check = health_check
        self._monitoring_handlers.clear()
        self._monitoring_handlers.append(health_check)
        return self

    def add_monitoring_handler(self, handler: Callable) -> "AppContext":
        """Register a monitoring/health handler for heartbeat payload composition.

        Each handler is called every heartbeat cycle; results are merged in
        registration order (bool → ``{"healthy": <bool>}``, dict → shallow merge).
        """
        self._monitoring_handlers.append(handler)
        return self

    # --- Events ---

    def on(self, event_name: str, handler: Callable) -> "AppContext":
        """Register an event handler on the monitoring channel."""
        self._emitter.on(event_name, handler)
        return self

    def emit(self, event_name: str, message: Any = "") -> "AppContext":
        """Emit an event through the monitoring channel."""
        self._emitter.emit(event_name, message)
        return self

    def emit_to_space(self, event_name: str, message: Any = "") -> "AppContext":
        """Emit an event to the space.

        Currently maps to the same local event path as ``emit``. The space
        protocol distinction is deferred; this may be wired to a hub/space
        channel in a future phase.
        """
        self._emitter.emit(event_name, message)
        return self

    # --- Lifecycle ---

    async def keep_alive(self, timeout: int = 0, *, milliseconds: int = 0) -> "AppContext":
        """Reset the stop timer with a new timeout in milliseconds.

        Accepts ``timeout`` (positional, legacy compat) or ``milliseconds``
        (keyword-only, Node-style). When both are provided ``milliseconds``
        takes precedence.
        """
        effective = milliseconds if milliseconds else timeout
        self._keep_alive_timeout = effective
        return self

    def end(self) -> "AppContext":
        """Mark the context as ended.

        Externally compatible lifecycle stop/end hook. Sets internal ended
        state. Wiring to ``RuntimeTerminator`` is deferred but safe to call
        from sequence code; consumers may check ``_ended``.
        """
        self._ended = True
        return self

    def destroy(self, error: BaseException | None = None) -> "AppContext":
        """Mark the context as destroyed with an optional error.

        Records destroyed/error state. If wired to ``RuntimeTerminator`` in
        a future phase the terminator would check ``_destroyed`` /
        ``_destroy_error``.
        """
        self._destroyed = True
        self._destroy_error = error
        return self

    # --- Describe / Save ---

    def describe(self, definition: Any) -> "AppContext":
        """Store the sequence definition locally.

        The definition is retained in ``_last_definition``. The current
        protocol does not forward descriptions to the host; this is a
        local-only store for user introspection.
        """
        self._last_definition = definition
        return self

    def save(self, state: Any) -> "AppContext":
        """Store the sequence state locally.

        The state is retained in ``_last_saved_state``. The current
        protocol does not persist state externally; this is a local-only
        store for user introspection.
        """
        self._last_saved_state = state
        return self
