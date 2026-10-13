"""Instance manifest declaration API and its fd4 request/reply bridge."""

from __future__ import annotations

import asyncio
import math
import uuid
from typing import Any

MANIFEST_DECLARE = 3015
MANIFEST_RESULT = 4006


def _snapshot_json(value: Any, ancestors: set[int] | None = None) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("manifest contains a non-finite number")
        return value
    if ancestors is None:
        ancestors = set()
    identity = id(value)
    if identity in ancestors:
        raise ValueError("manifest contains a circular value")
    ancestors.add(identity)
    try:
        if isinstance(value, list):
            return [_snapshot_json(item, ancestors) for item in value]
        if isinstance(value, dict) and all(isinstance(key, str) for key in value):
            return {key: _snapshot_json(item, ancestors) for key, item in value.items()}
    finally:
        ancestors.remove(identity)
    raise ValueError("manifest must contain only JSON values")


def snapshot_declaration(declaration: Any) -> dict[str, Any]:
    snapshot = _snapshot_json(declaration)
    if not isinstance(snapshot, dict):
        raise ValueError("manifest declaration must be an object")
    allowed = {"input", "output", "rpc", "topics"}
    if any(key not in allowed for key in snapshot):
        raise ValueError("manifest declaration contains an unknown field")
    for field in ("input", "output"):
        if field in snapshot:
            _validate_endpoint(snapshot[field], field)
    if "rpc" in snapshot:
        if not isinstance(snapshot["rpc"], list):
            raise ValueError("manifest rpc must be an array")
        for index, rpc in enumerate(snapshot["rpc"]):
            if not isinstance(rpc, dict) or not isinstance(rpc.get("procedure"), str):
                raise ValueError(f"manifest rpc[{index}] requires a procedure string")
            _validate_schema_if_present(rpc, f"rpc[{index}]")
    if "topics" in snapshot:
        if not isinstance(snapshot["topics"], list):
            raise ValueError("manifest topics must be an array")
        for index, topic in enumerate(snapshot["topics"]):
            if not isinstance(topic, dict) or not isinstance(topic.get("name"), str):
                raise ValueError(f"manifest topics[{index}] requires a name string")
            if not isinstance(topic.get("direction"), str):
                raise ValueError(f"manifest topics[{index}] requires a direction string")
            _validate_schema_if_present(topic, f"topics[{index}]")
    return snapshot


def _validate_endpoint(value: Any, name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"manifest {name} must be an object")
    _validate_schema_if_present(value, name)


def _validate_schema_if_present(value: dict[str, Any], name: str) -> None:
    if "schema" in value and not isinstance(value["schema"], (dict, bool)):
        raise ValueError(f"manifest {name}.schema must be an object or boolean")


class ManifestDeclarationClient:
    def __init__(self, writer: Any) -> None:
        self._writer = writer
        self._pending: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._terminal_error: BaseException | None = None

    async def declare(self, declaration: Any) -> dict[str, Any]:
        if self._terminal_error is not None:
            raise EOFError("manifest control channel is closed") from self._terminal_error
        snapshot = snapshot_declaration(declaration)
        request_id = str(uuid.uuid4())
        future = asyncio.get_running_loop().create_future()
        self._pending[request_id] = future
        try:
            self._writer.write_frame(MANIFEST_DECLARE, {"requestId": request_id, "declaration": snapshot})
            return await future
        finally:
            self._pending.pop(request_id, None)

    def handle_result(self, payload: Any) -> bool:
        if not isinstance(payload, dict) or not isinstance(payload.get("requestId"), str):
            return False
        future = self._pending.get(payload["requestId"])
        if future is None or future.done():
            return True
        if payload.get("accepted") is True and isinstance(payload.get("receipt"), dict):
            future.set_result(payload["receipt"])
        elif payload.get("accepted") is False and isinstance(payload.get("error"), dict):
            error = payload["error"]
            future.set_exception(ValueError(str(error.get("message", "Manifest declaration rejected"))))
        else:
            future.set_exception(ValueError("Malformed manifest declaration result"))
        return True

    def reject_pending(self, error: BaseException) -> None:
        if self._terminal_error is None:
            self._terminal_error = error
        for future in self._pending.values():
            if not future.done():
                future.set_exception(EOFError("manifest control channel is closed"))


class ManifestSequenceAPI:
    """Sequence API available whether or not an ASGI exposure is configured."""

    def __init__(self, client: ManifestDeclarationClient, exposure: Any = None) -> None:
        self._exposure = exposure
        self.declare = client.declare

    @property
    def app(self) -> Any:
        return getattr(self._exposure, "app", None)

    @property
    def guest(self) -> Any:
        return getattr(self._exposure, "guest", None)

    def attach(self, app: Any) -> Any:
        if self._exposure is None:
            raise RuntimeError("ASGI exposure is not configured for this instance")
        return self._exposure.attach(app)

    def use(self, app: Any) -> Any:
        if self._exposure is None:
            raise RuntimeError("ASGI exposure is not configured for this instance")
        return self._exposure.use(app)
