from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from runner_python.boot_config import Verser2RuntimeConfig
from runner_python.verser2_runtime import create_python_hub_client, create_python_sequence_guest


FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


class StrictVerser2Broker:
    """Fake dependency object that rejects unsupported TLS kwargs like verser2_guest_python."""

    def __init__(self) -> None:
        self.connected = False
        self.closed = False

    async def connect(self) -> None:
        self.connected = True

    async def close(self) -> None:
        self.closed = True


class StrictVerser2Guest:
    """Fake dependency object that rejects unsupported TLS kwargs like verser2_guest_python."""

    def __init__(self) -> None:
        self.closed = False

    async def close(self) -> None:
        self.closed = True


def load_fixture(name: str) -> dict[str, Any]:
    return json.loads((FIXTURES_DIR / name / "fixture.json").read_text(encoding="utf-8"))


def runtime_config(fixture: dict[str, Any]) -> Verser2RuntimeConfig:
    return Verser2RuntimeConfig(**fixture["verser2Runtime"])


def assert_inline_ca_was_materialized(call: dict[str, Any], expected: dict[str, Any]) -> Path:
    for forbidden in expected["forbidden_tls_kwargs"]:
        assert forbidden not in call

    ca_file = Path(call["tls_ca_file"])
    assert ca_file.read_text(encoding="utf-8") == expected["tls_ca_file_contains"]
    return ca_file


@pytest.mark.asyncio
async def test_inline_ca_fixture_reproduces_broker_dependency_contract() -> None:
    fixture = load_fixture("verser2-inline-ca")
    calls: list[dict[str, Any]] = []
    broker = StrictVerser2Broker()

    def broker_factory(**kwargs: Any) -> StrictVerser2Broker:
        if "tls_ca" in kwargs:
            raise TypeError("create_client_ssl_context() got an unexpected keyword argument 'tls_ca'")
        calls.append(kwargs)
        return broker

    hub = await create_python_hub_client(runtime_config(fixture), broker_factory=broker_factory)

    assert hub is not None
    assert broker.connected is True
    ca_file = assert_inline_ca_was_materialized(calls[0], fixture["expected"])

    await hub.close()
    assert broker.closed is True
    assert not ca_file.exists()


@pytest.mark.asyncio
async def test_inline_ca_fixture_reproduces_guest_dependency_contract() -> None:
    fixture = load_fixture("verser2-inline-ca")
    calls: list[dict[str, Any]] = []
    guest = StrictVerser2Guest()

    def guest_factory(**kwargs: Any) -> StrictVerser2Guest:
        if "tls_ca" in kwargs:
            raise TypeError("create_client_ssl_context() got an unexpected keyword argument 'tls_ca'")
        calls.append(kwargs)
        return guest

    created = create_python_sequence_guest(runtime_config(fixture), object(), guest_factory=guest_factory)

    assert created is guest
    ca_file = assert_inline_ca_was_materialized(calls[0], fixture["expected"])

    await guest.close()
    assert guest.closed is True
    assert not ca_file.exists()
