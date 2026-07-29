from __future__ import annotations

import logging

from runner_python.__main__ import _configure_logging, _log_sth_runtime_error
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


class _Writer:
    def __init__(self) -> None:
        self.writes: list[bytes] = []

    def write(self, data: bytes) -> None:
        self.writes.append(data)


def test_sequence_logger_is_not_published_to_log_channel_when_disabled() -> None:
    disabled_writer = _Writer()
    disabled_logger = _configure_logging(disabled_writer, "INFO", False)
    disabled_logger.info("not forwarded")
    assert disabled_writer.writes == []

    enabled_writer = _Writer()
    enabled_logger = _configure_logging(enabled_writer, "INFO", True)
    enabled_logger.info("forwarded")
    assert len(enabled_writer.writes) == 1
