"""Parity tests: the Python ``load_boot_config`` validator must agree with the
Node-side ``validateBootConfig`` (``packages/runner-node/src/boot-config.ts``)
on accept / reject for every shared input.

Each case is fed to both validators. Cases marked ``should_accept=True`` must
be accepted by both; cases marked ``should_accept=False`` must be rejected by
both. Cases that exercise stricter behavior on the Python side (e.g. requiring
``instancesServerPort`` / ``instancesServerHost`` / ``sequenceInfo``) are
intentionally not in the shared parity set because the Node validator treats
them as optional - those are covered by the Python-only unit tests.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest

from runner_python.boot_config import ValidationError, load_boot_config


REPO_ROOT = Path(__file__).resolve().parents[4]
NODE_SHIM = Path(__file__).resolve().parent / "shims" / "boot_config_validator.js"


pytestmark = pytest.mark.skipif(
    shutil.which("node") is None, reason="node executable not available on PATH"
)


VALID_PAYLOAD = {
    "sequencePath": "/abs/path/to/sequence.py",
    "instanceId": "11111111-1111-1111-1111-111111111111",
    "instancesServerPort": 13000,
    "instancesServerHost": "127.0.0.1",
    "sequenceInfo": {"id": "seq-1"},
}


PARITY_CASES: list[tuple[str, dict, bool]] = [
    ("valid_full", VALID_PAYLOAD, True),
    (
        "valid_with_optionals",
        {
            **VALID_PAYLOAD,
            "sequenceArgs": ["a"],
            "appConfig": {"k": "v"},
            "instanceName": "inst",
            "logLevel": "DEBUG",
            "exposePath": "/p",
            "exposeHost": "0.0.0.0",
        },
        True,
    ),
    ("reject_missing_sequencePath", {k: v for k, v in VALID_PAYLOAD.items() if k != "sequencePath"}, False),
    ("reject_empty_sequencePath", {**VALID_PAYLOAD, "sequencePath": ""}, False),
    ("reject_missing_instanceId", {k: v for k, v in VALID_PAYLOAD.items() if k != "instanceId"}, False),
    ("reject_empty_instanceId", {**VALID_PAYLOAD, "instanceId": ""}, False),
    ("reject_port_string", {**VALID_PAYLOAD, "instancesServerPort": "13000"}, False),
    ("reject_port_zero", {**VALID_PAYLOAD, "instancesServerPort": 0}, False),
    ("reject_port_negative", {**VALID_PAYLOAD, "instancesServerPort": -1}, False),
    ("reject_host_empty", {**VALID_PAYLOAD, "instancesServerHost": ""}, False),
    ("reject_host_number", {**VALID_PAYLOAD, "instancesServerHost": 1234}, False),
    ("reject_sequenceInfo_not_object", {**VALID_PAYLOAD, "sequenceInfo": "x"}, False),
    ("reject_sequenceInfo_missing_id", {**VALID_PAYLOAD, "sequenceInfo": {}}, False),
    ("reject_sequenceArgs_not_array", {**VALID_PAYLOAD, "sequenceArgs": {"not": "array"}}, False),
    ("reject_appConfig_not_object", {**VALID_PAYLOAD, "appConfig": "no"}, False),
    ("reject_instanceName_empty", {**VALID_PAYLOAD, "instanceName": ""}, False),
    ("reject_logLevel_empty", {**VALID_PAYLOAD, "logLevel": ""}, False),
    ("reject_exposePath_empty", {**VALID_PAYLOAD, "exposePath": ""}, False),
    ("reject_exposeHost_empty", {**VALID_PAYLOAD, "exposeHost": ""}, False),
]


def _node_accepts(payload: dict) -> bool:
    proc = subprocess.run(
        ["node", str(NODE_SHIM)],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        timeout=60,
    )
    if proc.returncode not in (0, 1):
        raise AssertionError(
            f"node shim crashed (rc={proc.returncode}): {proc.stderr}"
        )
    return proc.returncode == 0


def _python_accepts(tmp_path: Path, payload: dict) -> bool:
    p = tmp_path / "boot.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    try:
        load_boot_config(["runner_python", str(p)])
        return True
    except (ValidationError, SystemExit):
        return False


@pytest.mark.parametrize("name,payload,should_accept", PARITY_CASES, ids=[c[0] for c in PARITY_CASES])
def test_node_python_validator_parity(
    tmp_path: Path, name: str, payload: dict, should_accept: bool
) -> None:
    node_ok = _node_accepts(payload)
    py_ok = _python_accepts(tmp_path, payload)

    assert node_ok == should_accept, f"Node validator disagreed for {name} (expected accept={should_accept})"
    assert py_ok == should_accept, f"Python validator disagreed for {name} (expected accept={should_accept})"
    assert node_ok == py_ok, f"Node/Python disagreement on {name}: node={node_ok}, python={py_ok}"
