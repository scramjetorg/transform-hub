"""Hosted Python producer for the instance runtime-manifest BDD feature."""

from __future__ import annotations

import asyncio
import json
import math
import os
import sys
from typing import Any


def _required_config(context: Any) -> dict[str, Any]:
    config = context.config
    run_id = config.get("runId")
    variant = config.get("variant")
    version = config.get("version")
    publish = config.get("publish", True)

    if not isinstance(run_id, str) or not run_id:
        raise ValueError("runtime manifest producer requires the received runId config")
    if variant not in ("string", "object"):
        raise ValueError("runtime manifest producer requires variant 'string' or 'object'")
    if isinstance(version, bool) or not isinstance(version, (int, float)) or not math.isfinite(version):
        raise ValueError("runtime manifest producer requires a finite numeric version config")
    if not isinstance(publish, bool):
        raise ValueError("runtime manifest producer publish config must be boolean when provided")

    return {"runId": run_id, "variant": variant, "version": version, "publish": publish}


def _declaration_for(state: dict[str, Any]) -> dict[str, Any]:
    extension = {
        "x-runtime-manifest": {
            "runId": state["runId"],
            "variant": state["variant"],
            "version": state["version"],
        }
    }
    if state["variant"] == "string":
        output_schema = {"type": "string", **extension}
        media_type = "text/plain"
        description = "A string result"
    else:
        output_schema = {
            "type": "object",
            "properties": {"value": {"type": "string"}},
            "required": ["value"],
            **extension,
        }
        media_type = "application/json"
        description = "An object result"

    return {
        "input": {
            "description": "One JSON input record",
            "mediaType": "application/json",
            "schema": {
                "type": "object",
                "properties": {"value": {"type": "string"}},
                "x-input-extension": {"owner": "runtime-manifest-fixture"},
            },
        },
        "output": {"description": description, "mediaType": media_type, "schema": output_schema},
        "rpc": [
            {
                "procedure": "math/add",
                "description": "Add two numeric inputs",
                "contractIdentity": "bdd.math.add.v1",
                "request": {
                    "type": "array",
                    "prefixItems": [{"type": "number"}, {"type": "number"}],
                    "minItems": 2,
                    "maxItems": 2,
                },
                "response": {
                    "type": "object",
                    "properties": {"total": {"type": "number"}},
                    "required": ["total"],
                },
            }
        ],
        "topics": [
            {
                "name": "runtime-manifest-status",
                "direction": "output",
                "description": "A descriptive status topic",
                "mediaType": "application/json",
                "schema": {"type": "object", "properties": {"status": {"type": "string"}}},
            }
        ],
    }


def _provenance() -> dict[str, Any]:
    import runner_python.app_context as app_context_module
    import runner_python.manifest as manifest_module
    import runner_python.verser2_runtime as verser2_runtime_module

    guest_module = sys.modules.get("verser2_guest_python")
    main_module = sys.modules.get("__main__")
    return {
        "pid": os.getpid(),
        "ppid": os.getppid(),
        "scriptPath": getattr(main_module, "__file__", None),
        "execPath": sys.executable,
        "productModulePaths": {
            "__main__": getattr(main_module, "__file__", None),
            "runner_python.app_context": getattr(app_context_module, "__file__", None),
            "runner_python.manifest": getattr(manifest_module, "__file__", None),
            "runner_python.verser2_runtime": getattr(verser2_runtime_module, "__file__", None),
            "verser2_guest_python": getattr(guest_module, "__file__", None),
        },
    }


def _error_info(error: BaseException) -> dict[str, str]:
    return {"code": str(getattr(error, "code", type(error).__name__)), "message": str(error)}


def _parse_action(payload: Any) -> dict[str, Any]:
    action = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(action, dict):
        raise ValueError("runtime manifest action must be a JSON object")
    return action


async def initialize(context: Any) -> None:
    state = _required_config(context)
    state["finished"] = asyncio.Event()
    context._runtime_manifest_producer_state = state
    _install_action_handler(context, state)
    receipt = None
    if state["publish"]:
        receipt = await context.api.declare(_declaration_for(state))
    context.emit(
        "runtime-manifest-initialized",
        {"runId": state["runId"], "receipt": receipt, "provenance": _provenance()},
    )


def _install_action_handler(context: Any, state: dict[str, Any]) -> None:
    async def handle_action(payload: Any) -> None:
        action: dict[str, Any] | None = None
        try:
            action = _parse_action(payload)
            if action.get("runId") != state["runId"]:
                raise ValueError("runtime manifest action runId did not match producer config")

            if action.get("action") == "finish":
                state["finished"].set()
                return

            if action.get("action") == "invalid":
                rejection: BaseException | None = None
                try:
                    await context.api.declare({"output": {"description": 17}})
                except Exception as error:
                    rejection = error
                context.emit(
                    "runtime-manifest-result",
                    {
                        "runId": state["runId"],
                        "action": "invalid",
                        "rejected": rejection is not None,
                        **({"error": _error_info(rejection)} if rejection is not None else {}),
                        "provenance": _provenance(),
                    },
                )
                return

            if action.get("action") == "update":
                variant = action.get("variant", state["variant"])
                version = action.get("version", state["version"] + 1)
                if variant not in ("string", "object"):
                    raise ValueError("update variant must be 'string' or 'object'")
                if isinstance(version, bool) or not isinstance(version, (int, float)) or not math.isfinite(version):
                    raise ValueError("update version must be a finite number")
                receipt = await context.api.declare(_declaration_for({**state, "variant": variant, "version": version}))
                state["variant"] = variant
                state["version"] = version
                context.emit("runtime-manifest-result", {"runId": state["runId"], "action": "update", "receipt": receipt, "provenance": _provenance()})
                return

            raise ValueError(f"unsupported runtime manifest action: {action.get('action')}")
        except Exception as error:
            context.emit(
                "runtime-manifest-result",
                {
                    "runId": state["runId"],
                    "action": action.get("action") if action and isinstance(action.get("action"), str) else "invalid-action",
                    "rejected": True,
                    "error": _error_info(error),
                    "provenance": _provenance(),
                },
            )

    context.on("runtime-manifest-action", handle_action)


async def run(context: Any, input_stream: Any, *args: Any):
    state = getattr(context, "_runtime_manifest_producer_state", None)
    if not isinstance(state, dict) or not isinstance(state.get("finished"), asyncio.Event):
        raise RuntimeError("runtime manifest producer initialize state is unavailable")
    await state["finished"].wait()
    if False:
        yield None
