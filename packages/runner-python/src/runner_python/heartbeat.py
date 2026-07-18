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
import json
import re
from typing import Any

logger = logging.getLogger(__name__)

MONITORING = 3001
_NAMESPACE = re.compile(r"^[a-z](?:[a-z0-9]|[._-][a-z0-9])*$")
_RESERVED = {"healthy", "details", "status", "scope", "components"}
_MAX_DETAILS_BYTES = 16_384


class HealthContractError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


async def _resolve_health(app_context: Any) -> dict:
    """Compose monitoring handler results into a health payload.

    Behaviour:
    - Starts with an empty payload.
    - Iterates over ``_monitoring_handlers`` in registration order.
    - Awaits each handler result if it is awaitable.
    - ``bool`` results are wrapped into ``{"healthy": <bool>}``.
    - ``dict`` results must contain ``healthy`` and optional namespaced
      ``details``; namespaces are merged in lexical order and validated.
    - If no handler contributed a ``healthy`` key, ``{"healthy": True}`` is
      used as the fallback.
    """
    handlers = getattr(app_context, "_monitoring_handlers", None)
    if not handlers:
        # No monitoring handlers registered → stable default.
        return {"healthy": True}

    payload: dict[str, Any] = {}
    details: dict[str, Any] = {}
    legacy = bool(getattr(app_context, "_legacy_health_mode", False))
    if legacy:
        legacy_details: dict[str, Any] = {}
        healthy = True
        for handler in handlers:
            result = handler()
            if inspect.isawaitable(result):
                result = await result
            if isinstance(result, bool):
                healthy = result
            elif isinstance(result, dict):
                if isinstance(result.get("healthy"), bool):
                    healthy = result["healthy"]
                for key, value in result.items():
                    if key != "healthy":
                        # Legacy fields remain available, but are namespaced
                        # so they cannot spoof host-owned monitoring fields.
                        legacy_details[key] = value
            else:
                raise HealthContractError(
                    "ERR_HEALTH_HANDLER_INVALID",
                    "legacy health check must return bool or object",
                )
        details["legacy"] = legacy_details
        healthy_payload = {"healthy": healthy, "details": details}
        _validate_details_size(details)
        return healthy_payload

    healthy = True
    for handler in handlers:
        result = handler()

        if inspect.isawaitable(result):
            result = await result

        if isinstance(result, bool):
            healthy = healthy and result
        elif isinstance(result, dict):
            if not isinstance(result.get("healthy"), bool):
                raise HealthContractError(
                    "ERR_HEALTH_DETAILS_INVALID",
                    "health handler output must contain healthy:boolean",
                )
            for key in result:
                if key not in {"healthy", "details"}:
                    code = (
                        "ERR_HEALTH_DETAILS_RESERVED_FIELD"
                        if key in _RESERVED
                        else "ERR_HEALTH_DETAILS_INVALID"
                    )
                    raise HealthContractError(
                        code, f"unsupported health top-level field: {key}"
                    )
            handler_details = result.get("details", {})
            if not isinstance(handler_details, dict):
                raise HealthContractError(
                    "ERR_HEALTH_DETAILS_INVALID", "health details must be an object"
                )
            for namespace in sorted(handler_details):
                if not _NAMESPACE.fullmatch(namespace):
                    raise HealthContractError(
                        "ERR_HEALTH_DETAILS_INVALID",
                        f"invalid health namespace: {namespace}",
                    )
                if namespace in _RESERVED:
                    raise HealthContractError(
                        "ERR_HEALTH_DETAILS_RESERVED_FIELD",
                        f"reserved health field: {namespace}",
                    )
                if namespace in details:
                    raise HealthContractError(
                        "ERR_HEALTH_DETAILS_DUPLICATE_NAMESPACE",
                        f"duplicate health namespace: {namespace}",
                    )
                details[namespace] = handler_details[namespace]
            healthy = healthy and result["healthy"]
        else:
            raise HealthContractError(
                "ERR_HEALTH_DETAILS_INVALID",
                "health handler output must be bool or object",
            )

    _validate_details_size(details)
    payload["healthy"] = healthy
    payload["details"] = {key: details[key] for key in sorted(details)}
    return payload


def _validate_details_size(details: dict[str, Any]) -> None:
    try:
        encoded = json.dumps(
            details, ensure_ascii=False, separators=(",", ":"), allow_nan=False
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise HealthContractError(
            "ERR_HEALTH_DETAILS_SERIALIZATION",
            f"health details are not serializable: {str(error)[:160]}",
        ) from error
    if len(encoded) > _MAX_DETAILS_BYTES:
        raise HealthContractError(
            "ERR_HEALTH_DETAILS_TOO_LARGE", "health details exceed 16384 UTF-8 bytes"
        )


def _error_payload(error: Exception) -> dict[str, Any]:
    code = getattr(error, "code", None)
    if not isinstance(code, str) or not code:
        code = "ERR_HEALTH_HANDLER"
    return {
        "healthy": False,
        "error": {"code": code, "message": str(error)[:256]},
    }


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
            try:
                payload = await _resolve_health(app_context)
            except Exception as error:
                # Handler and validation failures are data on the monitoring
                # channel, not task-fatal errors. CancelledError remains
                # untouched (it is a BaseException), and carrier close below
                # still terminates the loop normally.
                payload = _error_payload(error)
            try:
                monitoring_writer.write_frame(MONITORING, payload)
            except (
                BrokenPipeError,
                ConnectionResetError,
                OSError,
                RuntimeError,
                ValueError,
            ):
                # Shutdown may close the monitoring carrier before this task
                # is cancelled. There is nothing useful left to emit.
                return
    except asyncio.CancelledError:
        raise
