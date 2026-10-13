"""Hosted Python consumer for the instance runtime-manifest BDD feature."""

from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Any


def _required_config(context: Any) -> dict[str, Any]:
    config = context.config
    run_id = config.get("runId")
    sequence_id = config.get("producerSequenceId")
    instance_ids = config.get("producerInstanceIds")

    if not isinstance(run_id, str) or not run_id:
        raise ValueError("runtime manifest consumer requires the received runId config")
    if not isinstance(sequence_id, str) or not sequence_id:
        raise ValueError("runtime manifest consumer requires producerSequenceId config")
    if not isinstance(instance_ids, list) or not instance_ids or any(not isinstance(value, str) or not value for value in instance_ids):
        raise ValueError("runtime manifest consumer requires actual producerInstanceIds config")

    return {"runId": run_id, "producerSequenceId": sequence_id, "producerInstanceIds": list(instance_ids)}


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


def _parse_action(payload: Any) -> dict[str, Any]:
    action = json.loads(payload) if isinstance(payload, str) else payload
    if not isinstance(action, dict):
        raise ValueError("runtime manifest action must be a JSON object")
    return action


async def _observe(context: Any, config: dict[str, Any], phase: str) -> None:
    instance_responses = []
    for instance_id in config["producerInstanceIds"]:
        response = await context.hub_client().instance(instance_id).manifest()
        instance_responses.append({"status": response.status, "headers": response.headers, "body": response.body})

    sequence_response = await context.hub_client().sequence(config["producerSequenceId"]).manifest()
    context.emit(
        "runtime-manifest-observed",
        {
            "runId": config["runId"],
            "phase": phase,
            "instanceResponses": instance_responses,
            "sequenceResponse": {
                "status": sequence_response.status,
                "headers": sequence_response.headers,
                "body": sequence_response.body,
            },
            "provenance": _provenance(),
        },
    )


async def run(context: Any, input_stream: Any, *args: Any):
    config = _required_config(context)
    finished = asyncio.Event()

    async def handle_action(payload: Any) -> None:
        try:
            action = _parse_action(payload)
            if action.get("runId") != config["runId"]:
                return
            if action.get("action") == "finish":
                finished.set()
            elif action.get("action") == "refresh":
                await _observe(context, config, "refresh")
        except Exception as error:
            context.logger.error("runtime manifest consumer action failed: %s", error)

    context.on("runtime-manifest-action", handle_action)
    await _observe(context, config, "initial")
    await finished.wait()
    if False:
        yield None
