from __future__ import annotations

import logging

from runner_python.__main__ import _log_sth_runtime_error
from runner_python.boot_config import BootConfig


def _boot_config() -> BootConfig:
    return BootConfig(
        sequencePath="/tmp/sequence.py",
        instanceId="instance-1",
        instancesServerPort=9000,
        instancesServerHost="127.0.0.1",
        sequenceInfo={"id": "sequence-1"},
    )


def test_sequence_load_error_log_includes_runtime_context_and_cause(caplog) -> None:
    cause = ModuleNotFoundError("No module named 'missing_dep'")
    exc = RuntimeError("failed to import sequence")
    exc.__cause__ = cause

    with caplog.at_level(logging.ERROR, logger="runner_python"):
        _log_sth_runtime_error("sequence-load", _boot_config(), exc)

    message = caplog.records[-1].getMessage()

    assert "STH runtime error phase=sequence-load runtime=python" in message
    assert "sequenceId=sequence-1" in message
    assert "instanceId=instance-1" in message
    assert "failed to import sequence" in message
    assert "missing_dep" in message


def test_instance_runtime_error_log_includes_runtime_context(caplog) -> None:
    exc = ValueError("invalid params expected object")

    with caplog.at_level(logging.ERROR, logger="runner_python"):
        _log_sth_runtime_error("instance-runtime", _boot_config(), exc)

    message = caplog.records[-1].getMessage()

    assert "STH runtime error phase=instance-runtime runtime=python" in message
    assert "sequenceId=sequence-1" in message
    assert "instanceId=instance-1" in message
    assert "invalid params expected object" in message
