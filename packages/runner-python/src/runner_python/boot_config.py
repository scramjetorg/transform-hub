"""Boot-config parser for the Python runner.

Mirrors the canonical TypeScript ``BootConfig`` interface defined in
``packages/types/src/runtime-executor.ts``. The runner-python child process is
spawned via ``python3 -m runner_python <bootConfigPath>``; the boot config JSON
file path is read exclusively from ``sys.argv[1]``. No environment variables
are consulted.

This module is synchronous on purpose - boot happens before any async loop
exists.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


class ValidationError(ValueError):
    """Raised when a parsed boot-config payload fails structural validation."""


@dataclass
class BootConfig:
    """Boot configuration handed to runner-python from the outer runner.

    Required fields mirror the canonical ``BootConfig`` TS interface in
    ``packages/types/src/runtime-executor.ts``. Optional fields default to
    empty / ``None`` / ``"INFO"`` so callers do not need to test presence.
    """

    sequencePath: str
    instanceId: str
    instancesServerPort: int
    instancesServerHost: str
    sequenceInfo: dict
    sequenceArgs: list = field(default_factory=list)
    appConfig: dict = field(default_factory=dict)
    instanceName: str | None = None
    logLevel: str = "INFO"
    exposePath: str | None = None
    exposeHost: str | None = None
    pythonPath: str | None = None


def _require_non_empty_string(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or len(value) == 0:
        raise ValidationError(
            f"runner-python: boot config field '{field_name}' must be a non-empty string"
        )
    return value


def _require_positive_int(value: Any, field_name: str) -> int:
    # ``bool`` is a subclass of ``int`` - reject it explicitly.
    if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
        raise ValidationError(
            f"runner-python: boot config field '{field_name}' must be a positive integer"
        )
    return value


def _require_object(value: Any, field_name: str) -> dict:
    if not isinstance(value, dict):
        raise ValidationError(
            f"runner-python: boot config field '{field_name}' must be an object"
        )
    return value


def _validate(payload: Any) -> BootConfig:
    if not isinstance(payload, dict):
        raise ValidationError("runner-python: boot config must be a JSON object")

    sequence_path = _require_non_empty_string(payload.get("sequencePath"), "sequencePath")
    instance_id = _require_non_empty_string(payload.get("instanceId"), "instanceId")
    instances_server_port = _require_positive_int(
        payload.get("instancesServerPort"), "instancesServerPort"
    )
    instances_server_host = _require_non_empty_string(
        payload.get("instancesServerHost"), "instancesServerHost"
    )
    sequence_info = _require_object(payload.get("sequenceInfo"), "sequenceInfo")
    _require_non_empty_string(sequence_info.get("id"), "sequenceInfo.id")

    # Optional fields with explicit type checks when present.
    sequence_args = payload.get("sequenceArgs", [])
    if not isinstance(sequence_args, list):
        raise ValidationError(
            "runner-python: boot config field 'sequenceArgs' must be an array when provided"
        )

    app_config = payload.get("appConfig", {})
    if not isinstance(app_config, dict):
        raise ValidationError(
            "runner-python: boot config field 'appConfig' must be an object when provided"
        )

    instance_name = payload.get("instanceName")
    if instance_name is not None:
        instance_name = _require_non_empty_string(instance_name, "instanceName")

    log_level = payload.get("logLevel", "INFO")
    log_level = _require_non_empty_string(log_level, "logLevel")

    expose_path = payload.get("exposePath")
    if expose_path is not None:
        expose_path = _require_non_empty_string(expose_path, "exposePath")

    expose_host = payload.get("exposeHost")
    if expose_host is not None:
        expose_host = _require_non_empty_string(expose_host, "exposeHost")

    python_path = payload.get("pythonPath")
    if python_path is not None:
        python_path = _require_non_empty_string(python_path, "pythonPath")

    return BootConfig(
        sequencePath=sequence_path,
        instanceId=instance_id,
        instancesServerPort=instances_server_port,
        instancesServerHost=instances_server_host,
        sequenceInfo=sequence_info,
        sequenceArgs=sequence_args,
        appConfig=app_config,
        instanceName=instance_name,
        logLevel=log_level,
        exposePath=expose_path,
        exposeHost=expose_host,
        pythonPath=python_path,
    )


def load_boot_config(argv: list[str]) -> BootConfig:
    """Read, parse, and validate the boot config referenced by ``argv[1]``.

    Mirrors the Node-side flow: missing arg / unreadable file / malformed JSON
    are fatal startup errors (``SystemExit(2)``). Structural validation errors
    raise :class:`ValidationError` so callers can distinguish bad inputs from
    bad invocations.
    """
    if len(argv) < 2 or not isinstance(argv[1], str) or len(argv[1]) == 0:
        print(
            "runner-python: missing boot config path argument (expected argv[1])",
            file=sys.stderr,
        )
        raise SystemExit(2)

    boot_config_path = Path(argv[1])
    try:
        raw = boot_config_path.read_text(encoding="utf-8")
    except OSError as err:
        print(
            f"runner-python: cannot read boot config at {boot_config_path}: {err}",
            file=sys.stderr,
        )
        raise SystemExit(2) from err

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as err:
        print(
            f"runner-python: cannot parse boot config at {boot_config_path}: {err}",
            file=sys.stderr,
        )
        raise SystemExit(2) from err

    return _validate(payload)
