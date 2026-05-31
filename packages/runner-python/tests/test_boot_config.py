"""Unit tests for ``runner_python.boot_config``."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from runner_python.boot_config import BootConfig, ValidationError, load_boot_config


VALID_PAYLOAD = {
    "sequencePath": "/abs/path/to/sequence.py",
    "instanceId": "11111111-1111-1111-1111-111111111111",
    "instancesServerPort": 13000,
    "instancesServerHost": "127.0.0.1",
    "sequenceInfo": {"id": "seq-1"},
}


def _write(tmp_path: Path, payload) -> str:
    p = tmp_path / "boot.json"
    if isinstance(payload, str):
        p.write_text(payload, encoding="utf-8")
    else:
        p.write_text(json.dumps(payload), encoding="utf-8")
    return str(p)


def test_returns_dataclass_with_all_required_fields(tmp_path: Path) -> None:
    cfg = load_boot_config(["runner_python", _write(tmp_path, VALID_PAYLOAD)])

    assert isinstance(cfg, BootConfig)
    assert cfg.sequencePath == VALID_PAYLOAD["sequencePath"]
    assert cfg.instanceId == VALID_PAYLOAD["instanceId"]
    assert cfg.instancesServerPort == VALID_PAYLOAD["instancesServerPort"]
    assert cfg.instancesServerHost == VALID_PAYLOAD["instancesServerHost"]
    assert cfg.sequenceInfo == VALID_PAYLOAD["sequenceInfo"]


def test_missing_argv_path_exits_with_code_2() -> None:
    with pytest.raises(SystemExit) as exc:
        load_boot_config(["runner_python"])
    assert exc.value.code == 2


def test_missing_file_exits_with_code_2(tmp_path: Path) -> None:
    with pytest.raises(SystemExit) as exc:
        load_boot_config(["runner_python", str(tmp_path / "does-not-exist.json")])
    assert exc.value.code == 2


def test_malformed_json_exits_with_code_2(tmp_path: Path) -> None:
    with pytest.raises(SystemExit) as exc:
        load_boot_config(["runner_python", _write(tmp_path, "{not json")])
    assert exc.value.code == 2


@pytest.mark.parametrize(
    "missing_field",
    [
        "sequencePath",
        "instanceId",
        "instancesServerPort",
        "instancesServerHost",
        "sequenceInfo",
    ],
)
def test_missing_required_field_raises_validation_error(
    tmp_path: Path, missing_field: str
) -> None:
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != missing_field}
    with pytest.raises(ValidationError):
        load_boot_config(["runner_python", _write(tmp_path, payload)])


def test_optional_fields_default_correctly(tmp_path: Path) -> None:
    cfg = load_boot_config(["runner_python", _write(tmp_path, VALID_PAYLOAD)])

    assert cfg.sequenceArgs == []
    assert cfg.appConfig == {}
    assert cfg.instanceName is None
    assert cfg.logLevel == "INFO"
    assert cfg.exposePath is None
    assert cfg.exposeHost is None
    assert cfg.pythonPath is None


def test_python_path_field_reads_when_present(tmp_path: Path) -> None:
    payload = {**VALID_PAYLOAD, "pythonPath": "/opt/site-packages"}
    cfg = load_boot_config(["runner_python", _write(tmp_path, payload)])

    assert cfg.pythonPath == "/opt/site-packages"


def test_optional_fields_round_trip_when_present(tmp_path: Path) -> None:
    payload = {
        **VALID_PAYLOAD,
        "sequenceArgs": ["a", "b"],
        "appConfig": {"k": "v"},
        "instanceName": "inst-1",
        "logLevel": "DEBUG",
        "exposePath": "/expose",
        "exposeHost": "0.0.0.0",
    }
    cfg = load_boot_config(["runner_python", _write(tmp_path, payload)])

    assert cfg.sequenceArgs == ["a", "b"]
    assert cfg.appConfig == {"k": "v"}
    assert cfg.instanceName == "inst-1"
    assert cfg.logLevel == "DEBUG"
    assert cfg.exposePath == "/expose"
    assert cfg.exposeHost == "0.0.0.0"


def test_sequence_info_missing_id_raises(tmp_path: Path) -> None:
    payload = {**VALID_PAYLOAD, "sequenceInfo": {}}
    with pytest.raises(ValidationError):
        load_boot_config(["runner_python", _write(tmp_path, payload)])


def test_root_must_be_object(tmp_path: Path) -> None:
    with pytest.raises(ValidationError):
        load_boot_config(["runner_python", _write(tmp_path, [1, 2, 3])])


def test_port_must_be_positive_integer(tmp_path: Path) -> None:
    payload = {**VALID_PAYLOAD, "instancesServerPort": "13000"}
    with pytest.raises(ValidationError):
        load_boot_config(["runner_python", _write(tmp_path, payload)])
